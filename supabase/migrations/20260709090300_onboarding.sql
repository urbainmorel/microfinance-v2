-- Lot 2 — État d'onboarding pour le routage post-auth (PRD §4.2).
-- SECURITY DEFINER : renvoie un booléen `pin_set` (jamais le pin_hash) + le statut KYC
-- de l'utilisateur courant. Le client route sans jamais lire le hash du PIN.
create or replace function public.get_onboarding_state()
returns table (pin_set boolean, kyc_status text)
language sql
stable
security definer
set search_path = public
as $$
  select (pin_hash is not null) as pin_set, kyc_status
  from public.profiles
  where id = auth.uid();
$$;
