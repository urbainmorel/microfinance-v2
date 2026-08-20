alter table public.loan_requests
  add column if not exists product_terms jsonb,
  add column if not exists product_terms_version uuid;

create or replace function app_private.loan_product_terms(p public.loan_products)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'productId', p.id, 'name', p.name, 'description', p.description, 'currency', 'XOF',
    'minAmount', p.min_amount, 'maxAmount', p.max_amount,
    'minDurationMonths', p.min_duration_months, 'maxDurationMonths', p.max_duration_months,
    'interestRate', p.interest_rate, 'interestMethod', p.interest_method,
    'processingFeePercent', p.processing_fee_percent, 'processingFeeFlat', p.processing_fee_flat,
    'managementFeePercent', p.management_fee_percent, 'managementFeeFlat', p.management_fee_flat,
    'insuranceRate', p.insurance_rate, 'guaranteeRate', p.guarantee_rate,
    'mandatorySavingsRate', p.mandatory_savings_rate, 'latePenaltyRate', p.late_penalty_rate,
    'effectiveCostCap', 20, 'earlyRepaymentFee', 0
  )
$$;

update public.loan_requests r
set product_terms = app_private.loan_product_terms(p), product_terms_version = gen_random_uuid()
from public.loan_products p where p.id = r.product_id and r.product_terms is null;

alter table public.loan_requests
  alter column product_terms set not null,
  alter column product_terms_version set not null;

create or replace function app_private.snapshot_loan_product_terms()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_product public.loan_products;
begin
  if tg_op = 'UPDATE' then
    if new.product_terms is distinct from old.product_terms
       or new.product_terms_version is distinct from old.product_terms_version
       or new.product_id is distinct from old.product_id then
      raise exception using errcode = '22023', message = 'PRODUCT_TERMS_IMMUTABLE';
    end if;
    return new;
  end if;
  select * into strict v_product from public.loan_products
  where id = new.product_id and is_active;
  new.product_terms := app_private.loan_product_terms(v_product);
  new.product_terms_version := gen_random_uuid();
  return new;
end;
$$;

drop trigger if exists trg_snapshot_loan_product_terms on public.loan_requests;
create trigger trg_snapshot_loan_product_terms before insert or update on public.loan_requests
for each row execute function app_private.snapshot_loan_product_terms();

revoke all on function app_private.loan_product_terms(public.loan_products)
from public, anon, authenticated;
revoke all on function app_private.snapshot_loan_product_terms()
from public, anon, authenticated;

comment on column public.loan_requests.product_terms is
  'Instantané contractuel immuable des taux, frais, garantie et pénalités à la soumission.';
comment on column public.loan_requests.product_terms_version is
  'Identifiant unique de la version de conditions remise au client.';
