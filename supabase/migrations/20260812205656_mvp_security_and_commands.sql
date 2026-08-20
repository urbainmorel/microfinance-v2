-- MVP wave 0/1: least-privilege function surface and atomic client commands.

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema app_private revoke execute on functions from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema app_private from public, anon, authenticated;

create table if not exists app_private.client_command_receipts (
  client_id uuid not null references public.profiles(id),
  action text not null check (action in ('request.cancel', 'guarantee.block')),
  idempotency_key uuid not null,
  target_id uuid not null,
  result_status text not null,
  correlation_id uuid,
  created_at timestamptz not null default now(),
  primary key (client_id, action, idempotency_key)
);
revoke all on app_private.client_command_receipts from public, anon, authenticated, service_role;

create or replace function app_private.require_active_staff(p_allowed_roles text[])
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select role into v_role
  from public.profiles
  where id = auth.uid() and is_active
  for share;

  if not found or v_role is null or not coalesce(v_role = any(p_allowed_roles), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  return v_role;
end;
$$;
revoke execute on function app_private.require_active_staff(text[]) from public, anon, authenticated, service_role;

-- Keep only the existing browser-facing functions callable.
grant execute on function public.auth_role() to authenticated;
grant execute on function public.get_available_balance(uuid) to authenticated;
grant execute on function public.get_wallet_summary(uuid) to authenticated;
grant execute on function public.get_onboarding_state() to authenticated;
grant execute on function public.save_kyc_profile(jsonb) to authenticated;
grant execute on function public.save_kyc_financials(jsonb) to authenticated;
grant execute on function public.submit_kyc() to authenticated;
grant execute on function public.amortization_rows(bigint, numeric, int, text) to authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- The legacy public credit helper and RPC carrying a caller-supplied agent are retired.
revoke execute on function public.credit_wallet(uuid, text, bigint) from public, anon, authenticated, service_role;
revoke execute on function public.create_withdrawal(uuid, text, bigint, jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.settle_withdrawal(uuid, text, uuid, text, text) from public, anon, authenticated, service_role;

create or replace function app_private.credit_wallet(
  p_client uuid,
  p_field text,
  p_amount bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_field not in ('free_savings', 'blocked_guarantee', 'mandatory_savings', 'disbursed_loan') then
    raise exception using errcode = '22023', message = 'INVALID_WALLET_FIELD';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'INVALID_AMOUNT';
  end if;

  execute format(
    'update public.wallets set %I = %I + $1, updated_at = now() where client_id = $2',
    p_field,
    p_field
  ) using p_amount, p_client;

  if not found then
    raise exception using errcode = 'P0002', message = 'WALLET_NOT_FOUND';
  end if;
end;
$$;

-- Stub replaced by the repayment migration. It lets deposit confirmation keep a stable contract.
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
begin
  raise exception using errcode = '0A000', message = 'REPAYMENT_NOT_READY';
end;
$$;

alter table public.deposit_requests add column if not exists idempotency_key uuid;
alter table public.deposit_requests add column if not exists correlation_id uuid;
alter table public.withdrawal_requests add column if not exists idempotency_key uuid;
alter table public.withdrawal_requests add column if not exists correlation_id uuid;
alter table public.repayment_requests add column if not exists idempotency_key uuid;
alter table public.repayment_requests add column if not exists correlation_id uuid;
alter table public.loan_requests add column if not exists idempotency_key uuid;
alter table public.loan_requests add column if not exists correlation_id uuid;

create unique index if not exists deposit_requests_idempotency
  on public.deposit_requests (client_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists withdrawal_requests_idempotency
  on public.withdrawal_requests (client_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists repayment_requests_idempotency
  on public.repayment_requests (client_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists loan_requests_idempotency
  on public.loan_requests (client_id, idempotency_key) where idempotency_key is not null;

-- Client creation goes exclusively through service-role Edge Functions after PIN verification.
drop policy if exists "dep_client_insert" on public.deposit_requests;
drop policy if exists "rep_client_insert" on public.repayment_requests;
drop policy if exists "lr_client_insert" on public.loan_requests;
revoke insert on public.deposit_requests from authenticated;
revoke insert on public.repayment_requests from authenticated;
revoke insert on public.loan_requests from authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deposit-proofs',
  'deposit-proofs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "deposit_proofs_owner_insert" on storage.objects;
create policy "deposit_proofs_owner_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'deposit-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "deposit_proofs_owner_select" on storage.objects;
create policy "deposit_proofs_owner_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'deposit-proofs'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.auth_role() in ('agent_caisse', 'admin', 'super_admin', 'auditor')
  )
);

-- Financial proofs are immutable once uploaded. Only privileged retention/anonymization
-- routines may delete them with the database owner privileges.
drop policy if exists "deposit_proofs_owner_update" on storage.objects;
drop policy if exists "deposit_proofs_owner_delete" on storage.objects;

create or replace function public.create_deposit_request(
  p_client uuid,
  p_amount bigint,
  p_motif text,
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
  select id into v_id
  from public.deposit_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  if found then return v_id; end if;

  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'INVALID_AMOUNT';
  end if;
  if p_motif not in ('FREE_SAVINGS', 'GUARANTEE', 'REPAYMENT') then
    raise exception using errcode = '22023', message = 'INVALID_MOTIF';
  end if;
  if p_motif = 'GUARANTEE' and exists (
    select 1 from public.loans
    where client_id = p_client and status in ('ACTIVE', 'DEFAULTED')
  ) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_LOAN_EXISTS';
  end if;
  if p_payment_method not in ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER') then
    raise exception using errcode = '22023', message = 'INVALID_PAYMENT_METHOD';
  end if;
  if p_proof_path is null or p_proof_path = '' or split_part(p_proof_path, '/', 1) <> p_client::text then
    raise exception using errcode = '22023', message = 'INVALID_PROOF_PATH';
  end if;

  insert into public.deposit_requests (
    client_id, amount, motif, payment_method, reference, proof_url,
    idempotency_key, correlation_id
  ) values (
    p_client, p_amount, p_motif, p_payment_method, nullif(trim(p_reference), ''),
    p_proof_path, p_idempotency_key, coalesce(p_correlation_id, gen_random_uuid())
  ) returning id into v_id;
  return v_id;
exception when unique_violation then
  select id into v_id from public.deposit_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  return v_id;
end;
$$;

create or replace function public.create_client_withdrawal(
  p_client uuid,
  p_type text,
  p_amount bigint,
  p_recipient jsonb,
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
  if p_client is null or p_idempotency_key is null or p_recipient is null then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'INVALID_AMOUNT';
  end if;
  if p_type not in ('MOBILE_MONEY', 'BANK_TRANSFER') then
    raise exception using errcode = '22023', message = 'INVALID_WITHDRAWAL_TYPE';
  end if;
  if coalesce(trim(p_recipient ->> 'name'), '') = '' then
    raise exception using errcode = '22023', message = 'RECIPIENT_NAME_REQUIRED';
  end if;

  select id into v_id from public.withdrawal_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  if found then return v_id; end if;

  update public.wallets
  set reserved_amount = reserved_amount + p_amount, updated_at = now()
  where client_id = p_client
    and free_savings + disbursed_loan - reserved_amount >= p_amount;
  if not found then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_FUNDS';
  end if;

  insert into public.withdrawal_requests (
    client_id, type, amount, recipient_operator, recipient_phone,
    recipient_bank, recipient_account, recipient_name, idempotency_key, correlation_id
  ) values (
    p_client, p_type, p_amount, nullif(trim(p_recipient ->> 'operator'), ''),
    nullif(trim(p_recipient ->> 'phone'), ''), nullif(trim(p_recipient ->> 'bank'), ''),
    nullif(trim(p_recipient ->> 'account'), ''), trim(p_recipient ->> 'name'),
    p_idempotency_key, coalesce(p_correlation_id, gen_random_uuid())
  ) returning id into v_id;
  return v_id;
exception when unique_violation then
  select id into v_id from public.withdrawal_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  return v_id;
end;
$$;

create or replace function public.cancel_client_request(
  p_client uuid,
  p_kind text,
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
  v_amount bigint;
  v_existing uuid;
begin
  if p_client is null or p_request is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  insert into app_private.client_command_receipts (
    client_id, action, idempotency_key, target_id, result_status, correlation_id
  ) values (
    p_client, 'request.cancel', p_idempotency_key, p_request, 'CANCELLED', p_correlation_id
  ) on conflict (client_id, action, idempotency_key) do nothing;
  if not found then
    select target_id into v_existing
    from app_private.client_command_receipts
    where client_id = p_client and action = 'request.cancel'
      and idempotency_key = p_idempotency_key;
    if v_existing <> p_request then
      raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED';
    end if;
    return v_existing;
  end if;

  if p_kind = 'deposit' then
    update public.deposit_requests
    set status = 'CANCELLED', correlation_id = coalesce(p_correlation_id, correlation_id)
    where id = p_request and client_id = p_client and status = 'PENDING';
  elsif p_kind = 'repayment' then
    update public.repayment_requests
    set status = 'CANCELLED', correlation_id = coalesce(p_correlation_id, correlation_id)
    where id = p_request and client_id = p_client and status = 'PENDING';
  elsif p_kind = 'loan' then
    update public.loan_requests
    set status = 'CANCELLED', correlation_id = coalesce(p_correlation_id, correlation_id), updated_at = now()
    where id = p_request and client_id = p_client and status in ('DRAFT', 'SUBMITTED', 'INFO_REQUESTED');
  elsif p_kind = 'withdrawal' then
    update public.withdrawal_requests
    set status = 'CANCELLED', correlation_id = coalesce(p_correlation_id, correlation_id), updated_at = now()
    where id = p_request and client_id = p_client and status = 'PENDING'
    returning amount into v_amount;
    if found then
      update public.wallets
      set reserved_amount = reserved_amount - v_amount, updated_at = now()
      where client_id = p_client and reserved_amount >= v_amount;
    end if;
  else
    raise exception using errcode = '22023', message = 'INVALID_REQUEST_KIND';
  end if;

  if not found and v_amount is null then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
  end if;
  return p_request;
end;
$$;

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
  if p_action not in ('CONFIRM', 'REJECT') then
    raise exception using errcode = '22023', message = 'INVALID_ACTION';
  end if;
  if p_action = 'REJECT' and coalesce(trim(p_reason), '') = '' then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;

  update public.deposit_requests
  set status = case when p_action = 'CONFIRM' then 'CONFIRMED' else 'REJECTED' end,
      confirmed_by = v_actor,
      confirmed_at = case when p_action = 'CONFIRM' then now() else null end,
      rejected_reason = case when p_action = 'REJECT' then trim(p_reason) else null end
  where id = p_request and status = 'PENDING'
  returning * into r;
  if not found then
    raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED';
  end if;

  if p_action = 'CONFIRM' then
    if r.motif = 'FREE_SAVINGS' then
      perform app_private.credit_wallet(r.client_id, 'free_savings', r.amount);
    elsif r.motif = 'GUARANTEE' then
      if exists (
        select 1 from public.loans
        where client_id = r.client_id and status in ('ACTIVE', 'DEFAULTED')
      ) then
        raise exception using errcode = 'P0001', message = 'ACTIVE_LOAN_EXISTS';
      end if;
      perform app_private.credit_wallet(r.client_id, 'blocked_guarantee', r.amount);
    else
      perform app_private.apply_repayment(r.client_id, r.amount, r.id);
    end if;
  end if;
end;
$$;

create or replace function public.settle_withdrawal(
  p_request uuid,
  p_action text,
  p_reference text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.withdrawal_requests;
  v_actor uuid := auth.uid();
  v_from_loan bigint;
  v_hour int;
  v_start int;
  v_end int;
begin
  perform app_private.require_active_staff(array['agent_caisse', 'admin', 'super_admin']);
  if p_action not in ('EXECUTE', 'REJECT') then
    raise exception using errcode = '22023', message = 'INVALID_ACTION';
  end if;
  if p_action = 'EXECUTE' and coalesce(trim(p_reference), '') = '' then
    raise exception using errcode = '22023', message = 'REFERENCE_REQUIRED';
  end if;
  if p_action = 'REJECT' and coalesce(trim(p_reason), '') = '' then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;

  select * into r from public.withdrawal_requests where id = p_request for update;
  if not found or r.status <> 'PENDING' then
    raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED';
  end if;

  if p_action = 'EXECUTE' then
    select withdrawal_window_start, withdrawal_window_end into v_start, v_end
    from public.app_settings where id;
    v_hour := extract(hour from now() at time zone 'Africa/Abidjan');
    if not public.withdrawal_hour_open(v_hour, v_start, v_end) then
      raise exception using errcode = 'P0001', message = 'OUTSIDE_WINDOW';
    end if;

    select least(r.amount, disbursed_loan) into v_from_loan
    from public.wallets where client_id = r.client_id for update;

    update public.wallets set
      disbursed_loan = disbursed_loan - v_from_loan,
      free_savings = free_savings - (r.amount - v_from_loan),
      reserved_amount = reserved_amount - r.amount,
      updated_at = now()
    where client_id = r.client_id and reserved_amount >= r.amount;

    update public.withdrawal_requests set
      status = 'COMPLETED', processed_by = v_actor,
      external_reference = trim(p_reference), updated_at = now()
    where id = p_request;
  else
    update public.wallets set reserved_amount = reserved_amount - r.amount, updated_at = now()
    where client_id = r.client_id and reserved_amount >= r.amount;

    update public.withdrawal_requests set
      status = 'REJECTED', processed_by = v_actor,
      rejected_reason = trim(p_reason), updated_at = now()
    where id = p_request;
  end if;
end;
$$;

create or replace function public.review_kyc(
  p_client uuid,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  perform app_private.require_active_staff(array['validator', 'admin', 'super_admin']);
  if p_action not in ('VALIDATE', 'REJECT', 'REQUEST_INFO') then
    raise exception using errcode = '22023', message = 'INVALID_ACTION';
  end if;
  if p_action <> 'VALIDATE' and coalesce(trim(p_reason), '') = '' then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;
  v_status := case p_action
    when 'VALIDATE' then 'COMPLETED'
    when 'REJECT' then 'REJECTED'
    else 'INFO_REQUESTED'
  end;
  perform set_config('app.privileged', 'on', true);
  update public.profiles set kyc_status = v_status, updated_at = now()
  where id = p_client and kyc_status in ('PENDING', 'IN_REVIEW', 'INFO_REQUESTED');
  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
  end if;
end;
$$;

create or replace function public.get_client_operations(
  p_limit int default 50,
  p_before timestamptz default null
)
returns table (
  operation_type text,
  id uuid,
  amount bigint,
  status text,
  label text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from (
    select 'DEPOSIT'::text, d.id, d.amount, d.status,
      case d.motif when 'FREE_SAVINGS' then 'Dépôt épargne'
        when 'GUARANTEE' then 'Dépôt de garantie' else 'Remboursement anticipé' end,
      d.created_at
    from public.deposit_requests d
    where d.client_id = auth.uid()
    union all
    select case when w.type = 'BANK_TRANSFER' then 'TRANSFER' else 'WITHDRAWAL' end,
      w.id, w.amount, w.status,
      case when w.type = 'BANK_TRANSFER' then 'Virement bancaire' else 'Retrait Mobile Money' end,
      w.created_at
    from public.withdrawal_requests w
    where w.client_id = auth.uid()
    union all
    select 'REPAYMENT', r.id, r.amount, r.status, 'Remboursement de prêt', r.created_at
    from public.repayment_requests r
    where r.client_id = auth.uid()
  ) operations
  where p_before is null or operations.created_at < p_before
  order by operations.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

grant execute on function public.create_deposit_request(uuid, bigint, text, text, text, text, uuid, uuid) to service_role;
grant execute on function public.create_client_withdrawal(uuid, text, bigint, jsonb, uuid, uuid) to service_role;
grant execute on function public.cancel_client_request(uuid, text, uuid, uuid, uuid) to service_role;
grant execute on function public.confirm_deposit(uuid, text, text) to authenticated;
grant execute on function public.settle_withdrawal(uuid, text, text, text) to authenticated;
grant execute on function public.review_kyc(uuid, text, text) to authenticated;
grant execute on function public.get_client_operations(int, timestamptz) to authenticated;
