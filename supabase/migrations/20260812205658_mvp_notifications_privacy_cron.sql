-- MVP wave 3/4: transactional notifications, daily jobs, privacy and admin KPIs.

alter table public.app_settings add column if not exists default_after_days int not null default 90
  check (default_after_days between 1 and 365);
alter table public.app_settings add column if not exists withdrawal_fee bigint not null default 0
  check (withdrawal_fee >= 0);
alter table public.app_settings add column if not exists transfer_fee bigint not null default 0
  check (transfer_fee >= 0);
alter table public.app_settings add column if not exists kyc_retention_days int not null default 1825
  check (kyc_retention_days >= 1);
alter table public.app_settings add column if not exists audit_retention_days int not null default 3650
  check (audit_retention_days >= 1);
alter table public.audit_logs add column if not exists correlation_id uuid;

grant insert, update on public.loan_products to authenticated;

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  template_slug text not null,
  language text not null default 'fr',
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
  attempts int not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notification_outbox_pending
  on public.notification_outbox (next_attempt_at, created_at)
  where status in ('PENDING', 'FAILED');

alter table public.notification_outbox enable row level security;
create policy "outbox_admin_read" on public.notification_outbox
for select to authenticated
using (public.auth_role() in ('admin', 'super_admin', 'auditor'));
grant select on public.notification_outbox to authenticated;
grant select, insert, update on public.notification_outbox to service_role;

create or replace function public.claim_notification_outbox(p_limit int default 25)
returns setof public.notification_outbox
language sql
security definer
set search_path = ''
as $$
  update public.notification_outbox o
  set status = 'PROCESSING', attempts = attempts + 1
  where o.id in (
    select id from public.notification_outbox
    where status in ('PENDING', 'FAILED') and next_attempt_at <= now()
    order by created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
  )
  returning o.*;
$$;

