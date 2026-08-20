create table public.loan_contracts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.loan_requests(id),
  client_id uuid not null references public.profiles(id),
  contract_number text not null unique,
  terms_version uuid not null,
  language text not null default 'fr' check (language in ('fr', 'en')),
  content jsonb not null,
  content_hash text not null,
  generated_at timestamptz not null default now(),
  signed_at timestamptz,
  signature_method text check (signature_method is null or signature_method = 'PIN'),
  signature_idempotency_key uuid unique,
  signature_correlation_id uuid,
  constraint loan_contract_signature_complete check (
    (signed_at is null and signature_method is null)
    or (signed_at is not null and signature_method = 'PIN')
  )
);

alter table public.loan_contracts enable row level security;
create policy "loan_contract_client_select" on public.loan_contracts
for select using (client_id = auth.uid());
create policy "loan_contract_admin_select" on public.loan_contracts
for select using (public.auth_role() = 'admin');

grant select on table public.loan_contracts to authenticated;
revoke insert, update, delete on table public.loan_contracts from anon, authenticated;

create or replace function app_private.generate_loan_contract()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_amount bigint := coalesce(new.approved_amount, new.amount);
  v_content jsonb;
begin
  if new.status not in ('ACCEPTED', 'GUARANTEE_PENDING', 'GUARANTEE_COMPLETE', 'AWAITING_DISBURSEMENT')
     then return new; end if;
  select * into strict v_profile from public.profiles where id = new.client_id;
  v_content := jsonb_build_object(
    'schemaVersion', 1,
    'contractNumber', 'MF-' || to_char(current_date, 'YYYY') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 12)),
    'borrower', jsonb_build_object(
      'clientId', new.client_id, 'firstname', v_profile.firstname, 'lastname', v_profile.lastname,
      'country', v_profile.country, 'idType', v_profile.id_type, 'idNumber', v_profile.id_number
    ),
    'loan', jsonb_build_object(
      'requestId', new.id, 'principal', v_amount, 'currency', 'XOF',
      'durationMonths', new.duration_months, 'purpose', new.purpose,
      'disbursementMethod', new.requested_disbursement_method
    ),
    'terms', new.product_terms,
    'clauses', jsonb_build_object(
      'constantInstallments', true, 'manualFinancialConfirmation', true,
      'oneLiveLoan', true, 'effectiveCostCapPercent', 20,
      'earlyRepaymentFee', 0, 'guaranteeMayBeMobilized', true,
      'jurisdiction', coalesce(v_profile.country, 'Pays de résidence du client')
    )
  );
  insert into public.loan_contracts (
    request_id, client_id, contract_number, terms_version, content, content_hash
  ) values (
    new.id, new.client_id, v_content ->> 'contractNumber', new.product_terms_version,
    v_content, encode(extensions.digest(v_content::text, 'sha256'), 'hex')
  ) on conflict (request_id) do nothing;
  return new;
end;
$$;

-- An acceptance without guarantee must still wait for the client's signature.
create or replace function app_private.require_contract_before_progress()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('PRE_APPROVED', 'ACCEPTED', 'GUARANTEE_COMPLETE')
     and coalesce(new.approved_amount, new.amount) not between
       (new.product_terms ->> 'minAmount')::bigint and (new.product_terms ->> 'maxAmount')::bigint then
    raise exception using errcode = '22023', message = 'AMOUNT_OUT_OF_SNAPSHOT_RANGE';
  end if;
  if old.status in ('IN_ANALYSIS', 'PRE_APPROVED')
     and new.status in ('ACCEPTED', 'GUARANTEE_COMPLETE') then
    new.guarantee_required := round(
      coalesce(new.approved_amount, new.amount) * (new.product_terms ->> 'guaranteeRate')::numeric / 100
    )::bigint;
  end if;
  if old.status in ('IN_ANALYSIS', 'PRE_APPROVED')
     and new.status = 'GUARANTEE_COMPLETE' then
    new.status := 'ACCEPTED';
  elsif new.status is distinct from old.status
    and new.status in ('GUARANTEE_PENDING', 'GUARANTEE_COMPLETE', 'AWAITING_DISBURSEMENT', 'DISBURSED')
    and not exists (
      select 1 from public.loan_contracts where request_id = new.id and signed_at is not null
    ) then
    raise exception using errcode = 'P0001', message = 'CONTRACT_SIGNATURE_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger trg_loan_contract_guard before update of status on public.loan_requests
for each row execute function app_private.require_contract_before_progress();
create trigger trg_generate_loan_contract after update of status on public.loan_requests
for each row execute function app_private.generate_loan_contract();

