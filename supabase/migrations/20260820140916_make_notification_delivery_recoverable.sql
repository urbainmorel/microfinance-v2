alter table public.notification_outbox add column if not exists locked_at timestamptz;
alter table public.notification_outbox drop constraint if exists notification_outbox_status_check;
alter table public.notification_outbox
  add constraint notification_outbox_status_check
  check (status in ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTER'));

create or replace function public.claim_notification_outbox(p_limit integer default 25)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Un worker interrompu perd son bail après 15 minutes et la ligne redevient éligible.
  update public.notification_outbox
  set status = case when attempts >= 5 then 'DEAD_LETTER' else 'FAILED' end,
      locked_at = null,
      next_attempt_at = now(),
      last_error = 'WORKER_LEASE_EXPIRED',
      payload = case
        when attempts >= 5 and template_slug = 'pin_reset_otp' then '{}'::jsonb
        else payload
      end
  where status = 'PROCESSING' and locked_at < now() - interval '15 minutes';

  return query
  update public.notification_outbox o
  set status = 'PROCESSING', attempts = o.attempts + 1, locked_at = now()
  where o.id in (
    select id from public.notification_outbox
    where status in ('PENDING', 'FAILED') and next_attempt_at <= now() and attempts < 5
    order by created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
  )
  returning o.*;
end;
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
    status = case
      when p_success then 'SENT'
      when attempts >= 5 then 'DEAD_LETTER'
      else 'FAILED'
    end,
    sent_at = case when p_success then now() else null end,
    locked_at = null,
    last_error = case when p_success then null else left(coalesce(p_error, 'SEND_FAILED'), 500) end,
    next_attempt_at = case
      when p_success or attempts >= 5 then next_attempt_at
      else now() + make_interval(secs => least(3600, (power(2, least(attempts, 10)) * 30)::int))
    end,
    payload = case
      when template_slug = 'pin_reset_otp' and (p_success or attempts >= 5) then '{}'::jsonb
      else payload
    end
  where id = p_id and status = 'PROCESSING';
end;
$$;

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

  -- Un événement sans modèle reste visible dans l'application mais ne pollue pas l'outbox.
  if exists (
    select 1 from public.notification_templates
    where slug = p_event and language in (coalesce(v_language, 'fr'), 'fr')
  ) then
    insert into public.notification_outbox (
      user_id, event_type, template_slug, language, payload, dedupe_key
    ) values (
      p_user, p_event, p_event, coalesce(v_language, 'fr'),
      coalesce(p_payload, '{}'::jsonb), p_dedupe
    ) on conflict (dedupe_key) do nothing;
  end if;
end;
$$;

update public.notification_templates
set body_html = '<p>Votre dossier KYC est validé.</p>', variables = '[]'::jsonb
where slug = 'kyc_completed' and language = 'fr';
update public.notification_templates
set body_html = '<p>Votre dossier KYC a été rejeté. Consultez votre espace.</p>',
    variables = '[]'::jsonb
where slug = 'kyc_rejected' and language = 'fr';

create or replace function public.run_daily_loan_jobs()
returns void
language sql
security definer
set search_path = ''
as $$
  select app_private.run_daily_loan_jobs();
$$;

revoke all on function public.claim_notification_outbox(integer) from public, anon, authenticated;
revoke all on function public.complete_notification_outbox(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.run_daily_loan_jobs() from public, anon, authenticated;
grant execute on function public.claim_notification_outbox(integer) to service_role;
grant execute on function public.complete_notification_outbox(uuid, boolean, text) to service_role;
grant execute on function public.run_daily_loan_jobs() to service_role;
revoke all on function app_private.enqueue_notification(uuid, text, text, text, jsonb, text)
from public, anon, authenticated;
