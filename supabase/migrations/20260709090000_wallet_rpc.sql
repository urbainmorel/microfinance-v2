-- Lot 3 — RPC de lecture du portefeuille + brique de crédit (Specs §D.2, §A Écran 3).

-- Résumé du portefeuille : renvoie les 5 sous-comptes. SECURITY INVOKER ⇒ RLS appliquée
-- (le client ne lit que le sien ; le personnel habilité lit celui d'un client).
create or replace function public.get_wallet_summary(p_client uuid)
returns table (
  free_savings bigint,
  disbursed_loan bigint,
  blocked_guarantee bigint,
  mandatory_savings bigint,
  reserved_amount bigint
)
language sql
stable
as $$
  select free_savings, disbursed_loan, blocked_guarantee, mandatory_savings, reserved_amount
  from public.wallets
  where client_id = p_client;
$$;

-- Brique UNIQUE de crédit (Specs §D.2) : socle de tous les mouvements créditeurs.
-- SECURITY DEFINER : seule voie d'écriture d'un wallet (RLS interdit l'écriture directe).
-- Liste blanche de champs ; montant strictement positif (les débits ont leur propre voie).
create or replace function public.credit_wallet(p_client uuid, p_field text, p_amount bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_field not in ('free_savings', 'blocked_guarantee', 'mandatory_savings', 'disbursed_loan') then
    raise exception 'Champ de crédit non autorisé : %', p_field;
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant de crédit invalide : %', p_amount;
  end if;
  execute format(
    'update public.wallets set %I = %I + $1, updated_at = now() where client_id = $2',
    p_field, p_field
  ) using p_amount, p_client;
end;
$$;
