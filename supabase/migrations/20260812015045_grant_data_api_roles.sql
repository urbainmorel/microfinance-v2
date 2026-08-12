-- Grants explicites pour les rôles Data API.
-- RLS filtre les lignes; ces grants contrôlent l'accès aux tables exposées.

grant usage on schema public to authenticated;

grant select on public.profiles to authenticated;
grant select on public.kyc_documents to authenticated;
grant insert, update, delete on public.kyc_documents to authenticated;
grant select, insert, update on public.kyc_financials to authenticated;
grant select on public.wallets to authenticated;
grant select on public.loan_products to authenticated;
grant select, insert on public.loan_requests to authenticated;
grant select on public.loans to authenticated;
grant select on public.amortization_schedules to authenticated;
grant select, insert on public.deposit_requests to authenticated;
grant select on public.withdrawal_requests to authenticated;
grant select, insert on public.repayment_requests to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.notification_templates to authenticated;
grant select on public.audit_logs to authenticated;
