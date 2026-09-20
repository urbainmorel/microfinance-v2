-- Migration 20260911150000_annual_interest_rates.sql
-- Transition intégrale vers la manipulation directe des taux annuels :
-- 1. loan_products.interest_rate et loans.interest_rate stockent le taux nominal ANNUEL en % (ex: 12.000 = 12% / an).
-- 2. Les calculs mensuels (simulate_loan, disburse_loan, TEG) convertissent en taux périodique mensuel via (interest_rate / 12.0) / 100.0.
-- 3. Mise à niveau des produits existants : 1.000% -> 12.000%, 1.250% -> 15.000%.

-- 1. Garde TEG sur les produits de prêt (mise à jour en premier pour utiliser le taux annuel)
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
    new.min_amount, (new.interest_rate / 12.0) / 100.0, new.min_duration_months,
    new.interest_method, v_fees
  );
  if v_cost > 20 then
    raise exception using errcode = '22023', message = 'EFFECTIVE_COST_CAP_EXCEEDED',
      detail = format('effective_annual_cost=%s; cap=20', v_cost);
  end if;
  return new;
end;
$$;

-- 2. Garde TEG sur les demandes de prêt
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
    new.amount, (p.interest_rate / 12.0) / 100.0, new.duration_months, p.interest_method, v_fees
  );
  if v_cost > 20 then
    raise exception using errcode = '22023', message = 'EFFECTIVE_COST_CAP_EXCEEDED',
      detail = format('effective_annual_cost=%s; cap=20', v_cost);
  end if;
  return new;
end;
$$;

-- 3. Mise à jour des produits existants vers les taux annuels
alter table public.loan_products disable trigger trg_guard_loan_product_history;
alter table public.loan_products disable trigger trg_guard_loan_product_cost;

update public.loan_products
set interest_rate = round(interest_rate * 12, 3)
where interest_rate < 5;

alter table public.loan_products enable trigger trg_guard_loan_product_history;
alter table public.loan_products enable trigger trg_guard_loan_product_cost;

-- 4. Simulation de prêt avec conversion annuelle -> mensuelle
create or replace function public.simulate_loan(
  p_product uuid,
  p_amount bigint,
  p_duration int,
  p_start_date date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.loan_products;
  v_total_interest bigint := 0;
  v_total_fees bigint := 0;
  v_fee bigint;
  v_fee_remainder bigint;
  v_guarantee bigint := 0;
  v_mandatory bigint := 0;
  v_total_mandatory bigint := 0;
  v_total_due bigint := 0;
  r record;
  v_rows jsonb := '[]'::jsonb;
begin
  select * into strict p from public.loan_products where id = p_product and is_active;
  if p_amount < p.min_amount or p_amount > p.max_amount then
    raise exception using errcode = '22023', message = 'AMOUNT_OUT_OF_RANGE';
  end if;
  if p_duration < p.min_duration_months or p_duration > p.max_duration_months then
    raise exception using errcode = '22023', message = 'DURATION_OUT_OF_RANGE';
  end if;

  v_total_fees := round(p_amount * coalesce(p.processing_fee_percent, 0) / 100)::bigint
    + coalesce(p.processing_fee_flat, 0)
    + round(p_amount * coalesce(p.management_fee_percent, 0) / 100)::bigint
    + coalesce(p.management_fee_flat, 0)
    + round(p_amount * coalesce(p.insurance_rate, 0) / 100)::bigint;
  v_fee := v_total_fees / p_duration;
  v_fee_remainder := v_total_fees - (v_fee * p_duration);
  v_guarantee := round(p_amount * coalesce(p.guarantee_rate, 0) / 100)::bigint;

  for r in select * from public.amortization_rows(
    p_amount, (p.interest_rate / 12.0) / 100.0, p_duration, p.interest_method
  ) loop
    v_total_interest := v_total_interest + r.due_interest;
    v_mandatory := round(
      (r.due_principal + r.due_interest + v_fee
        + case when r.installment_no = p_duration then v_fee_remainder else 0 end)
      * coalesce(p.mandatory_savings_rate, 0) / 100
    )::bigint;
    v_total_mandatory := v_total_mandatory + v_mandatory;
    v_total_due := v_total_due + r.due_principal + r.due_interest + v_fee
      + case when r.installment_no = p_duration then v_fee_remainder else 0 end
      + v_mandatory;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'installmentNo', r.installment_no,
      'dueDate', (p_start_date + make_interval(months => r.installment_no))::date,
      'principal', r.due_principal,
      'interest', r.due_interest,
      'fees', v_fee + case when r.installment_no = p_duration then v_fee_remainder else 0 end,
      'mandatorySavings', v_mandatory,
      'total', r.due_principal + r.due_interest + v_fee
        + case when r.installment_no = p_duration then v_fee_remainder else 0 end
        + v_mandatory
    ));
  end loop;

  return jsonb_build_object(
    'productId', p.id,
    'productName', p.name,
    'amount', p_amount,
    'durationMonths', p_duration,
    'interestRate', p.interest_rate,
    'interestMethod', p.interest_method,
    'totalInterest', v_total_interest,
    'totalFees', v_total_fees,
    'guaranteeRequired', v_guarantee,
    'mandatorySavingsTotal', v_total_mandatory,
    'totalDue', v_total_due,
    'recoverableAmount', v_guarantee + v_total_mandatory,
    'schedule', v_rows
  );