create or replace function public.complete_notification_outbox(
  p_id uuid,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notification_outbox set
    status = case when p_success then 'SENT' else 'FAILED' end,
    sent_at = case when p_success then now() else null end,
    last_error = case when p_success then null else left(coalesce(p_error, 'SEND_FAILED'), 500) end,
    next_attempt_at = case when p_success then next_attempt_at
      else now() + make_interval(secs => least(3600, (power(2, least(attempts, 10)) * 30)::int)) end,
    payload = case when p_success and template_slug = 'pin_reset_otp' then '{}'::jsonb else payload end
  where id = p_id and status = 'PROCESSING';
end;
$$;

insert into public.notification_templates (slug, language, subject, body_html, variables)
values
  ('kyc_completed', 'fr', 'Votre dossier KYC est validé',
    '<p>Bonjour {{client_firstname}}, votre dossier KYC est validé.</p>', '["client_firstname"]'),
  ('kyc_rejected', 'fr', 'Votre dossier KYC nécessite votre attention',
    '<p>Bonjour {{client_firstname}}, votre dossier KYC a été rejeté. Consultez votre espace.</p>', '["client_firstname"]'),
  ('deposit_confirmed', 'fr', 'Dépôt confirmé',
    '<p>Votre dépôt de {{amount}} FCFA a été confirmé.</p>', '["amount"]'),
  ('deposit_rejected', 'fr', 'Dépôt rejeté',
    '<p>Votre demande de dépôt a été rejetée.</p>', '[]'),
  ('withdrawal_completed', 'fr', 'Retrait exécuté',
    '<p>Votre retrait de {{amount}} FCFA a été exécuté.</p>', '["amount"]'),
  ('withdrawal_rejected', 'fr', 'Retrait rejeté',
    '<p>Votre demande de retrait a été rejetée.</p>', '[]'),
  ('loan_requests_accepted', 'fr', 'Votre prêt est accepté',
    '<p>Votre demande de prêt est acceptée. La garantie peut maintenant être constituée.</p>', '[]'),
  ('loan_requests_disbursed', 'fr', 'Votre prêt est décaissé',
    '<p>Votre prêt de {{amount}} FCFA est décaissé.</p>', '["amount"]'),
  ('repayment_confirmed', 'fr', 'Remboursement confirmé',
    '<p>Votre remboursement de {{amount}} FCFA a été confirmé.</p>', '["amount"]'),
  ('loans_closed', 'fr', 'Votre prêt est terminé',
    '<p>Votre prêt est terminé et vos fonds bloqués sont libérés.</p>', '[]'),
  ('installment_due_soon', 'fr', 'Échéance de prêt dans 3 jours',
    '<p>Une échéance de {{amount}} FCFA arrive le {{due_date}}.</p>', '["amount","due_date"]'),
  ('installment_late', 'fr', 'Échéance de prêt en retard',
    '<p>Une échéance de {{amount}} FCFA est en retard.</p>', '["amount"]'),
  ('pin_reset_otp', 'fr', 'Code de réinitialisation de votre PIN',
    '<p>Votre code de réinitialisation est {{otp}}. Il expire dans 10 minutes.</p>', '["otp"]')
on conflict (slug, language) do nothing;

create or replace function app_private.enqueue_notification(
  p_user uuid,
  p_event text,
  p_title text,
  p_body text,
  p_payload jsonb,
  p_dedupe text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_language text;
begin
  select coalesce(preferred_language, 'fr') into v_language
  from public.profiles where id = p_user;
  insert into public.notifications (user_id, type, title, body, payload)
  values (p_user, upper(p_event), p_title, p_body, coalesce(p_payload, '{}'::jsonb));
  insert into public.notification_outbox (
    user_id, event_type, template_slug, language, payload, dedupe_key
  ) values (
    p_user, p_event, p_event, coalesce(v_language, 'fr'),
    coalesce(p_payload, '{}'::jsonb), p_dedupe
  ) on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function app_private.status_notification_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_status text;
  v_event text;
  v_title text;
  v_body text;
  v_amount bigint;
begin
  if tg_table_name = 'profiles' then
    if new.kyc_status is not distinct from old.kyc_status then return new; end if;
    v_user := new.id;
    v_status := lower(new.kyc_status);
    v_event := 'kyc_' || v_status;
    v_title := case new.kyc_status when 'COMPLETED' then 'KYC validé'
      when 'REJECTED' then 'KYC rejeté' else 'Informations KYC requises' end;
    v_body := 'Le statut de votre dossier KYC a changé.';
  else
    if new.status is not distinct from old.status then return new; end if;
    v_user := new.client_id;
    v_status := lower(new.status::text);
    v_event := tg_table_name || '_' || v_status;
    v_amount := case
      when tg_table_name in ('deposit_requests', 'withdrawal_requests', 'repayment_requests') then new.amount
      when tg_table_name = 'loan_requests' then coalesce(new.approved_amount, new.amount)
      when tg_table_name = 'loans' then new.total_amount
      else null end;
    v_title := case
      when tg_table_name = 'deposit_requests' then 'Mise à jour de votre dépôt'
      when tg_table_name = 'withdrawal_requests' then 'Mise à jour de votre retrait'
      when tg_table_name = 'repayment_requests' then 'Mise à jour de votre remboursement'
      else 'Mise à jour de votre prêt' end;
    v_body := 'Nouveau statut : ' || new.status::text;
  end if;

  perform app_private.enqueue_notification(
    v_user, v_event, v_title, v_body,
    jsonb_strip_nulls(jsonb_build_object(
      'reference', new.id,
      'status', v_status,
      'amount', v_amount
    )),
    tg_table_name || ':' || new.id::text || ':' || v_status
  );
  return new;
end;
$$;

drop trigger if exists trg_profiles_notification on public.profiles;
create trigger trg_profiles_notification after update of kyc_status on public.profiles
for each row execute function app_private.status_notification_trigger();
drop trigger if exists trg_deposits_notification on public.deposit_requests;
create trigger trg_deposits_notification after update of status on public.deposit_requests
for each row execute function app_private.status_notification_trigger();
drop trigger if exists trg_withdrawals_notification on public.withdrawal_requests;
create trigger trg_withdrawals_notification after update of status on public.withdrawal_requests
for each row execute function app_private.status_notification_trigger();
drop trigger if exists trg_repayments_notification on public.repayment_requests;
create trigger trg_repayments_notification after update of status on public.repayment_requests
for each row execute function app_private.status_notification_trigger();
drop trigger if exists trg_loan_requests_notification on public.loan_requests;
create trigger trg_loan_requests_notification after update of status on public.loan_requests
for each row execute function app_private.status_notification_trigger();
drop trigger if exists trg_loans_notification on public.loans;
create trigger trg_loans_notification after update of status on public.loans
for each row execute function app_private.status_notification_trigger();

create table if not exists public.pin_reset_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  otp_hash text not null,
  attempts int not null default 0 check (attempts between 0 and 10),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pin_reset_active on public.pin_reset_challenges (user_id, expires_at desc)
where consumed_at is null;
alter table public.pin_reset_challenges enable row level security;
revoke all on public.pin_reset_challenges from anon, authenticated;
grant select, insert, update on public.pin_reset_challenges to service_role;

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  unique (user_id, policy_version)
);
alter table public.user_consents enable row level security;
create policy "consents_owner_read" on public.user_consents
for select to authenticated using ((select auth.uid()) = user_id);
create policy "consents_owner_insert" on public.user_consents
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "consents_admin_read" on public.user_consents
for select to authenticated using (public.auth_role() in ('admin', 'super_admin', 'auditor'));
grant select, insert on public.user_consents to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, firstname, lastname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'firstname', ''),
    coalesce(new.raw_user_meta_data ->> 'lastname', '')
  );
  insert into public.wallets (client_id) values (new.id);
  if coalesce((new.raw_user_meta_data ->> 'consent_accepted')::boolean, false) then
    insert into public.user_consents (user_id, policy_version)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'privacy_policy_version', ''), 'privacy-v1')
    ) on conflict (user_id, policy_version) do nothing;
  end if;
  return new;
