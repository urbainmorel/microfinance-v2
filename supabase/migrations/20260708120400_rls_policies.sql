-- Lot 1 — Row Level Security (Specs §C). RLS activée partout ; écritures comptables
-- exclusivement via fonctions SECURITY DEFINER (invariant 2). Une table sans policy = deny all.

alter table public.profiles enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.kyc_financials enable row level security;
alter table public.wallets enable row level security;
alter table public.loan_products enable row level security;
alter table public.loan_requests enable row level security;
alter table public.loans enable row level security;
alter table public.amortization_schedules enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.repayment_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_templates enable row level security;
alter table public.audit_logs enable row level security;

-- ── profiles — anti-élévation de privilèges ──────────────────────────────────
-- Le client ne modifie QUE des colonnes non sensibles de sa propre ligne.
revoke update on public.profiles from authenticated;
grant update (firstname, lastname, phone, city, address, preferred_language)
  on public.profiles to authenticated;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_staff_read" on public.profiles
  for select using (public.auth_role() in
    ('agent_credit', 'agent_caisse', 'validator', 'admin', 'super_admin', 'auditor'));

-- ── wallets — aucune écriture directe (tout passe par SECURITY DEFINER) ───────
create policy "wallets_select_own" on public.wallets
  for select using (auth.uid() = client_id);

create policy "wallets_staff_read" on public.wallets
  for select using (public.auth_role() in
    ('agent_credit', 'agent_caisse', 'validator', 'admin', 'super_admin', 'auditor'));

create policy "wallets_no_direct_write_upd" on public.wallets for update using (false);
create policy "wallets_no_direct_write_ins" on public.wallets for insert with check (false);
create policy "wallets_no_direct_write_del" on public.wallets for delete using (false);

-- ── kyc_documents / kyc_financials — lecture propriétaire + personnel ─────────
create policy "kyc_docs_client_select" on public.kyc_documents
  for select using (auth.uid() = client_id);
create policy "kyc_docs_client_insert" on public.kyc_documents
  for insert with check (auth.uid() = client_id);
create policy "kyc_docs_staff_read" on public.kyc_documents
  for select using (public.auth_role() in
    ('agent_credit', 'agent_caisse', 'validator', 'admin', 'super_admin', 'auditor'));

create policy "kyc_fin_client_select" on public.kyc_financials
  for select using (auth.uid() = client_id);
create policy "kyc_fin_client_insert" on public.kyc_financials
  for insert with check (auth.uid() = client_id);
create policy "kyc_fin_client_update" on public.kyc_financials
  for update using (auth.uid() = client_id) with check (auth.uid() = client_id);
create policy "kyc_fin_staff_read" on public.kyc_financials
  for select using (public.auth_role() in
    ('agent_credit', 'agent_caisse', 'validator', 'admin', 'super_admin', 'auditor'));

-- ── loan_requests — création + lecture client ; transitions via fonctions ─────
create policy "lr_client_select" on public.loan_requests
  for select using (auth.uid() = client_id);
create policy "lr_client_insert" on public.loan_requests
  for insert with check (auth.uid() = client_id);
create policy "lr_staff_select" on public.loan_requests
  for select using (public.auth_role() in
    ('agent_credit', 'validator', 'admin', 'super_admin', 'auditor'));
create policy "lr_no_direct_update" on public.loan_requests for update using (false);

-- ── loans / amortization_schedules — lecture client + personnel ───────────────
create policy "loans_client_select" on public.loans
  for select using (auth.uid() = client_id);
create policy "loans_staff_select" on public.loans
  for select using (public.auth_role() in
    ('agent_credit', 'agent_caisse', 'validator', 'admin', 'super_admin', 'auditor'));

create policy "amort_client_select" on public.amortization_schedules
  for select using (exists (
    select 1 from public.loans l where l.id = loan_id and l.client_id = auth.uid()
  ));
create policy "amort_staff_select" on public.amortization_schedules
  for select using (public.auth_role() in
    ('agent_credit', 'agent_caisse', 'validator', 'admin', 'super_admin', 'auditor'));

-- ── deposit_requests ──────────────────────────────────────────────────────────
create policy "dep_client_insert" on public.deposit_requests
  for insert with check (auth.uid() = client_id);
create policy "dep_client_select" on public.deposit_requests
  for select using (auth.uid() = client_id);
create policy "dep_cashier_select" on public.deposit_requests
  for select using (public.auth_role() in ('agent_caisse', 'admin', 'super_admin', 'auditor'));
create policy "dep_no_direct_update" on public.deposit_requests for update using (false);

-- ── withdrawal_requests — création via RPC create_withdrawal (pas d'INSERT direct) ─
create policy "wd_client_select" on public.withdrawal_requests
  for select using (auth.uid() = client_id);
create policy "wd_staff_select" on public.withdrawal_requests
  for select using (public.auth_role() in ('agent_caisse', 'admin', 'super_admin', 'auditor'));
create policy "wd_no_direct_write_ins" on public.withdrawal_requests for insert with check (false);
create policy "wd_no_direct_write_upd" on public.withdrawal_requests for update using (false);

-- ── repayment_requests — création + lecture client ────────────────────────────
create policy "rep_client_insert" on public.repayment_requests
  for insert with check (auth.uid() = client_id);
create policy "rep_client_select" on public.repayment_requests
  for select using (auth.uid() = client_id);
create policy "rep_cashier_select" on public.repayment_requests
  for select using (public.auth_role() in ('agent_caisse', 'admin', 'super_admin', 'auditor'));
create policy "rep_no_direct_update" on public.repayment_requests for update using (false);

-- ── notifications — lecture propriétaire ; marquage lu uniquement ─────────────
create policy "notif_select_own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notif_mark_read" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant update (read_at) on public.notifications to authenticated;

-- ── audit_logs (append-only) / notification_templates / loan_products ─────────
-- audit_logs : lecture staff seulement ; INSERT via trigger SECURITY DEFINER ;
-- aucune policy UPDATE/DELETE ⇒ append-only pour les utilisateurs.
create policy "audit_staff_read" on public.audit_logs
  for select using (public.auth_role() in ('admin', 'super_admin', 'auditor'));

create policy "tpl_admin_all" on public.notification_templates
  for all using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));
create policy "tpl_service_read" on public.notification_templates
  for select using (true);

create policy "prod_read_all" on public.loan_products
  for select using (true);
create policy "prod_admin_write" on public.loan_products
  for all using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));
