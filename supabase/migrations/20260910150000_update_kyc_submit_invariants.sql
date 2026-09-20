-- Mise à jour de submit_kyc() pour supprimer la dépendance obligatoire à income_source
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
  where id = v_user and kyc_status in ('NONE', 'INFO_REQUESTED');
end;
$$;

revoke all on function public.submit_kyc() from public, anon;
grant execute on function public.submit_kyc() to authenticated;
