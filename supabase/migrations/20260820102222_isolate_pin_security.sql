-- Isole les secrets PIN du schéma exposé par la Data API.
-- Les fonctions sensibles sont exclusivement appelables avec la service_role.

create table app_private.user_pin_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table app_private.user_pin_security from public, anon, authenticated;

insert into app_private.user_pin_security (user_id, pin_hash, failed_attempts, locked_until)
select id, pin_hash, greatest(coalesce(pin_attempts, 0), 0), pin_locked_until
from public.profiles
where pin_hash is not null;

create or replace function public.set_initial_pin_hash(p_user_id uuid, p_pin_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(length(p_pin_hash), 0) < 20 then
    raise exception using errcode = '22023', message = 'INVALID_PIN_HASH';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_user_id and is_active = true
  ) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  insert into app_private.user_pin_security (user_id, pin_hash)
  values (p_user_id, p_pin_hash)
  on conflict (user_id) do nothing;
  return found;
end;
$$;

create or replace function public.replace_pin_hash(p_user_id uuid, p_pin_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(length(p_pin_hash), 0) < 20 then
    raise exception using errcode = '22023', message = 'INVALID_PIN_HASH';
  end if;

  update app_private.user_pin_security s
  set pin_hash = p_pin_hash,
      failed_attempts = 0,
      locked_until = null,
      updated_at = now()
  from public.profiles p
  where s.user_id = p_user_id and p.id = p_user_id and p.is_active = true;
  return found;
end;
$$;

create or replace function public.record_pin_verification_failure(
  p_user_id uuid,
  p_lock_threshold integer default 5,
  p_lock_step_minutes integer default 15
)
returns table (attempts integer, new_locked_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_lock_threshold < 1 or p_lock_step_minutes < 1 then
    raise exception using errcode = '22023', message = 'INVALID_LOCK_POLICY';
  end if;

  return query
  update app_private.user_pin_security s
  set failed_attempts = s.failed_attempts + 1,
      locked_until = case
        when s.failed_attempts + 1 >= p_lock_threshold then
          now() + make_interval(
            mins => p_lock_step_minutes * (s.failed_attempts + 2 - p_lock_threshold)
          )
        else null
      end,
      updated_at = now()
  where s.user_id = p_user_id
  returning s.failed_attempts, s.locked_until;
end;
$$;

create or replace function public.record_pin_verification_success(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update app_private.user_pin_security
  set failed_attempts = 0, locked_until = null, updated_at = now()
  where user_id = p_user_id;
$$;

create or replace function public.get_onboarding_state()
returns table (pin_set boolean, kyc_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select (s.user_id is not null), p.kyc_status
  from public.profiles p
  left join app_private.user_pin_security s on s.user_id = p.id
  where p.id = auth.uid();
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
  delete from app_private.user_pin_security where user_id = p_client;
  perform set_config('app.privileged', 'on', true);
  update public.profiles set
    firstname = 'Utilisateur', lastname = 'Anonymisé', phone = null, country = null,
    city = null, address = null, profession = null, birth_date = null,
    monthly_income_estimate = null, id_type = null, id_number = null, id_expiry = null,
    is_active = false, updated_at = now()
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

alter table public.profiles
  drop column pin_hash,
  drop column pin_attempts,
  drop column pin_locked_until;

create or replace function public.get_pin_security_for_verification(p_user_id uuid)
returns table (
  is_active boolean,
  pin_hash text,
  failed_attempts integer,
  locked_until timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.is_active, s.pin_hash, s.failed_attempts, s.locked_until
  from public.profiles p
  left join app_private.user_pin_security s on s.user_id = p.id
  where p.id = p_user_id;
$$;

revoke all on function public.get_pin_security_for_verification(uuid) from public, anon, authenticated;
revoke all on function public.set_initial_pin_hash(uuid, text) from public, anon, authenticated;
revoke all on function public.replace_pin_hash(uuid, text) from public, anon, authenticated;
revoke all on function public.record_pin_verification_failure(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.record_pin_verification_success(uuid) from public, anon, authenticated;
grant execute on function public.get_pin_security_for_verification(uuid) to service_role;
grant execute on function public.set_initial_pin_hash(uuid, text) to service_role;
grant execute on function public.replace_pin_hash(uuid, text) to service_role;
grant execute on function public.record_pin_verification_failure(uuid, integer, integer) to service_role;
grant execute on function public.record_pin_verification_success(uuid) to service_role;

revoke all on function public.get_onboarding_state() from public, anon;
grant execute on function public.get_onboarding_state() to authenticated;
