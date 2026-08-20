begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data)
values ('66666666-6666-6666-6666-666666666666', 'outbox@test.dev', '{"firstname":"Outbox","lastname":"Test"}');
insert into public.notification_outbox (
  id, user_id, event_type, template_slug, language, payload, dedupe_key,
  status, attempts, locked_at
) values (
  '66666666-0000-0000-0000-000000000001',
  '66666666-6666-6666-6666-666666666666',
  'pin_reset_otp', 'pin_reset_otp', 'fr', '{"encrypted_payload":"secret"}', 'lease-test',
  'PROCESSING', 4, now() - interval '16 minutes'
);

select is(
  (select count(*)::integer from public.claim_notification_outbox(1)),
  1,
  'un bail expiré est récupéré et réclamé une cinquième fois'
);
select public.complete_notification_outbox(
  '66666666-0000-0000-0000-000000000001', false, 'TEST_FAILURE'
);
select is(
  (select status from public.notification_outbox where id = '66666666-0000-0000-0000-000000000001'),
  'DEAD_LETTER',
  'le cinquième échec devient terminal'
);
select is(
  (select payload from public.notification_outbox where id = '66666666-0000-0000-0000-000000000001'),
  '{}'::jsonb,
  'le secret OTP est effacé à l’échec terminal'
);
select is(
  (select locked_at from public.notification_outbox where id = '66666666-0000-0000-0000-000000000001'),
  null::timestamptz,
  'le bail est libéré après traitement'
);

select * from finish();
rollback;