end;
$$;

create table if not exists public.data_erasure_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  reason text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
  processed_by uuid references public.profiles(id),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.data_erasure_requests enable row level security;
create policy "erasure_owner_read" on public.data_erasure_requests
for select to authenticated using ((select auth.uid()) = user_id);
create policy "erasure_owner_insert" on public.data_erasure_requests
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "erasure_admin_read" on public.data_erasure_requests
for select to authenticated using (public.auth_role() in ('admin', 'super_admin', 'auditor'));
grant select, insert on public.data_erasure_requests to authenticated;

create or replace function public.manage_user_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
  v_actor uuid := auth.uid();
begin
  perform app_private.require_active_staff(array['super_admin']);
  if p_role not in ('client', 'agent_credit', 'agent_caisse', 'validator', 'admin', 'super_admin', 'auditor') then
    raise exception using errcode = '22023', message = 'INVALID_ROLE';
  end if;
  select role into v_old from public.profiles where id = p_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'USER_NOT_FOUND'; end if;
  if p_user = v_actor and p_role <> v_old then
    raise exception using errcode = '22023', message = 'CANNOT_CHANGE_OWN_ROLE';
  end if;
  if v_old = 'super_admin' and p_role <> 'super_admin' and (
    select count(*) from public.profiles where role = 'super_admin' and is_active
  ) <= 1 then
    raise exception using errcode = '22023', message = 'LAST_SUPER_ADMIN';
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = p_user;
  delete from auth.sessions where user_id = p_user;
  insert into public.audit_logs (user_id, user_role, action_type, target_id, new_value)
  values (v_actor, 'super_admin', 'ROLE_CHANGED', p_user,
    jsonb_build_object('old_role', v_old, 'role', p_role));
end;
$$;

