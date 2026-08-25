-- Supabase Advisor: pin every legacy function search_path.
alter function public.withdrawal_hour_open(integer, integer, integer) set search_path = '';
alter function public.amortization_rows(bigint, numeric, integer, text) set search_path = '';
alter function public.set_updated_at() set search_path = '';
alter function public.get_available_balance(uuid) set search_path = '';
alter function public.guard_privileged_columns() set search_path = '';
alter function public.get_wallet_summary(uuid) set search_path = '';

-- One SELECT policy per table: owner access OR the single active global admin.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_staff_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.auth_role()) = 'admin');

drop policy if exists "wallets_select_own" on public.wallets;
drop policy if exists "wallets_staff_read" on public.wallets;
create policy "wallets_read" on public.wallets for select to authenticated
using (client_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

drop policy if exists "kyc_docs_client_select" on public.kyc_documents;
drop policy if exists "kyc_docs_staff_read" on public.kyc_documents;
create policy "kyc_documents_read" on public.kyc_documents for select to authenticated
using (client_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

drop policy if exists "kyc_fin_client_select" on public.kyc_financials;
drop policy if exists "kyc_fin_staff_read" on public.kyc_financials;
create policy "kyc_financials_read" on public.kyc_financials for select to authenticated
using (client_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

drop policy if exists "lr_client_select" on public.loan_requests;
drop policy if exists "lr_staff_select" on public.loan_requests;
create policy "loan_requests_read" on public.loan_requests for select to authenticated
using (client_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

drop policy if exists "loans_client_select" on public.loans;
drop policy if exists "loans_staff_select" on public.loans;
create policy "loans_read" on public.loans for select to authenticated
using (client_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

drop policy if exists "amort_client_select" on public.amortization_schedules;
drop policy if exists "amort_staff_select" on public.amortization_schedules;
create policy "amortization_schedules_read" on public.amortization_schedules
for select to authenticated using (
  (select public.auth_role()) = 'admin' or exists (
    select 1 from public.loans l
    where l.id = amortization_schedules.loan_id
      and l.client_id = (select auth.uid())
  )
);

drop policy if exists "dep_client_select" on public.deposit_requests;
drop policy if exists "dep_cashier_select" on public.deposit_requests;
create policy "deposit_requests_read" on public.deposit_requests for select to authenticated
using (client_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

drop policy if exists "wd_client_select" on public.withdrawal_requests;
drop policy if exists "wd_staff_select" on public.withdrawal_requests;
create policy "withdrawal_requests_read" on public.withdrawal_requests for select to authenticated
using (client_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

drop policy if exists "rep_client_select" on public.repayment_requests;
drop policy if exists "rep_cashier_select" on public.repayment_requests;
create policy "repayment_requests_read" on public.repayment_requests for select to authenticated
using (client_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

drop policy if exists "loan_docs_owner_read" on public.loan_request_documents;
drop policy if exists "loan_docs_staff_read" on public.loan_request_documents;
create policy "loan_request_documents_read" on public.loan_request_documents
for select to authenticated
using (client_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

drop policy if exists "loan_contract_client_select" on public.loan_contracts;
drop policy if exists "loan_contract_admin_select" on public.loan_contracts;
create policy "loan_contracts_read" on public.loan_contracts for select to authenticated
using (client_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

drop policy if exists "erasure_owner_read" on public.data_erasure_requests;
drop policy if exists "erasure_admin_read" on public.data_erasure_requests;
create policy "data_erasure_requests_read" on public.data_erasure_requests
for select to authenticated
using (user_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

drop policy if exists "consents_owner_read" on public.user_consents;
drop policy if exists "consents_admin_read" on public.user_consents;
create policy "user_consents_read" on public.user_consents for select to authenticated
using (user_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

-- Prevent per-row re-evaluation on the remaining owner policies.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "kyc_fin_client_insert" on public.kyc_financials;
create policy "kyc_fin_client_insert" on public.kyc_financials for insert to authenticated
with check (client_id = (select auth.uid()));

drop policy if exists "kyc_fin_client_update" on public.kyc_financials;
create policy "kyc_fin_client_update" on public.kyc_financials for update to authenticated
using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

drop policy if exists "notif_select_own" on public.notifications;
create policy "notif_select_own" on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "notif_mark_read" on public.notifications;
create policy "notif_mark_read" on public.notifications for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ALL policies also participate in SELECT; split them to preserve writes without overlap.
drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_insert" on public.app_settings for insert to authenticated
with check ((select public.auth_role()) = 'admin');
create policy "app_settings_admin_update" on public.app_settings for update to authenticated
using ((select public.auth_role()) = 'admin') with check ((select public.auth_role()) = 'admin');
create policy "app_settings_admin_delete" on public.app_settings for delete to authenticated
using ((select public.auth_role()) = 'admin');

drop policy if exists "prod_admin_write" on public.loan_products;
create policy "prod_admin_insert" on public.loan_products for insert to authenticated
with check ((select public.auth_role()) = 'admin');
create policy "prod_admin_update" on public.loan_products for update to authenticated
using ((select public.auth_role()) = 'admin') with check ((select public.auth_role()) = 'admin');
create policy "prod_admin_delete" on public.loan_products for delete to authenticated
using ((select public.auth_role()) = 'admin');

drop policy if exists "tpl_admin_all" on public.notification_templates;
create policy "tpl_admin_insert" on public.notification_templates for insert to authenticated
with check ((select public.auth_role()) = 'admin');
create policy "tpl_admin_update" on public.notification_templates for update to authenticated
using ((select public.auth_role()) = 'admin') with check ((select public.auth_role()) = 'admin');
create policy "tpl_admin_delete" on public.notification_templates for delete to authenticated
using ((select public.auth_role()) = 'admin');
