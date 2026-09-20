-- Autorise tous les pays utilisant le Franc CFA en Afrique (Zone UEMOA + Zone CEMAC)
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
    -- Zone UEMOA (XOF)
    'BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG',
    'BÉNIN', 'BENIN', 'BURKINA FASO', 'CÔTE D''IVOIRE', 'COTE D''IVOIRE',
    'GUINÉE-BISSAU', 'GUINEE-BISSAU', 'GUINEA-BISSAU', 'MALI', 'NIGER',
    'SÉNÉGAL', 'SENEGAL', 'TOGO',
    -- Zone CEMAC (XAF)
    'CM', 'CF', 'CG', 'GA', 'GQ', 'TD',
    'CAMEROUN', 'CAMEROON',
    'CENTRAFRIQUE', 'RÉPUBLIQUE CENTRAFRICAINE', 'REPUBLIQUE CENTRAFRICAINE',
    'CONGO', 'RÉPUBLIQUE DU CONGO', 'REPUBLIQUE DU CONGO', 'CONGO (BRAZZAVILLE)',
    'GABON',
    'GUINÉE ÉQUATORIALE', 'GUINEE EQUATORIALE', 'EQUATORIAL GUINEA',
    'TCHAD', 'CHAD'
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

revoke all on function public.save_kyc_profile(jsonb) from public, anon;
grant execute on function public.save_kyc_profile(jsonb) to authenticated;
