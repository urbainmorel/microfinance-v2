-- MVP V1: two-role access model.
-- Only clients use the client application. The branch manager is the sole
-- internal application operator and holds the admin role.

select set_config('app.privileged', 'on', true);

-- Force every pre-production account to obtain the new two-role/active claims.
delete from auth.sessions;

update public.profiles
set role = 'client', is_active = false, updated_at = now()
where role <> 'client';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('client', 'admin'));

create unique index one_active_admin
on public.profiles ((role))
where role = 'admin' and is_active;

-- RLS never trusts a possibly stale JWT role. It reloads the active profile;
-- unsupported, inactive and missing accounts receive no back-office permission.
create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin' and is_active
    ) then 'admin'
    else 'client'
  end;
$$;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_active boolean;
  claims jsonb := event -> 'claims';
begin
  select
    case when role = 'admin' and is_active then 'admin' else 'client' end,
    is_active
  into v_role, v_active
  from public.profiles
  where id = (event ->> 'user_id')::uuid;
  v_role := coalesce(v_role, 'client');
  v_active := coalesce(v_active, false);

  if claims ? 'app_metadata' then
    claims := jsonb_set(claims, '{app_metadata,user_role}', to_jsonb(v_role));
    claims := jsonb_set(claims, '{app_metadata,account_active}', to_jsonb(v_active));
  else
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      jsonb_build_object('user_role', v_role, 'account_active', v_active)
    );
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Preserve the existing function signature so all staff RPCs remain stable,
-- but make ADMIN the single authority regardless of their former role lists.
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

  if not found or v_role <> 'admin' then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  return v_role;
end;
$$;

-- Role assignment is an operator bootstrap/succession action, never an RPC.
drop function if exists public.manage_user_role(uuid, text);

create or replace function public.manage_user_status(p_user uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target_role text;
begin
  perform app_private.require_active_staff(array['admin']);
  if p_user = v_actor and not p_active then
    raise exception using errcode = '22023', message = 'CANNOT_DISABLE_SELF';
  end if;
  select role into v_target_role from public.profiles where id = p_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'USER_NOT_FOUND'; end if;
  if v_target_role = 'admin' and not p_active and (
    select count(*) from public.profiles where role = 'admin' and is_active
  ) <= 1 then
    raise exception using errcode = '22023', message = 'LAST_ADMIN';
  end if;
  perform set_config('app.privileged', 'on', true);
  update public.profiles set is_active = p_active, updated_at = now() where id = p_user;
  delete from auth.sessions where user_id = p_user;
  insert into public.audit_logs (user_id, user_role, action_type, target_id, new_value)
  values (
    v_actor, 'admin',
    case when p_active then 'ACCOUNT_ENABLED' else 'ACCOUNT_DISABLED' end,
    p_user, jsonb_build_object('is_active', p_active)
  );
end;
$$;

create or replace function public.anonymize_client(p_client uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_active_staff(array['admin']);
  if coalesce(trim(p_reason), '') = '' then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;
  if exists (select 1 from public.loans where client_id = p_client and status in ('ACTIVE', 'DEFAULTED')) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_LOAN_EXISTS';
  end if;
  delete from storage.objects
  where bucket_id in ('kyc-documents', 'deposit-proofs', 'repayment-proofs', 'loan-documents')
    and (storage.foldername(name))[1] = p_client::text;
  perform set_config('app.privileged', 'on', true);
  update public.profiles set
    firstname = 'Utilisateur', lastname = 'Anonymisé', phone = null, country = null,
    city = null, address = null, profession = null, birth_date = null,
    monthly_income_estimate = null, id_type = null, id_number = null, id_expiry = null,
    pin_hash = null, is_active = false, updated_at = now()
  where id = p_client;
  delete from public.kyc_financials where client_id = p_client;
  delete from public.kyc_documents where client_id = p_client;
  update public.data_erasure_requests
  set status = 'COMPLETED', processed_by = auth.uid(), processed_at = now()
  where user_id = p_client and status = 'APPROVED';
  insert into public.audit_logs (user_id, user_role, action_type, target_id, reason)
  values (auth.uid(), 'admin', 'CLIENT_ANONYMIZED', p_client, trim(p_reason));
end;
$$;

create or replace function public.process_data_erasure(
  p_request uuid,
  p_action text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.data_erasure_requests;
begin
  perform app_private.require_active_staff(array['admin']);
  if p_action not in ('REJECT', 'ANONYMIZE') or coalesce(trim(p_reason), '') = '' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  select * into r
  from public.data_erasure_requests
  where id = p_request and status = 'PENDING'
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED'; end if;
  if p_action = 'REJECT' then
    update public.data_erasure_requests set
      status = 'REJECTED', processed_by = auth.uid(), processed_at = now(), reason = trim(p_reason)
    where id = r.id;
  else
    update public.data_erasure_requests set status = 'APPROVED' where id = r.id;
    perform public.anonymize_client(r.user_id, trim(p_reason));
  end if;
end;
$$;
