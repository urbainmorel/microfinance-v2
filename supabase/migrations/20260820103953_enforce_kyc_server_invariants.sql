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
    where id = v_user and is_active and kyc_status in ('NONE', 'INFO_REQUESTED')
  ) then
    raise exception using errcode = '42501', message = 'KYC_NOT_EDITABLE';
  end if;
  return v_user;
end;
$$;

create or replace function public.save_kyc_profile(p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app_private.assert_kyc_editable();
  v_country text;
begin
  if jsonb_typeof(p_data) <> 'object'
     or p_data = '{}'::jsonb
     or p_data - array[
       'birth_date', 'country', 'city', 'address', 'phone', 'profession',
       'monthly_income_estimate', 'id_type', 'id_number', 'id_expiry'
     ] <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'INVALID_KYC_FIELDS';
  end if;

  v_country := upper(trim(p_data ->> 'country'));
  if p_data ? 'country' and v_country not in (
    'BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG',
    'BÉNIN', 'BENIN', 'BURKINA FASO', 'CÔTE D''IVOIRE', 'COTE D''IVOIRE',
    'GUINÉE-BISSAU', 'GUINEE-BISSAU', 'GUINEA-BISSAU', 'MALI', 'NIGER',
    'SÉNÉGAL', 'SENEGAL', 'TOGO'
  ) then
    raise exception using errcode = '22023', message = 'COUNTRY_OUTSIDE_UMOA';
  end if;
  if p_data ? 'birth_date' and (
    (p_data ->> 'birth_date')::date >= current_date
    or (p_data ->> 'birth_date')::date < date '1900-01-01'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_BIRTH_DATE';
  end if;
  if p_data ? 'phone' and trim(p_data ->> 'phone') !~ '^\+?[0-9]{8,15}$' then
    raise exception using errcode = '22023', message = 'INVALID_PHONE';
  end if;
  if p_data ? 'monthly_income_estimate' and (
    (p_data ->> 'monthly_income_estimate')::bigint < 0
    or (p_data ->> 'monthly_income_estimate')::bigint > 1000000000000
  ) then
    raise exception using errcode = '22023', message = 'INVALID_MONTHLY_INCOME';
  end if;
  if p_data ? 'id_type' and p_data ->> 'id_type' not in ('CNI', 'PASSPORT', 'PERMIS') then
    raise exception using errcode = '22023', message = 'INVALID_ID_TYPE';
  end if;
  if p_data ? 'id_expiry' and (p_data ->> 'id_expiry')::date <= current_date then
    raise exception using errcode = '22023', message = 'EXPIRED_ID';
  end if;

  update public.profiles set
    birth_date = case when p_data ? 'birth_date' then (p_data ->> 'birth_date')::date else birth_date end,
    country = case when p_data ? 'country' then v_country else country end,
    city = case when p_data ? 'city' then left(trim(p_data ->> 'city'), 120) else city end,
    address = case when p_data ? 'address' then left(trim(p_data ->> 'address'), 300) else address end,
    phone = case when p_data ? 'phone' then trim(p_data ->> 'phone') else phone end,
    profession = case when p_data ? 'profession' then left(trim(p_data ->> 'profession'), 120) else profession end,
    monthly_income_estimate = case when p_data ? 'monthly_income_estimate'
      then (p_data ->> 'monthly_income_estimate')::bigint else monthly_income_estimate end,
    id_type = case when p_data ? 'id_type' then p_data ->> 'id_type' else id_type end,
    id_number = case when p_data ? 'id_number' then left(trim(p_data ->> 'id_number'), 100) else id_number end,
    id_expiry = case when p_data ? 'id_expiry' then (p_data ->> 'id_expiry')::date else id_expiry end,
    updated_at = now()
  where id = v_user;
end;
$$;

create or replace function public.save_kyc_financials(p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app_private.assert_kyc_editable();
begin
  if jsonb_typeof(p_data) <> 'object'
     or p_data = '{}'::jsonb
     or p_data - array[
       'income_source', 'monthly_charges', 'momo_operator', 'momo_number', 'usual_bank'
     ] <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'INVALID_KYC_FIELDS';
  end if;
  if p_data ? 'monthly_charges' and (
    (p_data ->> 'monthly_charges')::bigint < 0
    or (p_data ->> 'monthly_charges')::bigint > 1000000000000
  ) then
    raise exception using errcode = '22023', message = 'INVALID_MONTHLY_CHARGES';
  end if;
  if p_data ? 'momo_number' and coalesce(p_data ->> 'momo_number', '') <> ''
     and trim(p_data ->> 'momo_number') !~ '^\+?[0-9]{8,15}$' then
    raise exception using errcode = '22023', message = 'INVALID_MOMO_NUMBER';
  end if;

  insert into public.kyc_financials (
    client_id, income_source, monthly_charges, momo_operator, momo_number, usual_bank, updated_at
  ) values (
    v_user,
    nullif(left(trim(p_data ->> 'income_source'), 200), ''),
    case when p_data ? 'monthly_charges' then (p_data ->> 'monthly_charges')::bigint end,
    nullif(left(trim(p_data ->> 'momo_operator'), 100), ''),
    nullif(trim(p_data ->> 'momo_number'), ''),
    nullif(left(trim(p_data ->> 'usual_bank'), 150), ''),
    now()
  )
  on conflict (client_id) do update set
    income_source = case when p_data ? 'income_source' then excluded.income_source else public.kyc_financials.income_source end,
    monthly_charges = case when p_data ? 'monthly_charges' then excluded.monthly_charges else public.kyc_financials.monthly_charges end,
    momo_operator = case when p_data ? 'momo_operator' then excluded.momo_operator else public.kyc_financials.momo_operator end,
    momo_number = case when p_data ? 'momo_number' then excluded.momo_number else public.kyc_financials.momo_number end,
    usual_bank = case when p_data ? 'usual_bank' then excluded.usual_bank else public.kyc_financials.usual_bank end,
    updated_at = now();
end;
$$;

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
     or v_profile.monthly_income_estimate is null or v_profile.id_type is null
     or nullif(trim(v_profile.id_number), '') is null or v_profile.id_expiry is null then
    raise exception using errcode = '22023', message = 'KYC_PROFILE_INCOMPLETE';
  end if;
  if not exists (
    select 1 from public.kyc_financials
    where client_id = v_user and nullif(trim(income_source), '') is not null
  ) then
    raise exception using errcode = '22023', message = 'KYC_FINANCIALS_INCOMPLETE';
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

revoke all on function app_private.assert_kyc_editable() from public, anon, authenticated;
revoke all on function public.save_kyc_profile(jsonb) from public, anon;
revoke all on function public.save_kyc_financials(jsonb) from public, anon;
revoke all on function public.submit_kyc() from public, anon;
grant execute on function public.save_kyc_profile(jsonb) to authenticated;
grant execute on function public.save_kyc_financials(jsonb) to authenticated;
grant execute on function public.submit_kyc() to authenticated;
