-- MVP wave 2/3: loan lifecycle, guarantees, disbursement and repayments.

alter table public.loan_requests add column if not exists disbursement_reference text;
alter table public.loan_requests add column if not exists disbursed_by uuid references public.profiles(id);
alter table public.loan_requests add column if not exists disbursed_at timestamptz;
alter table public.amortization_schedules add column if not exists paid_penalty bigint not null default 0;
alter table public.amortization_schedules add column if not exists penalty_last_accrued_on date;

alter table public.loan_products
  alter column min_amount set not null,
  alter column max_amount set not null,
  alter column min_duration_months set not null,
  alter column max_duration_months set not null,
  alter column processing_fee_percent set not null,
  alter column processing_fee_flat set not null,
  alter column management_fee_percent set not null,
  alter column management_fee_flat set not null,
  alter column insurance_rate set not null,
  alter column guarantee_rate set not null,
  alter column mandatory_savings_rate set not null,
  alter column late_penalty_rate set not null,
  alter column is_active set not null;
alter table public.loan_products
  add constraint loan_products_positive_amounts check (min_amount > 0 and max_amount >= min_amount),
  add constraint loan_products_valid_durations check (
    min_duration_months between 1 and 600
    and max_duration_months between min_duration_months and 600
  ),
  add constraint loan_products_valid_rates check (
    interest_rate between 0 and 100
    and processing_fee_percent between 0 and 100
    and management_fee_percent between 0 and 100
    and insurance_rate between 0 and 100
    and guarantee_rate between 0 and 100
    and mandatory_savings_rate between 0 and 100
    and late_penalty_rate between 0 and 100
  ),
  add constraint loan_products_nonnegative_flat_fees check (
    processing_fee_flat >= 0 and management_fee_flat >= 0
  );

drop index if exists public.one_active_loan_per_client;
create unique index one_live_loan_per_client
  on public.loans (client_id) where status in ('ACTIVE', 'DEFAULTED');

create table if not exists public.loan_request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.loan_requests(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  object_path text not null,
  created_at timestamptz not null default now(),
  unique (request_id, object_path)
);

alter table public.loan_request_documents enable row level security;
create policy "loan_docs_owner_read" on public.loan_request_documents
for select to authenticated using ((select auth.uid()) = client_id);
create policy "loan_docs_staff_read" on public.loan_request_documents
for select to authenticated using (
  public.auth_role() in ('agent_credit', 'validator', 'admin', 'super_admin', 'auditor')
);

grant select on public.loan_request_documents to authenticated;
revoke insert, update, delete on public.loan_request_documents from authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('loan-documents', 'loan-documents', false, 10485760,
    array['image/jpeg', 'image/png', 'application/pdf']),
  ('repayment-proofs', 'repayment-proofs', false, 10485760,
    array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "loan_documents_owner_insert" on storage.objects;
create policy "loan_documents_owner_insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'loan-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "loan_documents_read" on storage.objects;
create policy "loan_documents_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'loan-documents' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.auth_role() in ('agent_credit', 'validator', 'admin', 'super_admin', 'auditor')
  )
);

drop policy if exists "repayment_proofs_owner_insert" on storage.objects;
create policy "repayment_proofs_owner_insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'repayment-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "repayment_proofs_owner_update" on storage.objects;
drop policy if exists "repayment_proofs_owner_delete" on storage.objects;

drop policy if exists "repayment_proofs_read" on storage.objects;
create policy "repayment_proofs_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'repayment-proofs' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.auth_role() in ('agent_caisse', 'admin', 'super_admin', 'auditor')
  )
);

