-- Lot 2 — KYC : sauvegarde serveur-autoritative par étape + soumission (PRD §6.4).
-- Les colonnes KYC du profil ne sont PAS dans le GRANT UPDATE client ⇒ écriture via RPC.
-- Sauvegarde partielle (coalesce) : chaque étape ajoute ses champs, sans effacer les autres.

create or replace function public.save_kyc_profile(p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set
    birth_date = coalesce((p_data ->> 'birth_date')::date, birth_date),
    country = coalesce(p_data ->> 'country', country),
    city = coalesce(p_data ->> 'city', city),
    address = coalesce(p_data ->> 'address', address),
    phone = coalesce(p_data ->> 'phone', phone),
    profession = coalesce(p_data ->> 'profession', profession),
    monthly_income_estimate =
      coalesce((p_data ->> 'monthly_income_estimate')::bigint, monthly_income_estimate),
    id_type = coalesce(p_data ->> 'id_type', id_type),
    id_number = coalesce(p_data ->> 'id_number', id_number),
    id_expiry = coalesce((p_data ->> 'id_expiry')::date, id_expiry),
    updated_at = now()
  where id = auth.uid();
end;
$$;

create or replace function public.save_kyc_financials(p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.kyc_financials
    (client_id, income_source, monthly_charges, momo_operator, momo_number, usual_bank, updated_at)
  values (
    auth.uid(), p_data ->> 'income_source', (p_data ->> 'monthly_charges')::bigint,
    p_data ->> 'momo_operator', p_data ->> 'momo_number', p_data ->> 'usual_bank', now()
  )
  on conflict (client_id) do update set
    income_source = coalesce(excluded.income_source, kyc_financials.income_source),
    monthly_charges = coalesce(excluded.monthly_charges, kyc_financials.monthly_charges),
    momo_operator = coalesce(excluded.momo_operator, kyc_financials.momo_operator),
    momo_number = coalesce(excluded.momo_number, kyc_financials.momo_number),
    usual_bank = coalesce(excluded.usual_bank, kyc_financials.usual_bank),
    updated_at = now();
end;
$$;

-- Soumission : passe kyc_status à PENDING (colonne protégée ⇒ SET LOCAL app.privileged).
create or replace function public.submit_kyc()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  set local app.privileged = 'on';
  update public.profiles set kyc_status = 'PENDING', updated_at = now()
   where id = auth.uid() and kyc_status in ('NONE', 'INFO_REQUESTED');
  if not found then
    raise exception 'KYC déjà soumis ou statut invalide';
  end if;
end;
$$;
