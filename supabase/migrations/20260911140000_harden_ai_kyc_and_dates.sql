-- Migration de durcissement pour la vérification KYC automatisée

-- 1. Helper sécurisé de conversion de date : ne lève jamais d'exception en cas de date invalide (ex: 1990-02-31)
create or replace function app_private.safe_cast_date(p_text text)
returns date
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_text is null or p_text !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  return p_text::date;
exception when others then
  return null;
end;
$$;

-- 2. Permettre l'idempotence de soumission (y compris si le dossier est déjà PENDING suite à un retry)
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
    where id = v_user and is_active and kyc_status in ('NONE', 'INFO_REQUESTED', 'REJECTED', 'PENDING')
  ) then
    raise exception using errcode = '42501', message = 'KYC_NOT_EDITABLE';
  end if;
  return v_user;
end;
$$;

revoke all on function app_private.assert_kyc_editable() from public, anon, authenticated;

-- 3. submit_kyc() idempotent supportant le retry après un incident réseau
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
  if v_profile.country is null
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
  where id = v_user and kyc_status in ('NONE', 'INFO_REQUESTED', 'REJECTED', 'PENDING');
end;
$$;

revoke all on function public.submit_kyc() from public, anon;
grant execute on function public.submit_kyc() to authenticated;

-- 4. auto_process_kyc() durci avec conversion de date sécurisée
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
  v_extracted_birth_date text;
  v_extracted_id_number text;
  v_extracted_id_expiry text;
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

    v_extracted_birth_date := nullif(trim(p_report -> 'extracted_data' ->> 'birth_date'), '');
    v_extracted_id_number := nullif(trim(p_report -> 'extracted_data' ->> 'id_number'), '');
    v_extracted_id_expiry := nullif(trim(p_report -> 'extracted_data' ->> 'expiry_date'), '');

    update public.profiles
    set kyc_status = 'COMPLETED',
        birth_date = coalesce(
          app_private.safe_cast_date(v_extracted_birth_date),
          birth_date
        ),
        id_number = coalesce(v_extracted_id_number, id_number),
        id_expiry = coalesce(
          app_private.safe_cast_date(v_extracted_id_expiry),
          id_expiry
        ),
        kyc_rejection_reason = null,
        kyc_ai_report = coalesce(p_report, jsonb_build_object('auto_validated', true, 'processed_at', now())),
        updated_at = now()
    where id = p_client_id;

    insert into public.audit_logs (
      user_id, user_role, action_type, target_id, old_value, new_value, reason
    ) values (
      p_client_id, 'system_ai', 'KYC_AUTO_VALIDATED', p_client_id,
      jsonb_build_object('kyc_status', v_profile.kyc_status),
      jsonb_build_object(
        'kyc_status', 'COMPLETED',
        'extracted_birth_date', v_extracted_birth_date,
        'extracted_id_number', v_extracted_id_number,
        'ai_report', p_report
      ),
      coalesce(p_reason, 'Validation automatique par IA avec extraction sécurisée (Gemini 2.5 Flash)')
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
