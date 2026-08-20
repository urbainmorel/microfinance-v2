-- Lot 1 — Tests de sécurité RLS (pgTAP). Exécution : `supabase test db`.
-- Prouve les invariants : un client ne peut ni écrire un wallet, ni changer son rôle,
-- ni lire les données d'autrui (ROADMAP Lot 1, Specs §C, invariants 2 & 4).

begin;
select plan(16);

-- Deux clients de test. Le trigger on_auth_user_created crée profiles + wallets.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.dev', '{"firstname":"Alice","lastname":"A"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.dev', '{"firstname":"Bob","lastname":"B"}');

-- Ensemencement des soldes en tant que postgres (hors RLS, écriture directe autorisée).
update public.wallets set free_savings = 50000 where client_id = '11111111-1111-1111-1111-111111111111';
update public.wallets set free_savings = 99000 where client_id = '22222222-2222-2222-2222-222222222222';

-- ── Contexte : Alice, cliente authentifiée ────────────────────────────────────
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '11111111-1111-1111-1111-111111111111',
    'role', 'authenticated',
    'app_metadata', json_build_object('user_role', 'client')
  )::text,
  true
);

-- 1. auth.uid() identifie bien Alice.
select is(
  (select auth.uid()),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'auth.uid() renvoie l''utilisateur courant'
);

-- 2. Alice lit son propre solde.
select is(
  (select free_savings from public.wallets where client_id = auth.uid()),
  50000::bigint,
  'un client lit son propre wallet'
);

-- 3. Alice ne peut pas lire le wallet d'autrui (RLS).
select is_empty(
  $$ select 1 from public.wallets where client_id = '22222222-2222-2222-2222-222222222222' $$,
  'un client ne peut pas lire le wallet d''autrui'
);

-- 4. Alice ne peut pas lire le profil d'autrui (RLS).
select is_empty(
  $$ select 1 from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  'un client ne peut pas lire le profil d''autrui'
);

-- 5. Écriture directe du wallet sans effet : RLS USING(false) ⇒ 0 ligne, pas de mouvement.
update public.wallets set free_savings = free_savings + 1000000 where client_id = auth.uid();
select is(
  (select free_savings from public.wallets where client_id = auth.uid()),
  50000::bigint,
  'écriture directe du wallet interdite (aucun mouvement)'
);

-- 6. Élévation de privilège interdite : un client ne peut pas changer son rôle.
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = auth.uid() $$,
  NULL,
  NULL,
  'un client ne peut pas modifier son rôle'
);

-- 7. Insertion directe d'un wallet interdite (WITH CHECK false).
select throws_ok(
  $$ insert into public.wallets (client_id) values (auth.uid()) $$,
  NULL,
  NULL,
  'insertion directe d''un wallet interdite'
);

-- 8–10. Aucun secret PIN ne demeure dans le profil exposé par la Data API.
select hasnt_column('public', 'profiles', 'pin_hash', 'profiles ne publie pas le hash PIN');
select hasnt_column('public', 'profiles', 'pin_attempts', 'profiles ne publie pas les tentatives PIN');
select hasnt_column('public', 'profiles', 'pin_locked_until', 'profiles ne publie pas le verrouillage PIN');

-- 11. Le schéma privé n'est pas accessible à un client authentifié.
select throws_ok(
  $$ select * from app_private.user_pin_security $$,
  '42501',
  null,
  'un client ne peut pas lire la sécurité PIN privée'
);

-- 12. La RPC qui révèle le hash est réservée à la service_role.
select throws_ok(
  $$ select * from public.get_pin_security_for_verification(auth.uid()) $$,
  '42501',
  null,
  'un client ne peut pas appeler la RPC de vérification PIN'
);

-- 13. L'onboarding ne révèle qu'un état booléen avant configuration.
select is(
  (select pin_set from public.get_onboarding_state()),
  false,
  'onboarding indique que le PIN est absent sans exposer de secret'
);

-- 14–15. Même un compte applicatif authentifié ne lit ni ne réserve l'outbox.
select throws_ok(
  $$ select * from public.notification_outbox $$,
  '42501',
  null,
  'un compte authentifié ne peut pas lire l''outbox'
);
select throws_ok(
  $$ select * from public.claim_notification_outbox(1) $$,
  '42501',
  null,
  'un compte authentifié ne peut pas réserver l''outbox'
);

reset role;

-- Appel backend simulé : création atomique du premier hash.
select public.set_initial_pin_hash(
  '11111111-1111-1111-1111-111111111111',
  '$2a$12$012345678901234567890u012345678901234567890123456789012'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '11111111-1111-1111-1111-111111111111',
    'role', 'authenticated',
    'app_metadata', json_build_object('user_role', 'client')
  )::text,
  true
);

-- 16. Après configuration, seul le booléen change pour le client.
select is(
  (select pin_set from public.get_onboarding_state()),
  true,
  'onboarding indique que le PIN est configuré'
);

reset role;
select * from finish();
rollback;
