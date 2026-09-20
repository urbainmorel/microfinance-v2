-- Migration pour la vérification KYC 100% automatisée par IA (Gemini via OpenRouter)

-- 1. Ajout des colonnes d'audit et de rapport IA sur profiles
alter table public.profiles
  add column if not exists kyc_rejection_reason text,
  add column if not exists kyc_ai_report jsonb;

-- 2. Permettre à un utilisateur rejeté de modifier et resoumettre son KYC sans blocage
create or replace function app_private.assert_kyc_editable()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'UNAUTHENTICATED';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = v_user and is_active and kyc_status in ('NONE', 'INFO_REQUESTED', 'REJECTED')
  ) then
    raise exception using errcode = '42501', message = 'KYC_NOT_EDITABLE';
  end if;
  return v_user;
end;
$$;

revoke all on function app_private.assert_kyc_editable() from public, anon, authenticated;

-- 3. Mise à jour de submit_kyc() pour supporter la resoumission après rejet
create or replace function public.submit_kyc()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app_private.assert_kyc_editable();
  v_profile public.profiles;
  v_has_front boolean;
  v_has_back boolean;
  v_has_selfie boolean;
begin
  select * into strict v_profile from public.profiles where id = v_user;
  if v_profile.birth_date is null or v_profile.country is null
     or nullif(trim(v_profile.city), '') is null or nullif(trim(v_profile.address), '') is null
     or nullif(trim(v_profile.phone), '') is null or nullif(trim(v_profile.profession), '') is null
     or v_profile.monthly_income_estimate is null or v_profile.id_type is null then
    raise exception using errcode = '22023', message = 'KYC_PROFILE_INCOMPLETE';
  end if;

  select
    bool_or(doc_type = 'ID_FRONT'), bool_or(doc_type = 'ID_BACK'), bool_or(doc_type = 'SELFIE')
  into v_has_front, v_has_back, v_has_selfie
  from public.kyc_documents where client_id = v_user;
  if not coalesce(v_has_front, false) or not coalesce(v_has_selfie, false)
     or (v_profile.id_type <> 'PASSPORT' and not coalesce(v_has_back, false)) then
    raise exception using errcode = '22023', message = 'KYC_DOCUMENTS_INCOMPLETE';
  end if;

  perform set_config('app.privileged', 'on', true);
  update public.profiles set kyc_status = 'PENDING', updated_at = now()
  where id = v_user and kyc_status in ('NONE', 'INFO_REQUESTED', 'REJECTED');
end;
$$;

revoke all on function public.submit_kyc() from public, anon;
grant execute on function public.submit_kyc() to authenticated;

-- 4. Procédure atomique d'arbitrage automatique IA (VALIDATE ou REJECT)
create or replace function public.auto_process_kyc(
  p_client_id uuid,
  p_decision text,
  p_reason text default null,
  p_report jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if p_decision not in ('VALIDATE', 'REJECT') then
    raise exception using errcode = '22023', message = 'INVALID_DECISION';
  end if;

  select * into v_profile from public.profiles where id = p_client_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'CLIENT_NOT_FOUND';
  end if;

  perform set_config('app.privileged', 'on', true);

  if p_decision = 'VALIDATE' then
    update public.kyc_documents
    set verified = true
    where client_id = p_client_id;

    update public.profiles
    set kyc_status = 'COMPLETED',
        kyc_rejection_reason = null,
        kyc_ai_report = coalesce(p_report, jsonb_build_object('auto_validated', true, 'processed_at', now())),
        updated_at = now()
    where id = p_client_id;

    insert into public.audit_logs (
      user_id, user_role, action_type, target_id, old_value, new_value, reason
    ) values (
      p_client_id, 'system_ai', 'KYC_AUTO_VALIDATED', p_client_id,
      jsonb_build_object('kyc_status', v_profile.kyc_status),
      jsonb_build_object('kyc_status', 'COMPLETED', 'ai_report', p_report),
      coalesce(p_reason, 'Validation automatique par IA (Gemini 2.5 Flash)')
    );
  else
    update public.profiles
    set kyc_status = 'REJECTED',
        kyc_rejection_reason = p_reason,
        kyc_ai_report = coalesce(p_report, jsonb_build_object('auto_rejected', true, 'processed_at', now())),
        updated_at = now()
    where id = p_client_id;

    insert into public.audit_logs (
      user_id, user_role, action_type, target_id, old_value, new_value, reason
    ) values (
      p_client_id, 'system_ai', 'KYC_AUTO_REJECTED', p_client_id,
      jsonb_build_object('kyc_status', v_profile.kyc_status),
      jsonb_build_object('kyc_status', 'REJECTED', 'ai_report', p_report),
      p_reason
    );
  end if;
end;
$$;

revoke all on function public.auto_process_kyc(uuid, text, text, jsonb) from public, anon;
grant execute on function public.auto_process_kyc(uuid, text, text, jsonb) to service_role;
grant execute on function public.auto_process_kyc(uuid, text, text, jsonb) to postgres;