create or replace function public.simulate_loan(
  p_product uuid,
  p_amount bigint,
  p_duration int,
  p_start_date date default current_date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  p public.loan_products;
  r record;
  v_total_fees bigint;
  v_fee bigint;
  v_fee_remainder bigint;
  v_mandatory bigint;
  v_guarantee bigint;
  v_total_interest bigint := 0;
  v_total_mandatory bigint := 0;
  v_total_due bigint := 0;
  v_rows jsonb := '[]'::jsonb;
begin
  select * into p from public.loan_products where id = p_product and is_active;
  if not found then raise exception using errcode = 'P0002', message = 'PRODUCT_NOT_FOUND'; end if;
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
    p_amount, p.interest_rate / 100, p_duration, p.interest_method
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

create or replace function public.create_loan_request(
  p_client uuid,
  p_product uuid,
  p_amount bigint,
  p_duration int,
  p_purpose text,
  p_monthly_income bigint,
  p_disbursement_method text,
  p_documents jsonb,
  p_idempotency_key uuid,
  p_correlation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_product public.loan_products;
  v_path text;
begin
  if p_client is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  if not exists (select 1 from public.profiles where id = p_client and kyc_status = 'COMPLETED' and is_active) then
    raise exception using errcode = '42501', message = 'KYC_REQUIRED';
  end if;
  select * into v_product from public.loan_products where id = p_product and is_active;
  if not found then raise exception using errcode = 'P0002', message = 'PRODUCT_NOT_FOUND'; end if;
  if p_amount < v_product.min_amount or p_amount > v_product.max_amount then
    raise exception using errcode = '22023', message = 'AMOUNT_OUT_OF_RANGE';
  end if;
  if p_duration < v_product.min_duration_months or p_duration > v_product.max_duration_months then
    raise exception using errcode = '22023', message = 'DURATION_OUT_OF_RANGE';
  end if;
  if p_disbursement_method not in ('INTERNAL', 'MOBILE_MONEY', 'BANK_TRANSFER') then
    raise exception using errcode = '22023', message = 'INVALID_DISBURSEMENT_METHOD';
  end if;
  if coalesce(trim(p_purpose), '') = '' then
    raise exception using errcode = '22023', message = 'PURPOSE_REQUIRED';
  end if;

  select id into v_id from public.loan_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  if found then return v_id; end if;

  insert into public.loan_requests (
    client_id, product_id, amount, duration_months, purpose,
    monthly_income_estimate, requested_disbursement_method, status,
    idempotency_key, correlation_id
  ) values (
    p_client, p_product, p_amount, p_duration, trim(p_purpose),
    p_monthly_income, p_disbursement_method, 'SUBMITTED',
    p_idempotency_key, coalesce(p_correlation_id, gen_random_uuid())
  ) returning id into v_id;

  if p_documents is not null and jsonb_typeof(p_documents) = 'array' then
    for v_path in select jsonb_array_elements_text(p_documents) loop
      if split_part(v_path, '/', 1) <> p_client::text then
        raise exception using errcode = '22023', message = 'INVALID_DOCUMENT_PATH';
      end if;
      insert into public.loan_request_documents (request_id, client_id, object_path)
      values (v_id, p_client, v_path);
    end loop;
  end if;
  return v_id;
exception when unique_violation then
  select id into v_id from public.loan_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  if v_id is null then raise; end if;
  return v_id;
end;
$$;

create or replace function public.transition_loan_request(
  p_request uuid,
  p_action text,
  p_approved_amount bigint default null,
  p_comment text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.loan_requests;
  p public.loan_products;
  v_role text;
  v_next public.loan_status_enum;
  v_amount bigint;
  v_guarantee bigint;
begin
  v_role := app_private.require_active_staff(
    array['agent_credit', 'validator', 'admin', 'super_admin']
  );
  select * into r from public.loan_requests where id = p_request for update;
  if not found then raise exception using errcode = 'P0002', message = 'REQUEST_NOT_FOUND'; end if;
  select * into p from public.loan_products where id = r.product_id;

  if p_action = 'ANALYZE' and v_role in ('agent_credit', 'admin', 'super_admin') and r.status = 'SUBMITTED' then
    v_next := 'IN_ANALYSIS';
  elsif p_action = 'REQUEST_INFO' and v_role in ('agent_credit', 'validator', 'admin', 'super_admin')
    and r.status in ('SUBMITTED', 'IN_ANALYSIS', 'PRE_APPROVED') then
    if coalesce(trim(p_comment), '') = '' then raise exception using errcode = '22023', message = 'COMMENT_REQUIRED'; end if;
    v_next := 'INFO_REQUESTED';
  elsif p_action in ('PRE_APPROVE', 'SEND_TO_VALIDATOR') and v_role in ('agent_credit', 'admin', 'super_admin')
    and r.status in ('IN_ANALYSIS', 'INFO_REQUESTED') then
    v_amount := coalesce(p_approved_amount, r.amount);
    if v_amount < p.min_amount or v_amount > p.max_amount then
      raise exception using errcode = '22023', message = 'AMOUNT_OUT_OF_RANGE';
    end if;
    v_next := 'PRE_APPROVED';
  elsif p_action = 'ACCEPT' and v_role in ('validator', 'admin', 'super_admin')
    and r.status in ('PRE_APPROVED', 'IN_ANALYSIS') then
    if exists (
      select 1 from public.loans
      where client_id = r.client_id and status in ('ACTIVE', 'DEFAULTED')
    ) then
      raise exception using errcode = 'P0001', message = 'ACTIVE_LOAN_EXISTS';
    end if;
    v_amount := coalesce(p_approved_amount, r.approved_amount, r.amount);
    if v_amount < p.min_amount or v_amount > p.max_amount then
      raise exception using errcode = '22023', message = 'AMOUNT_OUT_OF_RANGE';
    end if;
    v_guarantee := round(v_amount * coalesce(p.guarantee_rate, 0) / 100)::bigint;
    v_next := case when v_guarantee = 0 then 'GUARANTEE_COMPLETE' else 'ACCEPTED' end;
  elsif p_action = 'REJECT' and v_role in ('agent_credit', 'validator', 'admin', 'super_admin')
    and r.status in ('SUBMITTED', 'IN_ANALYSIS', 'INFO_REQUESTED', 'PRE_APPROVED') then
    if coalesce(trim(p_comment), '') = '' then raise exception using errcode = '22023', message = 'COMMENT_REQUIRED'; end if;
    v_next := 'REJECTED';
  else
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
  end if;

  update public.loan_requests set
    status = v_next,
    approved_amount = case when p_action in ('PRE_APPROVE', 'SEND_TO_VALIDATOR', 'ACCEPT') then v_amount else approved_amount end,
    guarantee_required = case when p_action = 'ACCEPT' then v_guarantee else guarantee_required end,
    admin_comment = case when p_action <> 'REJECT' then nullif(trim(p_comment), '') else admin_comment end,
    rejected_reason = case when p_action = 'REJECT' then trim(p_comment) else null end,
    updated_at = now()
  where id = p_request;
  return v_next::text;
end;
$$;

create or replace function app_private.check_guarantee_completion(p_client uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.loan_requests;
  v_blocked bigint;
begin
  select * into r from public.loan_requests
  where client_id = p_client and status in ('ACCEPTED', 'GUARANTEE_PENDING')
  order by created_at desc limit 1 for update;
  if not found then return; end if;
  if exists (
    select 1 from public.loans
    where client_id = p_client and status in ('ACTIVE', 'DEFAULTED')
  ) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_LOAN_EXISTS';
  end if;
  select blocked_guarantee into v_blocked from public.wallets where client_id = p_client for update;
  update public.loan_requests set
    guarantee_blocked_partial = least(coalesce(r.guarantee_required, 0), coalesce(v_blocked, 0)),
    status = case when coalesce(v_blocked, 0) >= coalesce(r.guarantee_required, 0)
      then 'GUARANTEE_COMPLETE'::public.loan_status_enum else 'GUARANTEE_PENDING'::public.loan_status_enum end,
    updated_at = now()
  where id = r.id;
end;
$$;

create or replace function public.process_guarantee_blocking(
  p_client uuid,
  p_request uuid,
  p_idempotency_key uuid,
  p_correlation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.loan_requests;
  v_remaining bigint;
  v_move bigint;
  v_available_free bigint;
  v_existing uuid;
begin
  if p_client is null or p_request is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  insert into app_private.client_command_receipts (
    client_id, action, idempotency_key, target_id, result_status, correlation_id
  ) values (
    p_client, 'guarantee.block', p_idempotency_key, p_request,
    'GUARANTEE_PENDING', p_correlation_id
  ) on conflict (client_id, action, idempotency_key) do nothing;
  if not found then
    select target_id into v_existing
    from app_private.client_command_receipts
    where client_id = p_client and action = 'guarantee.block'
      and idempotency_key = p_idempotency_key;
    if v_existing <> p_request then
      raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED';
    end if;
    return v_existing;
  end if;
  if exists (
    select 1 from public.loans
    where client_id = p_client and status in ('ACTIVE', 'DEFAULTED')
  ) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_LOAN_EXISTS';
  end if;
  select * into r from public.loan_requests
  where id = p_request and client_id = p_client and status in ('ACCEPTED', 'GUARANTEE_PENDING')
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION'; end if;
  v_remaining := greatest(coalesce(r.guarantee_required, 0) - coalesce(r.guarantee_blocked_partial, 0), 0);
  if v_remaining = 0 then
    update public.loan_requests set status = 'GUARANTEE_COMPLETE', updated_at = now() where id = r.id;
    return r.id;
  end if;

  select greatest(free_savings - greatest(reserved_amount - disbursed_loan, 0), 0)
  into v_available_free
  from public.wallets where client_id = p_client for update;
  v_move := least(coalesce(v_available_free, 0), v_remaining);
  if v_move > 0 then
    update public.wallets set
      free_savings = free_savings - v_move,
      blocked_guarantee = blocked_guarantee + v_move,
      updated_at = now()
    where client_id = p_client;
  end if;
  update public.loan_requests set
    guarantee_blocked_partial = guarantee_blocked_partial + v_move,
    status = case when guarantee_blocked_partial + v_move >= guarantee_required
      then 'GUARANTEE_COMPLETE'::public.loan_status_enum else 'GUARANTEE_PENDING'::public.loan_status_enum end,
    correlation_id = coalesce(p_correlation_id, correlation_id),
    updated_at = now()
  where id = r.id;
  return r.id;
end;
$$;

-- Replace deposit confirmation now that guarantee and early-repayment helpers exist.
create or replace function public.confirm_deposit(
  p_request uuid,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.deposit_requests;
  v_actor uuid := auth.uid();
begin
  perform app_private.require_active_staff(array['agent_caisse', 'admin', 'super_admin']);
  if p_action not in ('CONFIRM', 'REJECT') then raise exception using errcode = '22023', message = 'INVALID_ACTION'; end if;
  if p_action = 'REJECT' and coalesce(trim(p_reason), '') = '' then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;
  update public.deposit_requests set
    status = case when p_action = 'CONFIRM' then 'CONFIRMED' else 'REJECTED' end,
    confirmed_by = v_actor,
    confirmed_at = case when p_action = 'CONFIRM' then now() else null end,
    rejected_reason = case when p_action = 'REJECT' then trim(p_reason) else null end
  where id = p_request and status = 'PENDING'
  returning * into r;
  if not found then raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED'; end if;

  if p_action = 'CONFIRM' then
    if r.motif = 'FREE_SAVINGS' then
      perform app_private.credit_wallet(r.client_id, 'free_savings', r.amount);
    elsif r.motif = 'GUARANTEE' then
      perform app_private.credit_wallet(r.client_id, 'blocked_guarantee', r.amount);
      perform app_private.check_guarantee_completion(r.client_id);
    else
      perform app_private.apply_repayment(r.client_id, r.amount, r.id);
    end if;
  end if;
end;
$$;

create or replace function public.disburse_loan(
  p_request uuid,
  p_external_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.loan_requests;
  p public.loan_products;
  a record;
  v_loan uuid;
  v_amount bigint;
  v_total_fees bigint;
  v_fee bigint;
  v_fee_remainder bigint;
  v_mandatory bigint;
begin
  perform app_private.require_active_staff(array['agent_caisse', 'validator', 'admin', 'super_admin']);
  select * into r from public.loan_requests where id = p_request for update;
  if not found or r.status not in ('GUARANTEE_COMPLETE', 'AWAITING_DISBURSEMENT') then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
  end if;
  if exists (
    select 1 from public.loans
    where client_id = r.client_id and status in ('ACTIVE', 'DEFAULTED')
  ) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_LOAN_EXISTS';
  end if;
  if r.requested_disbursement_method <> 'INTERNAL' and coalesce(trim(p_external_reference), '') = '' then
    raise exception using errcode = '22023', message = 'REFERENCE_REQUIRED';
  end if;
  select * into p from public.loan_products where id = r.product_id;
  v_amount := coalesce(r.approved_amount, r.amount);

  insert into public.loans (
    request_id, client_id, total_amount, remaining_principal, interest_rate,
    interest_method, start_date, end_date, status
  ) values (
    r.id, r.client_id, v_amount, v_amount, p.interest_rate,
    p.interest_method, current_date,
    (current_date + make_interval(months => r.duration_months))::date, 'ACTIVE'
  ) returning id into v_loan;

  v_total_fees := round(v_amount * coalesce(p.processing_fee_percent, 0) / 100)::bigint
    + coalesce(p.processing_fee_flat, 0)
    + round(v_amount * coalesce(p.management_fee_percent, 0) / 100)::bigint
    + coalesce(p.management_fee_flat, 0)
    + round(v_amount * coalesce(p.insurance_rate, 0) / 100)::bigint;
  v_fee := v_total_fees / r.duration_months;
  v_fee_remainder := v_total_fees - v_fee * r.duration_months;

  for a in select * from public.amortization_rows(
    v_amount, p.interest_rate / 100, r.duration_months, p.interest_method
  ) loop
    v_mandatory := round(
      (a.due_principal + a.due_interest + v_fee
        + case when a.installment_no = r.duration_months then v_fee_remainder else 0 end)
      * coalesce(p.mandatory_savings_rate, 0) / 100
    )::bigint;
    insert into public.amortization_schedules (
      loan_id, installment_no, due_date, due_principal, due_interest,
      due_fees, due_mandatory_savings
    ) values (
      v_loan, a.installment_no,
      (current_date + make_interval(months => a.installment_no))::date,
      a.due_principal, a.due_interest,
      v_fee + case when a.installment_no = r.duration_months then v_fee_remainder else 0 end,
      v_mandatory
    );
  end loop;

  if r.requested_disbursement_method = 'INTERNAL' then
    perform app_private.credit_wallet(r.client_id, 'disbursed_loan', v_amount);
  end if;
  update public.loan_requests set
    status = 'DISBURSED', disbursement_reference = nullif(trim(p_external_reference), ''),
    disbursed_by = auth.uid(), disbursed_at = now(), updated_at = now()
  where id = r.id;
  return v_loan;
exception when unique_violation then
  select id into v_loan from public.loans where request_id = p_request;
  if v_loan is null then raise; end if;
  return v_loan;
end;
$$;

create or replace function public.create_repayment_request(
  p_client uuid,
  p_loan uuid,
  p_amount bigint,
  p_payment_method text,
  p_reference text,
  p_proof_path text,
  p_idempotency_key uuid,
  p_correlation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_client is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  select id into v_id from public.repayment_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  if found then return v_id; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  if p_payment_method not in ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER') then
    raise exception using errcode = '22023', message = 'INVALID_PAYMENT_METHOD';
  end if;
  if split_part(coalesce(p_proof_path, ''), '/', 1) <> p_client::text then
    raise exception using errcode = '22023', message = 'INVALID_PROOF_PATH';
  end if;
  if not exists (
    select 1 from public.loans
    where id = p_loan and client_id = p_client and status in ('ACTIVE', 'DEFAULTED')
  ) then
    raise exception using errcode = 'P0002', message = 'ACTIVE_LOAN_NOT_FOUND';
  end if;
  insert into public.repayment_requests (
    loan_id, client_id, amount, payment_method, reference, proof_url,
    idempotency_key, correlation_id
  ) values (
    p_loan, p_client, p_amount, p_payment_method, nullif(trim(p_reference), ''),
    p_proof_path, p_idempotency_key, coalesce(p_correlation_id, gen_random_uuid())
  ) returning id into v_id;
  return v_id;
exception when unique_violation then
  select id into v_id from public.repayment_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  return v_id;
end;
$$;

create or replace function app_private.apply_repayment(
  p_client uuid,
  p_amount bigint,
  p_request uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loan public.loans;
  s record;
  v_remaining bigint := p_amount;
  v_outstanding bigint;
  v_apply bigint;
  v_principal_paid bigint := 0;
  v_mandatory_paid bigint := 0;
begin
  select * into v_loan from public.loans
  where client_id = p_client and status in ('ACTIVE', 'DEFAULTED')
  order by created_at desc limit 1 for update;
  if not found then raise exception using errcode = 'P0002', message = 'ACTIVE_LOAN_NOT_FOUND'; end if;

  select coalesce(sum(
    greatest(penalty_accrued - paid_penalty, 0)
    + greatest(due_interest - paid_interest, 0)
    + greatest(due_fees - paid_fees, 0)
    + greatest(due_principal - paid_principal, 0)
    + greatest(due_mandatory_savings - paid_mandatory_savings, 0)
  ), 0)::bigint into v_outstanding
  from public.amortization_schedules where loan_id = v_loan.id;
  if p_amount <= 0 or p_amount > v_outstanding then
    raise exception using errcode = '22023', message = 'OVERPAYMENT';
  end if;

  for s in select * from public.amortization_schedules
    where loan_id = v_loan.id order by installment_no for update
  loop
    exit when v_remaining = 0;

    v_apply := least(v_remaining, greatest(s.penalty_accrued - s.paid_penalty, 0));
    if v_apply > 0 then
      update public.amortization_schedules set paid_penalty = paid_penalty + v_apply where id = s.id;
      v_remaining := v_remaining - v_apply;
    end if;

    v_apply := least(v_remaining, greatest(s.due_interest - s.paid_interest, 0));
    if v_apply > 0 then
      update public.amortization_schedules set paid_interest = paid_interest + v_apply where id = s.id;
      v_remaining := v_remaining - v_apply;
    end if;

    v_apply := least(v_remaining, greatest(s.due_fees - s.paid_fees, 0));
    if v_apply > 0 then
      update public.amortization_schedules set paid_fees = paid_fees + v_apply where id = s.id;
      v_remaining := v_remaining - v_apply;
    end if;

    v_apply := least(v_remaining, greatest(s.due_principal - s.paid_principal, 0));
    if v_apply > 0 then
      update public.amortization_schedules set paid_principal = paid_principal + v_apply where id = s.id;
      v_principal_paid := v_principal_paid + v_apply;
      v_remaining := v_remaining - v_apply;
    end if;

    v_apply := least(v_remaining, greatest(s.due_mandatory_savings - s.paid_mandatory_savings, 0));
    if v_apply > 0 then
      update public.amortization_schedules
      set paid_mandatory_savings = paid_mandatory_savings + v_apply where id = s.id;
      v_mandatory_paid := v_mandatory_paid + v_apply;
      v_remaining := v_remaining - v_apply;
    end if;

    update public.amortization_schedules set status = case
      when paid_penalty >= penalty_accrued and paid_interest >= due_interest
        and paid_fees >= due_fees and paid_principal >= due_principal
        and paid_mandatory_savings >= due_mandatory_savings then 'PAID'
      when paid_penalty + paid_interest + paid_fees + paid_principal + paid_mandatory_savings > 0 then 'PARTIAL'
      when due_date < current_date then 'LATE'
      else 'PENDING' end,
      updated_at = now()
    where id = s.id;
  end loop;

  if v_remaining <> 0 then raise exception using errcode = '22023', message = 'OVERPAYMENT'; end if;
  if v_mandatory_paid > 0 then
    perform app_private.credit_wallet(p_client, 'mandatory_savings', v_mandatory_paid);
  end if;
  update public.loans set remaining_principal = remaining_principal - v_principal_paid
  where id = v_loan.id;
  update public.loans set status = 'CLOSED'
  where id = v_loan.id and remaining_principal = 0 and status in ('ACTIVE', 'DEFAULTED');
end;
$$;

create or replace function public.confirm_repayment(
  p_request uuid,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.repayment_requests;
begin
  perform app_private.require_active_staff(array['agent_caisse', 'admin', 'super_admin']);
  if p_action not in ('CONFIRM', 'REJECT') then raise exception using errcode = '22023', message = 'INVALID_ACTION'; end if;
  if p_action = 'REJECT' and coalesce(trim(p_reason), '') = '' then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;
  update public.repayment_requests set
    status = case when p_action = 'CONFIRM' then 'CONFIRMED' else 'REJECTED' end,
    confirmed_by = auth.uid(),
    confirmed_at = case when p_action = 'CONFIRM' then now() else null end,
    rejected_reason = case when p_action = 'REJECT' then trim(p_reason) else null end
  where id = p_request and status = 'PENDING'
  returning * into r;
  if not found then raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED'; end if;
  if p_action = 'CONFIRM' then perform app_private.apply_repayment(r.client_id, r.amount, r.id); end if;
end;
$$;

create or replace function app_private.release_funds_on_loan_close()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_released bigint;
begin
  if new.status = 'CLOSED' and old.status in ('ACTIVE', 'DEFAULTED') then
    update public.wallets set
      free_savings = free_savings + blocked_guarantee + mandatory_savings + disbursed_loan,
      blocked_guarantee = 0,
      mandatory_savings = 0,
      disbursed_loan = 0,
      updated_at = now()
    where client_id = new.client_id
    returning free_savings into v_released;
    insert into public.audit_logs (user_id, user_role, action_type, target_id, new_value)
    values (new.client_id, 'system', 'AUTO_RELEASE', new.id, jsonb_build_object('wallet_free_savings', v_released));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_release_on_close on public.loans;
create trigger trg_release_on_close
after update of status on public.loans
for each row execute function app_private.release_funds_on_loan_close();

create or replace function public.get_active_loan_status()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  r public.loan_requests;
  l public.loans;
  v_has_payment boolean;
begin
  select * into l from public.loans where client_id = auth.uid()
  order by created_at desc limit 1;
  if found and l.status in ('ACTIVE', 'DEFAULTED') then
    select exists(select 1 from public.repayment_requests where loan_id = l.id and status = 'CONFIRMED') into v_has_payment;
    return jsonb_build_object(
      'displayState', case when v_has_payment then 8 else 7 end,
      'loanId', l.id, 'status', l.status, 'remainingPrincipal', l.remaining_principal,
      'totalAmount', l.total_amount
    );
  elsif found and l.status = 'CLOSED' then
    return jsonb_build_object('displayState', 9, 'loanId', l.id, 'status', l.status);
  end if;

  select * into r from public.loan_requests where client_id = auth.uid()
  order by created_at desc limit 1;
  if not found or r.status in ('DRAFT', 'CANCELLED') then return jsonb_build_object('displayState', 1); end if;
  return jsonb_build_object(
    'displayState', case
      when r.status in ('SUBMITTED', 'IN_ANALYSIS', 'PRE_APPROVED') then 2
      when r.status = 'INFO_REQUESTED' then 3
      when r.status = 'ACCEPTED' then 4
      when r.status = 'GUARANTEE_PENDING' then 5
      when r.status in ('GUARANTEE_COMPLETE', 'AWAITING_DISBURSEMENT') then 6
      when r.status = 'REJECTED' then 10 else 1 end,
    'requestId', r.id, 'status', r.status,
    'guaranteeRequired', r.guarantee_required,
    'guaranteeBlocked', r.guarantee_blocked_partial
  );
end;
$$;

grant execute on function public.simulate_loan(uuid, bigint, int, date) to authenticated;
grant execute on function public.create_loan_request(uuid, uuid, bigint, int, text, bigint, text, jsonb, uuid, uuid) to service_role;
grant execute on function public.transition_loan_request(uuid, text, bigint, text) to authenticated;
grant execute on function public.process_guarantee_blocking(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.disburse_loan(uuid, text) to authenticated;
grant execute on function public.create_repayment_request(uuid, uuid, bigint, text, text, text, uuid, uuid) to service_role;
grant execute on function public.confirm_repayment(uuid, text, text) to authenticated;
grant execute on function public.get_active_loan_status() to authenticated;
