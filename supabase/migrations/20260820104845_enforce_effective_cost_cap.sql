-- Taux de rendement interne annualisé des flux obligatoires non récupérables.
-- L'épargne obligatoire et la garantie, récupérables, sont volontairement exclues.
create or replace function public.effective_annual_cost(
  p_principal bigint,
  p_monthly_rate numeric,
  p_duration integer,
  p_method text,
  p_total_fees bigint
)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_low numeric := 0;
  v_high numeric := 1;
  v_mid numeric;
  v_npv numeric;
  v_row record;
  v_fee bigint;
  v_remainder bigint;
  v_payment bigint;
  v_iteration integer;
begin
  if p_principal <= 0 or p_duration <= 0 or p_monthly_rate < 0 or p_total_fees < 0 then
    raise exception using errcode = '22023', message = 'INVALID_COST_INPUT';
  end if;
  v_fee := p_total_fees / p_duration;
  v_remainder := p_total_fees - v_fee * p_duration;

  for v_iteration in 1..80 loop
    v_mid := (v_low + v_high) / 2;
    v_npv := -p_principal;
    for v_row in select * from public.amortization_rows(
      p_principal, p_monthly_rate, p_duration, p_method
    ) loop
      v_payment := v_row.due_principal + v_row.due_interest + v_fee
        + case when v_row.installment_no = p_duration then v_remainder else 0 end;
      v_npv := v_npv + v_payment / power(1 + v_mid, v_row.installment_no);
    end loop;
    if v_npv > 0 then v_low := v_mid; else v_high := v_mid; end if;
  end loop;

  return round((power(1 + v_high, 12) - 1) * 100, 6);
end;
$$;

create or replace function app_private.loan_product_total_fees(
  p_amount bigint,
  p_processing_percent numeric,
  p_processing_flat bigint,
  p_management_percent numeric,
  p_management_flat bigint,
  p_insurance_rate numeric
)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select round(p_amount * coalesce(p_processing_percent, 0) / 100)::bigint
    + coalesce(p_processing_flat, 0)
    + round(p_amount * coalesce(p_management_percent, 0) / 100)::bigint
    + coalesce(p_management_flat, 0)
    + round(p_amount * coalesce(p_insurance_rate, 0) / 100)::bigint;
$$;

create or replace function app_private.guard_loan_product_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cost numeric;
  v_fees bigint;
begin
  if new.interest_method <> 'CONSTANT_INSTALLMENT' then
    raise exception using errcode = '22023', message = 'INTEREST_METHOD_NOT_ALLOWED';
  end if;
  v_fees := app_private.loan_product_total_fees(
    new.min_amount, new.processing_fee_percent, new.processing_fee_flat,
    new.management_fee_percent, new.management_fee_flat, new.insurance_rate
  );
  v_cost := public.effective_annual_cost(
    new.min_amount, new.interest_rate / 100, new.min_duration_months,
    new.interest_method, v_fees
  );
  if v_cost > 20 then
    raise exception using errcode = '22023', message = 'EFFECTIVE_COST_CAP_EXCEEDED',
      detail = format('effective_annual_cost=%s; cap=20', v_cost);
  end if;
  return new;
end;
$$;

create or replace function app_private.guard_loan_request_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.loan_products;
  v_cost numeric;
  v_fees bigint;
begin
  select * into strict p from public.loan_products where id = new.product_id and is_active;
  v_fees := app_private.loan_product_total_fees(
    new.amount, p.processing_fee_percent, p.processing_fee_flat,
    p.management_fee_percent, p.management_fee_flat, p.insurance_rate
  );
  v_cost := public.effective_annual_cost(
    new.amount, p.interest_rate / 100, new.duration_months, p.interest_method, v_fees
  );
  if v_cost > 20 then
    raise exception using errcode = '22023', message = 'EFFECTIVE_COST_CAP_EXCEEDED',
      detail = format('effective_annual_cost=%s; cap=20', v_cost);
  end if;
  return new;
end;
$$;

-- La V1 validée utilise exclusivement des mensualités constantes.
update public.loan_products set interest_method = 'CONSTANT_INSTALLMENT'
where interest_method <> 'CONSTANT_INSTALLMENT';

-- Un produit historique hors plafond est conservé pour audit mais désactivé.
update public.loan_products p
set is_active = false
where p.is_active and public.effective_annual_cost(
  p.min_amount,
  p.interest_rate / 100,
  p.min_duration_months,
  p.interest_method,
  app_private.loan_product_total_fees(
    p.min_amount, p.processing_fee_percent, p.processing_fee_flat,
    p.management_fee_percent, p.management_fee_flat, p.insurance_rate
  )
) > 20;

alter table public.loan_products drop constraint if exists loan_products_interest_method_check;
alter table public.loan_products drop constraint if exists loan_products_interest_method_v1;
alter table public.loan_products
  add constraint loan_products_interest_method_v1 check (interest_method = 'CONSTANT_INSTALLMENT');

drop trigger if exists trg_guard_loan_product_cost on public.loan_products;
create trigger trg_guard_loan_product_cost
before insert or update on public.loan_products
for each row execute function app_private.guard_loan_product_cost();

drop trigger if exists trg_guard_loan_request_cost on public.loan_requests;
create trigger trg_guard_loan_request_cost
before insert or update of amount, duration_months, product_id on public.loan_requests
for each row execute function app_private.guard_loan_request_cost();

revoke all on function public.effective_annual_cost(bigint, numeric, integer, text, bigint)
from public, anon;
grant execute on function public.effective_annual_cost(bigint, numeric, integer, text, bigint)
to authenticated;
revoke all on function app_private.loan_product_total_fees(bigint, numeric, bigint, numeric, bigint, numeric)
from public, anon, authenticated;
revoke all on function app_private.guard_loan_product_cost() from public, anon, authenticated;
revoke all on function app_private.guard_loan_request_cost() from public, anon, authenticated;