create or replace function public.manage_user_status(p_user uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_target_role text;
begin
  v_actor_role := app_private.require_active_staff(array['admin', 'super_admin']);
  if p_user = v_actor and not p_active then
    raise exception using errcode = '22023', message = 'CANNOT_DISABLE_SELF';
  end if;
  select role into v_target_role from public.profiles where id = p_user for update;
  if not found then raise exception using errcode = 'P0002', message = 'USER_NOT_FOUND'; end if;
  if v_target_role = 'super_admin' and v_actor_role <> 'super_admin' then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if v_target_role = 'super_admin' and not p_active and (
    select count(*) from public.profiles where role = 'super_admin' and is_active
  ) <= 1 then
    raise exception using errcode = '22023', message = 'LAST_SUPER_ADMIN';
  end if;
  update public.profiles set is_active = p_active, updated_at = now() where id = p_user;
  delete from auth.sessions where user_id = p_user;
  insert into public.audit_logs (user_id, user_role, action_type, target_id, new_value)
  values (
    v_actor, v_actor_role,
    case when p_active then 'ACCOUNT_ENABLED' else 'ACCOUNT_DISABLED' end,
    p_user, jsonb_build_object('is_active', p_active)
  );
end;
$$;

create or replace function public.anonymize_client(p_client uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_active_staff(array['super_admin']);
  if coalesce(trim(p_reason), '') = '' then raise exception using errcode = '22023', message = 'REASON_REQUIRED'; end if;
  if exists (select 1 from public.loans where client_id = p_client and status in ('ACTIVE', 'DEFAULTED')) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_LOAN_EXISTS';
  end if;
  delete from storage.objects where bucket_id in ('kyc-documents', 'deposit-proofs', 'repayment-proofs', 'loan-documents')
    and (storage.foldername(name))[1] = p_client::text;
  update public.profiles set
    firstname = 'Utilisateur', lastname = 'Anonymisé', phone = null, country = null,
    city = null, address = null, profession = null, birth_date = null,
    monthly_income_estimate = null, id_type = null, id_number = null, id_expiry = null,
    pin_hash = null, is_active = false, updated_at = now()
  where id = p_client;
  delete from public.kyc_financials where client_id = p_client;
  delete from public.kyc_documents where client_id = p_client;
  update public.data_erasure_requests set status = 'COMPLETED', processed_by = auth.uid(), processed_at = now()
  where user_id = p_client and status = 'APPROVED';
  insert into public.audit_logs (user_id, user_role, action_type, target_id, reason)
  values (auth.uid(), 'super_admin', 'CLIENT_ANONYMIZED', p_client, trim(p_reason));
end;
$$;

create or replace function public.process_data_erasure(
  p_request uuid,
  p_action text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.data_erasure_requests;
begin
  perform app_private.require_active_staff(array['super_admin']);
  if p_action not in ('REJECT', 'ANONYMIZE') or coalesce(trim(p_reason), '') = '' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  select * into r from public.data_erasure_requests where id = p_request and status = 'PENDING' for update;
  if not found then raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED'; end if;
  if p_action = 'REJECT' then
    update public.data_erasure_requests set
      status = 'REJECTED', processed_by = auth.uid(), processed_at = now(), reason = trim(p_reason)
    where id = r.id;
  else
    update public.data_erasure_requests set status = 'APPROVED' where id = r.id;
    perform public.anonymize_client(r.user_id, trim(p_reason));
  end if;
end;
$$;

create or replace function public.get_admin_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_active_staff(
    array['agent_credit', 'agent_caisse', 'validator', 'admin', 'super_admin', 'auditor']
  );
  return jsonb_build_object(
    'clients', (select count(*) from public.profiles where role = 'client'),
    'kycPending', (select count(*) from public.profiles where kyc_status in ('PENDING', 'IN_REVIEW')),
    'kycCompleted', (select count(*) from public.profiles where kyc_status = 'COMPLETED'),
    'loanRequestsPending', (select count(*) from public.loan_requests where status in ('SUBMITTED', 'IN_ANALYSIS', 'PRE_APPROVED')),
    'activeLoans', (select count(*) from public.loans where status = 'ACTIVE'),
    'lateLoans', (select count(distinct loan_id) from public.amortization_schedules where status = 'LATE'),
    'pendingDeposits', (select count(*) from public.deposit_requests where status = 'PENDING'),
    'pendingWithdrawals', (select count(*) from public.withdrawal_requests where status = 'PENDING'),
    'pendingRepayments', (select count(*) from public.repayment_requests where status = 'PENDING'),
    'totalDisbursed', (select coalesce(sum(total_amount), 0) from public.loans),
    'totalRepaid', (select coalesce(sum(amount), 0) from public.repayment_requests where status = 'CONFIRMED')
  );
end;
$$;

create or replace function app_private.run_daily_loan_jobs()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_default_days int;
begin
  update public.amortization_schedules set status = 'LATE', updated_at = now()
  where due_date < current_date and status in ('PENDING', 'PARTIAL');

  update public.amortization_schedules s set
    penalty_accrued = s.penalty_accrued + round(
      greatest(
        (s.due_principal - s.paid_principal)
        + (s.due_interest - s.paid_interest)
        + (s.due_fees - s.paid_fees), 0
      ) * coalesce(p.late_penalty_rate, 0) / 100
        * greatest(
          current_date - greatest(coalesce(s.penalty_last_accrued_on, s.due_date), s.due_date),
          0
        )
    )::bigint,
    penalty_last_accrued_on = current_date,
    updated_at = now()
  from public.loans l
  join public.loan_requests lr on lr.id = l.request_id
  join public.loan_products p on p.id = lr.product_id
  where s.loan_id = l.id and s.status = 'LATE'
    and (s.penalty_last_accrued_on is null or s.penalty_last_accrued_on < current_date);

  select default_after_days into v_default_days from public.app_settings where id;
  update public.loans l set status = 'DEFAULTED'
  where l.status = 'ACTIVE' and exists (
    select 1 from public.amortization_schedules s
    where s.loan_id = l.id and s.status = 'LATE'
      and s.due_date <= current_date - v_default_days
  );

  for r in
    select s.id, l.client_id, s.due_date,
      greatest(s.total_due + s.penalty_accrued
        - s.paid_principal - s.paid_interest - s.paid_fees
        - s.paid_mandatory_savings - s.paid_penalty, 0) amount
    from public.amortization_schedules s
    join public.loans l on l.id = s.loan_id
    where l.status in ('ACTIVE', 'DEFAULTED') and (
      s.due_date = current_date + 3 or (s.status = 'LATE' and s.due_date = current_date - 1)
    )
  loop
    perform app_private.enqueue_notification(
      r.client_id,
      case when r.due_date >= current_date then 'installment_due_soon' else 'installment_late' end,
      case when r.due_date >= current_date then 'Échéance proche' else 'Échéance en retard' end,
      case when r.due_date >= current_date then 'Une échéance arrive dans 3 jours.' else 'Une échéance est en retard.' end,
      jsonb_build_object('schedule_id', r.id, 'due_date', r.due_date, 'amount', r.amount),
      'schedule:' || r.id::text || ':' || case when r.due_date >= current_date then 'due-soon' else 'late' end
    );
  end loop;
end;
$$;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
do $$
declare v_job bigint;
begin
  for v_job in select jobid from cron.job where jobname = 'daily-loan-maintenance' loop
    perform cron.unschedule(v_job);
  end loop;
  perform cron.schedule(
    'daily-loan-maintenance',
    '15 2 * * *',
    'select app_private.run_daily_loan_jobs()'
  );
  for v_job in select jobid from cron.job where jobname = 'notification-outbox-dispatch' loop
    perform cron.unschedule(v_job);
  end loop;
  perform cron.schedule(
    'notification-outbox-dispatch',
    '*/5 * * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
          || '/functions/v1/send-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-outbox-dispatch-secret',
          (select decrypted_secret from vault.decrypted_secrets where name = 'outbox_dispatch_secret')
        ),
        body := '{}'::jsonb
      );
    $job$
  );
end;
$$;

grant execute on function public.manage_user_role(uuid, text) to authenticated;
grant execute on function public.manage_user_status(uuid, boolean) to authenticated;
grant execute on function public.anonymize_client(uuid, text) to authenticated;
grant execute on function public.process_data_erasure(uuid, text, text) to authenticated;
grant execute on function public.get_admin_kpis() to authenticated;
grant execute on function public.claim_notification_outbox(int) to service_role;
grant execute on function public.complete_notification_outbox(uuid, boolean, text) to service_role;
