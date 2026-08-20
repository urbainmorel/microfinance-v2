-- La validation KYC est une décision humaine explicite, pièce par pièce.
create or replace function public.verify_kyc_document(
  p_document uuid,
  p_verified boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_document record;
begin
  perform app_private.require_active_staff(array['validator', 'admin', 'super_admin']);
  if not p_verified and coalesce(trim(p_reason), '') = '' then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;

  select d.*, p.kyc_status into v_document
  from public.kyc_documents d
  join public.profiles p on p.id = d.client_id
  where d.id = p_document
  for update of d, p;
  if not found then
    raise exception using errcode = 'P0002', message = 'DOCUMENT_NOT_FOUND';
  end if;
  if v_document.kyc_status not in ('PENDING', 'IN_REVIEW', 'INFO_REQUESTED') then
    raise exception using errcode = 'P0001', message = 'KYC_NOT_REVIEWABLE';
  end if;

  update public.kyc_documents set verified = p_verified where id = p_document;
  insert into public.audit_logs (
    user_id, user_role, action_type, target_id, old_value, new_value, reason
  ) values (
    v_actor, 'admin', 'KYC_DOCUMENT_REVIEWED', p_document,
    jsonb_build_object('verified', coalesce(v_document.verified, false)),
    jsonb_build_object('verified', p_verified, 'client_id', v_document.client_id,
                       'doc_type', v_document.doc_type),
    nullif(trim(p_reason), '')
  );
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
  v_actor uuid := auth.uid();
  v_status text;
  v_old_status text;
  v_id_type text;
  v_has_front boolean;
  v_has_back boolean;
  v_has_selfie boolean;
begin
  perform app_private.require_active_staff(array['validator', 'admin', 'super_admin']);
  if p_action not in ('VALIDATE', 'REJECT', 'REQUEST_INFO') then
    raise exception using errcode = '22023', message = 'INVALID_ACTION';
  end if;
  if p_action <> 'VALIDATE' and coalesce(trim(p_reason), '') = '' then
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
      bool_or(doc_type = 'ID_BACK' and verified),
      bool_or(doc_type = 'SELFIE' and verified)
    into v_has_front, v_has_back, v_has_selfie
    from public.kyc_documents where client_id = p_client;
    if not coalesce(v_has_front, false) or not coalesce(v_has_selfie, false)
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
    v_actor, 'admin', 'KYC_REVIEWED', p_client,
    jsonb_build_object('kyc_status', v_old_status),
    jsonb_build_object('kyc_status', v_status, 'action', p_action),
    nullif(trim(p_reason), '')
  );
end;
$$;

revoke all on function public.verify_kyc_document(uuid, boolean, text) from public, anon;
grant execute on function public.verify_kyc_document(uuid, boolean, text) to authenticated;
revoke all on function public.review_kyc(uuid, text, text) from public, anon;
grant execute on function public.review_kyc(uuid, text, text) to authenticated;