update public.loan_requests set status = status
where status in ('ACCEPTED', 'GUARANTEE_PENDING', 'GUARANTEE_COMPLETE', 'AWAITING_DISBURSEMENT');

create or replace function public.sign_loan_contract(
  p_client uuid, p_request uuid, p_idempotency_key uuid, p_correlation_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_contract public.loan_contracts;
begin
  if p_client is null or p_request is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  select * into v_contract from public.loan_contracts
  where request_id = p_request and client_id = p_client for update;
  if not found then raise exception using errcode = 'P0002', message = 'CONTRACT_NOT_FOUND'; end if;
  if v_contract.signed_at is not null then return v_contract.id; end if;
  update public.loan_contracts set signed_at = now(), signature_method = 'PIN',
    signature_idempotency_key = p_idempotency_key,
    signature_correlation_id = coalesce(p_correlation_id, gen_random_uuid())
  where id = v_contract.id;
  update public.loan_requests set status = 'GUARANTEE_COMPLETE'
  where id = p_request and status = 'ACCEPTED' and coalesce(guarantee_required, 0) = 0;
  return v_contract.id;
exception when unique_violation then
  select id into v_contract.id from public.loan_contracts
  where client_id = p_client and signature_idempotency_key = p_idempotency_key;
  return v_contract.id;
end;
$$;

revoke all on function public.sign_loan_contract(uuid, uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.sign_loan_contract(uuid, uuid, uuid, uuid) to service_role;
revoke all on function app_private.generate_loan_contract() from public, anon, authenticated;
revoke all on function app_private.require_contract_before_progress() from public, anon, authenticated;

create or replace function public.get_active_loan_status()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare r public.loan_requests; l public.loans; v_has_payment boolean; v_signed boolean;
begin
  select * into l from public.loans where client_id = auth.uid() and status in ('ACTIVE', 'DEFAULTED')
  order by created_at desc limit 1;
  if found then
    select exists(select 1 from public.repayment_requests where loan_id = l.id and status = 'CONFIRMED') into v_has_payment;
    return jsonb_build_object('displayState', case when v_has_payment then 8 else 7 end,
      'loanId', l.id, 'status', l.status, 'remainingPrincipal', l.remaining_principal,
      'totalAmount', l.total_amount);
  end if;
  select * into r from public.loan_requests where client_id = auth.uid()
    and status not in ('DRAFT', 'DISBURSED', 'CANCELLED') order by created_at desc limit 1;
  if found then
    select exists(select 1 from public.loan_contracts where request_id = r.id and signed_at is not null) into v_signed;
    return jsonb_build_object('displayState', case
      when r.status in ('SUBMITTED', 'IN_ANALYSIS', 'PRE_APPROVED') then 2
      when r.status = 'INFO_REQUESTED' then 3 when r.status = 'ACCEPTED' then 4
      when r.status = 'GUARANTEE_PENDING' then 5
      when r.status in ('GUARANTEE_COMPLETE', 'AWAITING_DISBURSEMENT') then 6
      when r.status = 'REJECTED' then 10 else 1 end,
      'requestId', r.id, 'status', r.status, 'contractSigned', v_signed,
      'guaranteeRequired', r.guarantee_required, 'guaranteeBlocked', r.guarantee_blocked_partial);
  end if;
  select * into l from public.loans where client_id = auth.uid() and status = 'CLOSED'
  order by created_at desc limit 1;
  if found then return jsonb_build_object('displayState', 9, 'loanId', l.id, 'status', l.status); end if;
  return jsonb_build_object('displayState', 1);
end;
$$;

revoke all on function public.get_active_loan_status() from public, anon;
grant execute on function public.get_active_loan_status() to authenticated;

create or replace function public.disburse_loan(
  p_request uuid, p_external_reference text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  r public.loan_requests; a record; v_loan uuid; v_amount bigint;
  v_interest numeric; v_method text; v_total_fees bigint; v_fee bigint;
  v_fee_remainder bigint; v_mandatory bigint; v_mandatory_rate numeric;
begin
  perform app_private.require_active_staff(array['agent_caisse', 'validator', 'admin', 'super_admin']);
  select * into r from public.loan_requests where id = p_request for update;
  if not found or r.status not in ('GUARANTEE_COMPLETE', 'AWAITING_DISBURSEMENT') then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
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
    v_amount, v_interest / 100, r.duration_months, v_method
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
    disbursed_by = auth.uid(), disbursed_at = now(), updated_at = now()
  where id = r.id;
  return v_loan;
exception when unique_violation then
  select id into v_loan from public.loans where request_id = p_request;
  if v_loan is null then raise; end if;
  return v_loan;
end;
$$;
