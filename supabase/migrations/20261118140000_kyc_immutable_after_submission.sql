-- Migration : Immuabilité du dossier KYC dès la soumission
-- Date : 2026-11-18
--
-- Décision métier : une fois le dossier soumis (kyc_status = 'PENDING'), le client ne doit
-- plus pouvoir modifier les données d'identité examinées par la conformité
-- (nom, pays, ville, adresse, téléphone, profession, revenu, type/numéro/expiration de pièce).
--
-- Pour corriger un dossier, l'administrateur le repasse en 'INFO_REQUESTED' : le client
-- retrouve alors le droit d'édition et resoumet.
--
-- Sans cette règle, le client pouvait changer son numéro de pièce pendant l'instruction :
-- l'agent validait un dossier qui ne correspondait plus à ce qui avait été soumis, et
-- aucune trace (audit_logs) ne permettait de reconstituer l'état réellement examiné.

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
