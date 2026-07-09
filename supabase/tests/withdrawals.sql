-- Lot 5 — Tests retraits : réservation, débit, idempotence, plage horaire (pgTAP).

begin;
select plan(15);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('44444444-4444-4444-4444-444444444444', 'dave@test.dev', '{"firstname":"Dave","lastname":"D"}'),
  ('55555555-5555-5555-5555-555555555555', 'eve@test.dev', '{"firstname":"Eve","lastname":"E"}'),
  ('66666666-6666-6666-6666-666666666666', 'frank@test.dev', '{"firstname":"Frank","lastname":"F"}');

-- Dave : épargne libre 30000 + prêt décaissé 20000 (disponible 50000).
update public.wallets set free_savings = 30000, disbursed_loan = 20000
  where client_id = '44444444-4444-4444-4444-444444444444';
update public.wallets set free_savings = 10000
  where client_id = '66666666-6666-6666-6666-666666666666';

-- Plage toujours ouverte pour tester le débit indépendamment de l'heure.
update public.app_settings set withdrawal_window_start = 0, withdrawal_window_end = 24;

-- ── Dave (client) réserve tout le disponible ──────────────────────────────────
select set_config('request.jwt.claims', json_build_object(
  'sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated',
  'app_metadata', json_build_object('user_role', 'client'))::text, true);

select public.create_withdrawal(
  '44444444-4444-4444-4444-444444444444', 'MOBILE_MONEY', 50000,
  '{"name":"Dave","operator":"MTN","phone":"+2250700000000"}'::jsonb);

select is((select reserved_amount from public.wallets where client_id = '44444444-4444-4444-4444-444444444444'),
  50000::bigint, 'réserve exactement le montant demandé');
select is(public.get_available_balance('44444444-4444-4444-4444-444444444444'),
  0::bigint, 'disponible = 0 après réservation');
select throws_ok(
  $$ select public.create_withdrawal('44444444-4444-4444-4444-444444444444', 'MOBILE_MONEY', 1,
       '{"name":"Dave"}'::jsonb) $$,
  NULL, NULL, 'impossible d''engager deux fois la même somme (solde insuffisant)');

-- ── Eve (agent de caisse) exécute ─────────────────────────────────────────────
select set_config('request.jwt.claims', json_build_object(
  'sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated',
  'app_metadata', json_build_object('user_role', 'agent_caisse'))::text, true);

select public.settle_withdrawal(
  (select id from public.withdrawal_requests where client_id = '44444444-4444-4444-4444-444444444444' limit 1),
  'EXECUTE', '55555555-5555-5555-5555-555555555555', 'MTN-REF-123');

select is((select disbursed_loan from public.wallets where client_id = '44444444-4444-4444-4444-444444444444'),
  0::bigint, 'débit du prêt décaissé en PREMIER (20000 → 0)');
select is((select free_savings from public.wallets where client_id = '44444444-4444-4444-4444-444444444444'),
  0::bigint, 'débit de l''épargne libre ENSUITE (30000 → 0)');
select is((select reserved_amount from public.wallets where client_id = '44444444-4444-4444-4444-444444444444'),
  0::bigint, 'réservation levée après exécution');
select is((select status from public.withdrawal_requests where client_id = '44444444-4444-4444-4444-444444444444' limit 1),
  'COMPLETED', 'demande passée à COMPLETED');

-- Idempotence : une demande déjà traitée ne peut pas l'être une seconde fois.
select throws_ok(
  $$ select public.settle_withdrawal(
       (select id from public.withdrawal_requests where client_id = '44444444-4444-4444-4444-444444444444' limit 1),
       'EXECUTE', '55555555-5555-5555-5555-555555555555') $$,
  NULL, NULL, 'exécution idempotente : pas de double débit');

-- ── Plage horaire (prédicat pur) ──────────────────────────────────────────────
select ok(not public.withdrawal_hour_open(7, 8, 19), 'fermé à 7h');
select ok(public.withdrawal_hour_open(8, 8, 19), 'ouvert à 8h');
select ok(public.withdrawal_hour_open(18, 8, 19), 'ouvert à 18h');
select ok(not public.withdrawal_hour_open(19, 8, 19), 'fermé à 19h (borne exclue)');

-- ── Rejet : restitue exactement le réservé, sans débit ────────────────────────
select set_config('request.jwt.claims', json_build_object(
  'sub', '66666666-6666-6666-6666-666666666666', 'role', 'authenticated',
  'app_metadata', json_build_object('user_role', 'client'))::text, true);
select public.create_withdrawal(
  '66666666-6666-6666-6666-666666666666', 'MOBILE_MONEY', 10000, '{"name":"Frank"}'::jsonb);
select is((select reserved_amount from public.wallets where client_id = '66666666-6666-6666-6666-666666666666'),
  10000::bigint, 'Frank : réservation enregistrée');

select set_config('request.jwt.claims', json_build_object(
  'sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated',
  'app_metadata', json_build_object('user_role', 'agent_caisse'))::text, true);
select public.settle_withdrawal(
  (select id from public.withdrawal_requests where client_id = '66666666-6666-6666-6666-666666666666' limit 1),
  'REJECT', '55555555-5555-5555-5555-555555555555', NULL, 'test rejet');

select is((select reserved_amount from public.wallets where client_id = '66666666-6666-6666-6666-666666666666'),
  0::bigint, 'rejet lève la réservation');
select is((select free_savings from public.wallets where client_id = '66666666-6666-6666-6666-666666666666'),
  10000::bigint, 'rejet ne débite pas l''épargne');

reset role;
select * from finish();
rollback;
