-- Migration : Suppression de l'obligation du selfie pour la validation KYC
-- Met à jour submit_kyc et review_kyc_submission pour n'exiger que ID_FRONT et ID_BACK (si non-passeport)

-- 1. Mise à jour de submit_kyc()
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
begin
  select * into strict v_profile from public.profiles where id = v_user;
  if v_profile.country is null
     or nullif(trim(v_profile.city), '') is null or nullif(trim(v_profile.address), '') is null
     or nullif(trim(v_profile.phone), '') is null or nullif(trim(v_profile.profession), '') is null
     or v_profile.monthly_income_estimate is null or v_profile.id_type is null then
    raise exception using errcode = '22023', message = 'KYC_PROFILE_INCOMPLETE';
  end if;

  select
    bool_or(doc_type = 'ID_FRONT'), bool_or(doc_type = 'ID_BACK')
  into v_has_front, v_has_back
  from public.kyc_documents where client_id = v_user;

  if not coalesce(v_has_front, false)
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

-- 2. Mise à jour de review_kyc_submission() (revue humaine côté back-office)
create or replace function public.review_kyc_submission(
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
  v_admin uuid;
  v_old_status text;
  v_status text;
  v_id_type text;
  v_has_front boolean;
  v_has_back boolean;
begin
  v_admin := app_private.require_active_staff(array['admin', 'compliance', 'manager']);

  if p_action not in ('VALIDATE', 'REJECT', 'REQUEST_INFO') then
    raise exception using errcode = '22023', message = 'INVALID_ACTION';
  end if;

  if p_action in ('REJECT', 'REQUEST_INFO') and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;

  select kyc_status, id_type into v_old_status, v_id_type
  from public.profiles where id = p_client for update;
  if not found or v_old_status not in ('PENDING', 'IN_REVIEW', 'INFO_REQUESTED') then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
  end if;

  if p_action = 'VALIDATE' then
    select
      bool_or(doc_type = 'ID_FRONT' and verified),
      bool_or(doc_type = 'ID_BACK' and verified)
    into v_has_front, v_has_back
    from public.kyc_documents where client_id = p_client;
    if not coalesce(v_has_front, false)
       or (v_id_type <> 'PASSPORT' and not coalesce(v_has_back, false)) then
      raise exception using errcode = '22023', message = 'KYC_DOCUMENTS_NOT_VERIFIED';
    end if;
  end if;

  v_status := case p_action
    when 'VALIDATE' then 'COMPLETED'
    when 'REJECT' then 'REJECTED'
    else 'INFO_REQUESTED'
  end;

  perform set_config('app.privileged', 'on', true);
  update public.profiles set kyc_status = v_status, updated_at = now() where id = p_client;

  insert into public.audit_logs (
    user_id, user_role, action_type, target_id, old_value, new_value, reason
  ) values (
    v_admin,
    coalesce(current_setting('request.jwt.claim.user_role', true), 'admin'),
    'KYC_REVIEW',
    p_client,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', v_status),
    p_reason
  );

  insert into public.notifications (client_id, type, title, body)
  values (
    p_client,
    case p_action
      when 'VALIDATE' then 'KYC_APPROVED'
      when 'REJECT' then 'KYC_REJECTED'
      else 'KYC_INFO_REQUESTED'
    end,
    case p_action
      when 'VALIDATE' then 'Dossier KYC validé'
      when 'REJECT' then 'Dossier KYC non validé'
      else 'Complément KYC demandé'
    end,
    coalesce(p_reason, case p_action
      when 'VALIDATE' then 'Votre identité a été vérifiée avec succès.'
      when 'REJECT' then 'Votre dossier n''a pas pu être validé.'
      else 'Des informations complémentaires sont requises.'
    end)
  );
end;
$$;

revoke all on function public.review_kyc_submission(uuid, text, text) from public, anon;
grant execute on function public.review_kyc_submission(uuid, text, text) to authenticated;