end;
$$;

-- 5. Décaissement avec conversion annuelle -> mensuelle
create or replace function public.disburse_loan(p_request uuid, p_external_reference text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  r public.loan_requests;
  v_loan uuid;
  v_amount bigint;
  v_interest numeric;
  v_method text;
  v_mandatory_rate numeric;
  v_total_fees bigint;
  v_fee bigint;
  v_fee_remainder bigint;
  v_mandatory bigint;
  a record;
begin
  perform app_private.require_active_staff(array['admin', 'advisor']);
  select * into strict r from public.loan_requests where id = p_request for update;
  if r.status not in ('GUARANTEE_COMPLETE', 'AWAITING_DISBURSEMENT', 'ACCEPTED') then
    raise exception using errcode = 'P0001', message = 'INVALID_STATUS_FOR_DISBURSEMENT';
  end if;
  if not exists(select 1 from public.loan_contracts where request_id = r.id and signed_at is not null) then
    raise exception using errcode = 'P0001', message = 'CONTRACT_SIGNATURE_REQUIRED';
  end if;
  if exists(select 1 from public.loans where client_id = r.client_id and status in ('ACTIVE', 'DEFAULTED')) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_LOAN_EXISTS';
  end if;
  if r.requested_disbursement_method <> 'INTERNAL' and coalesce(trim(p_external_reference), '') = '' then
    raise exception using errcode = '22023', message = 'REFERENCE_REQUIRED';
  end if;
  v_amount := coalesce(r.approved_amount, r.amount);
  v_interest := (r.product_terms ->> 'interestRate')::numeric;
  v_method := r.product_terms ->> 'interestMethod';
  v_mandatory_rate := (r.product_terms ->> 'mandatorySavingsRate')::numeric;
  insert into public.loans (
    request_id, client_id, total_amount, remaining_principal, interest_rate,
    interest_method, start_date, end_date, status
  ) values (
    r.id, r.client_id, v_amount, v_amount, v_interest, v_method, current_date,
    (current_date + make_interval(months => r.duration_months))::date, 'ACTIVE'
  ) returning id into v_loan;
  v_total_fees := round(v_amount * (r.product_terms ->> 'processingFeePercent')::numeric / 100)::bigint
    + (r.product_terms ->> 'processingFeeFlat')::bigint
    + round(v_amount * (r.product_terms ->> 'managementFeePercent')::numeric / 100)::bigint
    + (r.product_terms ->> 'managementFeeFlat')::bigint
    + round(v_amount * (r.product_terms ->> 'insuranceRate')::numeric / 100)::bigint;
  v_fee := v_total_fees / r.duration_months;
  v_fee_remainder := v_total_fees - v_fee * r.duration_months;
  for a in select * from public.amortization_rows(
    v_amount, (v_interest / 12.0) / 100.0, r.duration_months, v_method
  ) loop
    v_mandatory := round((a.due_principal + a.due_interest + v_fee
      + case when a.installment_no = r.duration_months then v_fee_remainder else 0 end)
      * v_mandatory_rate / 100)::bigint;
    insert into public.amortization_schedules (
      loan_id, installment_no, due_date, due_principal, due_interest, due_fees, due_mandatory_savings
    ) values (
      v_loan, a.installment_no, (current_date + make_interval(months => a.installment_no))::date,
      a.due_principal, a.due_interest,
      v_fee + case when a.installment_no = r.duration_months then v_fee_remainder else 0 end,
      v_mandatory
    );
  end loop;
  if r.requested_disbursement_method = 'INTERNAL' then
    perform app_private.credit_wallet(r.client_id, 'disbursed_loan', v_amount);
  end if;
  update public.loan_requests set status = 'DISBURSED',
    disbursement_reference = nullif(trim(p_external_reference), ''),
    disbursed_at = now() where id = r.id;
  return v_loan;
end;
$$;

-- 6. Commentaires explicites
comment on column public.loan_products.interest_rate is 'Taux d’intérêt nominal annuel (en %).';
comment on column public.loans.interest_rate is 'Taux d’intérêt nominal annuel (en %).';

-- 7. Permissions
grant execute on function public.simulate_loan(uuid, bigint, int, date) to authenticated, anon;
grant execute on function public.disburse_loan(uuid, text) to authenticated;
