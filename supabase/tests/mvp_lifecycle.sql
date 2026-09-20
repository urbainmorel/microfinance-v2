-- MVP waves 0-4: privileges, RBAC and financial lifecycle invariants (pgTAP).

begin;
delete from public.loan_products;
select plan(95);

create temporary table mvp_test_state (
  name text primary key,
  id uuid,
  amount bigint
) on commit drop;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'mvp-deposit@test.dev', '{"firstname":"Depot","lastname":"Client"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'mvp-cashier@test.dev', '{"firstname":"Cashier","lastname":"Agent"}'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'mvp-withdrawal@test.dev', '{"firstname":"Withdrawal","lastname":"Client"}'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'mvp-loan@test.dev', '{"firstname":"Loan","lastname":"Client"}'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'mvp-cron@test.dev', '{"firstname":"Cron","lastname":"Client"}');

select set_config('app.privileged', 'on', true);
update public.profiles
set kyc_status = 'COMPLETED'
where id in (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000005'
);

update public.profiles
set role = 'admin', is_active = true
where id = 'aaaaaaaa-0000-0000-0000-000000000002';
select set_config('app.privileged', 'off', true);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"user_role":"admin"}}';
select lives_ok(
  $$ select public.get_admin_kpis() $$,
  'les indicateurs admin restent compatibles avec le verrou de controle d acces'
);

select ok(
  not exists(select 1 from public.profiles where role not in ('client', 'admin')),
  'seuls les roles client et admin existent dans les profils'
);
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"user_role":"auditor"}}';
select is(public.auth_role(), 'client', 'un ancien role JWT ne donne aucun acces interne');
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"user_role":"admin"}}';
select is(public.auth_role(), 'admin', 'le chef agence porte le role admin');
select is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', 'aaaaaaaa-0000-0000-0000-000000000001',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb)
    )
  ) -> 'claims' -> 'app_metadata' ->> 'user_role',
  'client',
  'le hook emet client pour un profil client'
);
select is(
  (public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', 'aaaaaaaa-0000-0000-0000-000000000001',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb)
    )
  ) -> 'claims' -> 'app_metadata' ->> 'account_active')::boolean,
  true,
  'le hook marque un client actif'
);
select is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', 'aaaaaaaa-0000-0000-0000-000000000002',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb)
    )
  ) -> 'claims' -> 'app_metadata' ->> 'user_role',
  'admin',
  'le hook emet admin uniquement pour le chef agence actif'
);
select is(
  (public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', 'aaaaaaaa-0000-0000-0000-000000000002',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb)
    )
  ) -> 'claims' -> 'app_metadata' ->> 'account_active')::boolean,
  true,
  'le hook marque le chef agence actif'
);
select ok(
  to_regclass('public.one_active_admin') is not null,
  'un seul chef agence peut etre administrateur actif'
);

update public.wallets
set free_savings = case client_id
  when 'aaaaaaaa-0000-0000-0000-000000000003' then 10000
  when 'aaaaaaaa-0000-0000-0000-000000000004' then 2000
  else 0
end
where client_id in (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000004'
);

insert into public.loan_products (
  id, name, min_amount, max_amount, min_duration_months, max_duration_months,
  interest_rate, interest_method, guarantee_rate, mandatory_savings_rate,
  late_penalty_rate, is_active
)
values
  (
    'bbbbbbbb-0000-0000-0000-000000000001', 'MVP annuites', 10000, 500000,
    1, 24, 18, 'CONSTANT_INSTALLMENT', 10, 5, 1, true
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002', 'MVP annuites sans garantie', 10000, 500000,
    1, 24, 12, 'CONSTANT_INSTALLMENT', 0, 0, 1, true
  );

insert into storage.objects (bucket_id, name, owner_id, metadata)
values
  ('deposit-proofs', 'aaaaaaaa-0000-0000-0000-000000000001/deposit-proof.pdf', 'aaaaaaaa-0000-0000-0000-000000000001', '{"size":1024,"mimetype":"application/pdf"}'),
  ('deposit-proofs', 'aaaaaaaa-0000-0000-0000-000000000001/deposit-cancel.pdf', 'aaaaaaaa-0000-0000-0000-000000000001', '{"size":1024,"mimetype":"application/pdf"}'),
  ('deposit-proofs', 'aaaaaaaa-0000-0000-0000-000000000004/guarantee-proof.pdf', 'aaaaaaaa-0000-0000-0000-000000000004', '{"size":1024,"mimetype":"application/pdf"}'),
  ('repayment-proofs', 'aaaaaaaa-0000-0000-0000-000000000004/repayment-partial.pdf', 'aaaaaaaa-0000-0000-0000-000000000004', '{"size":1024,"mimetype":"application/pdf"}'),
  ('repayment-proofs', 'aaaaaaaa-0000-0000-0000-000000000004/repayment-overpay.pdf', 'aaaaaaaa-0000-0000-0000-000000000004', '{"size":1024,"mimetype":"application/pdf"}'),
  ('repayment-proofs', 'aaaaaaaa-0000-0000-0000-000000000004/repayment-exact.pdf', 'aaaaaaaa-0000-0000-0000-000000000004', '{"size":1024,"mimetype":"application/pdf"}');

insert into public.loan_requests (
  id, client_id, product_id, amount, duration_months, purpose,
  requested_disbursement_method, status
)
values (
  'cccccccc-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000004',
  'bbbbbbbb-0000-0000-0000-000000000001',
  100000, 4, 'Test MVP', 'INTERNAL', 'SUBMITTED'
);

-- Surface EXECUTE: browser clients cannot call privileged creation RPCs.
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_deposit_request(uuid,bigint,text,text,text,text,uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated ne peut pas executer create_deposit_request'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.create_deposit_request(uuid,bigint,text,text,text,text,uuid,uuid)',
    'EXECUTE'
  ),
  'service_role peut executer create_deposit_request'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_client_withdrawal(uuid,text,bigint,jsonb,uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated ne peut pas executer create_client_withdrawal'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.create_client_withdrawal(uuid,text,bigint,jsonb,uuid,uuid)',
    'EXECUTE'
  ),
  'service_role peut executer create_client_withdrawal'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_loan_request(uuid,uuid,bigint,integer,text,bigint,text,jsonb,uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated ne peut pas executer create_loan_request'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.create_loan_request(uuid,uuid,bigint,integer,text,bigint,text,jsonb,uuid,uuid)',
    'EXECUTE'
  ),
  'service_role peut executer create_loan_request'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_repayment_request(uuid,uuid,bigint,text,text,text,uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated ne peut pas executer create_repayment_request'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.create_repayment_request(uuid,uuid,bigint,text,text,text,uuid,uuid)',
    'EXECUTE'
  ),
  'service_role peut executer create_repayment_request'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.cancel_client_request(uuid,text,uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated ne peut pas executer cancel_client_request'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.cancel_client_request(uuid,text,uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'service_role peut executer cancel_client_request'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.process_guarantee_blocking(uuid,uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated ne peut pas executer process_guarantee_blocking'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.process_guarantee_blocking(uuid,uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'service_role peut executer process_guarantee_blocking'
);

select ok(
  exists(select 1 from pg_constraint where conname = 'loan_products_valid_durations'),
  'les durees des produits sont contraintes en base'
);
select ok(
  exists(select 1 from pg_constraint where conname = 'loan_products_valid_rates'),
  'les taux et frais proportionnels sont contraints en base'
);
select ok(
  to_regclass('public.one_live_loan_per_client') is not null,
  'un client ne peut avoir qu un pret ACTIVE ou DEFAULTED'
);
select ok(
  to_regprocedure('public.manage_user_role(uuid,text)') is null,
  'aucune RPC de changement de role n est exposee'
);
select ok(
  position(
    'delete from auth.sessions' in lower(
      pg_get_functiondef('public.manage_user_status(uuid,boolean)'::regprocedure)
    )
  ) > 0,
  'un changement de statut revoque les sessions de la cible'
);
select ok(
  not exists(
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('deposit_proofs_owner_update', 'deposit_proofs_owner_delete')
  ),
  'les preuves de depot ne sont ni modifiables ni supprimables par le client'
);
select ok(
  not exists(
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('repayment_proofs_owner_update', 'repayment_proofs_owner_delete')
  ),
  'les preuves de remboursement ne sont ni modifiables ni supprimables par le client'
);

-- Staff RPCs ignore a forged/stale JWT role and reload the profile from the database.
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"user_role":"super_admin"}}';

select throws_ok(
  $$ select public.confirm_deposit('ffffffff-0000-0000-0000-000000000001', 'CONFIRM', null) $$,
  '42501', 'FORBIDDEN', 'confirm_deposit refuse le role client'
);
select throws_ok(
  $$ select public.settle_withdrawal('ffffffff-0000-0000-0000-000000000002', 'REJECT', null, 'refus') $$,
  '42501', 'FORBIDDEN', 'settle_withdrawal refuse le role client'
);
select throws_ok(
  $$ select public.review_kyc('aaaaaaaa-0000-0000-0000-000000000003', 'VALIDATE', null) $$,
  '42501', 'FORBIDDEN', 'review_kyc refuse le role client'
);
select throws_ok(
  $$ select public.transition_loan_request(
       'cccccccc-0000-0000-0000-000000000001', 'ANALYZE', null, null
     ) $$,
  '42501', 'FORBIDDEN', 'transition_loan_request refuse le role client en base'
);
select throws_ok(
  $$ select public.disburse_loan('cccccccc-0000-0000-0000-000000000001', null) $$,
  '42501', 'FORBIDDEN', 'disburse_loan refuse le role client'
);
select throws_ok(
  $$ select public.confirm_repayment('ffffffff-0000-0000-0000-000000000003', 'CONFIRM', null) $$,
  '42501', 'FORBIDDEN', 'confirm_repayment refuse le role client'
);

-- Deposit creation and confirmation are idempotent.
insert into mvp_test_state (name, id)
values (
  'deposit',
  public.create_deposit_request(
    'aaaaaaaa-0000-0000-0000-000000000001', 5000, 'FREE_SAVINGS', 'CASH',
    'DEP-001', 'aaaaaaaa-0000-0000-0000-000000000001/deposit-proof.pdf',
    '11111111-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000002'
  )
);
select is(
  public.create_deposit_request(
    'aaaaaaaa-0000-0000-0000-000000000001', 5000, 'FREE_SAVINGS', 'CASH',
    'DEP-001', 'aaaaaaaa-0000-0000-0000-000000000001/deposit-proof.pdf',
    '11111111-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000002'
  ),
  (select id from mvp_test_state where name = 'deposit'),
  'une meme cle de depot retourne le meme identifiant'
);
select is(
  (select count(*)::bigint from public.deposit_requests
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1::bigint,
  'la creation idempotente ne produit qu un depot'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"user_role":"admin"}}';
select lives_ok(
  $$ select public.confirm_deposit(
       (select id from mvp_test_state where name = 'deposit'), 'CONFIRM', null
     ) $$,
  'la premiere confirmation du depot reussit'
);
select throws_ok(
  $$ select public.confirm_deposit(
       (select id from mvp_test_state where name = 'deposit'), 'CONFIRM', null
     ) $$,
  'P0001', 'ALREADY_PROCESSED', 'une seconde confirmation est refusee'
);
select is(
  (select free_savings from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  5000::bigint,
  'la confirmation idempotente credite le wallet une seule fois'
);

insert into mvp_test_state (name, id)
values (
  'deposit_cancel',
  public.create_deposit_request(
    'aaaaaaaa-0000-0000-0000-000000000001', 2000, 'FREE_SAVINGS', 'CASH',
    'DEP-CANCEL', 'aaaaaaaa-0000-0000-0000-000000000001/deposit-cancel.pdf',
    '11111111-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000004'
  )
);
select is(
  public.cancel_client_request(
    'aaaaaaaa-0000-0000-0000-000000000001', 'deposit',
    (select id from mvp_test_state where name = 'deposit_cancel'),
    '11111111-0000-0000-0000-000000000005',
    '11111111-0000-0000-0000-000000000006'
  ),
  (select id from mvp_test_state where name = 'deposit_cancel'),
  'la premiere annulation retourne la demande'
);
select is(
  public.cancel_client_request(
    'aaaaaaaa-0000-0000-0000-000000000001', 'deposit',
    (select id from mvp_test_state where name = 'deposit_cancel'),
    '11111111-0000-0000-0000-000000000005',
    '11111111-0000-0000-0000-000000000007'
  ),
  (select id from mvp_test_state where name = 'deposit_cancel'),
  'le rejeu de l annulation retourne le resultat stable'
);
select is(
  (select status from public.deposit_requests
   where id = (select id from mvp_test_state where name = 'deposit_cancel')),
  'CANCELLED',
  'le rejeu ne modifie pas le resultat de l annulation'
);

-- Competing withdrawals cannot reserve more than the available balance.
insert into mvp_test_state (name, id)
values (
  'withdrawal',
  public.create_client_withdrawal(
    'aaaaaaaa-0000-0000-0000-000000000003', 'MOBILE_MONEY', 7000,
    '{"name":"Withdrawal Client","operator":"MTN","phone":"+2250700000000"}'::jsonb,
    '22222222-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000002'
  )
);
select is(
  public.create_client_withdrawal(
    'aaaaaaaa-0000-0000-0000-000000000003', 'MOBILE_MONEY', 7000,
    '{"name":"Withdrawal Client","operator":"MTN","phone":"+2250700000000"}'::jsonb,
    '22222222-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000002'
  ),
  (select id from mvp_test_state where name = 'withdrawal'),
  'une meme cle de retrait retourne le meme identifiant'
);
select is(
  (select reserved_amount from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  7000::bigint,
  'le rejeu ne reserve pas une seconde fois'
);
select throws_ok(
  $$ select public.create_client_withdrawal(
       'aaaaaaaa-0000-0000-0000-000000000003', 'MOBILE_MONEY', 4000,
       '{"name":"Withdrawal Client"}'::jsonb,
       '22222222-0000-0000-0000-000000000003',
       '22222222-0000-0000-0000-000000000004'
     ) $$,
  'P0001', 'INSUFFICIENT_FUNDS', 'une demande concurrente excedant le reliquat est refusee'
);
select ok(
  (select reserved_amount <= free_savings + disbursed_loan
   from public.wallets where client_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'les reservations ne depassent jamais le solde brut'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"user_role":"admin"}}';
select lives_ok(
  $$ select public.settle_withdrawal(
       (select id from mvp_test_state where name = 'withdrawal'), 'REJECT', null, 'controle QA'
     ) $$,
  'le rejet du retrait reussit'
);
select is(
  (select reserved_amount from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  0::bigint,
  'le rejet restitue exactement le montant reserve'
);
select is(
  (select free_savings from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  10000::bigint,
  'le rejet ne debite pas l epargne'
);

-- Loan simulations cover both interest methods and preserve principal exactly.
select is(
  public.simulate_loan(
    'bbbbbbbb-0000-0000-0000-000000000001', 100000, 4, date '2026-01-01'
  ) ->> 'interestMethod',
  'CONSTANT_INSTALLMENT',
  'la simulation annuites utilise la methode configuree'
);
select is(
  (select sum((row ->> 'principal')::bigint)::bigint
   from jsonb_array_elements(
     public.simulate_loan(
       'bbbbbbbb-0000-0000-0000-000000000001', 100000, 4, date '2026-01-01'
     ) -> 'schedule'
   ) row),
  100000::bigint,
  'la simulation annuites conserve exactement le capital'
);
select is(
  public.simulate_loan(
    'bbbbbbbb-0000-0000-0000-000000000002', 120000, 4, date '2026-01-01'
  ) ->> 'interestMethod',
  'CONSTANT_INSTALLMENT',
  'la seconde simulation utilise aussi les mensualites constantes'
);
select is(
  (select sum((row ->> 'principal')::bigint)::bigint
   from jsonb_array_elements(
     public.simulate_loan(
       'bbbbbbbb-0000-0000-0000-000000000002', 120000, 4, date '2026-01-01'
     ) -> 'schedule'
   ) row),
  120000::bigint,
  'la seconde simulation conserve exactement le capital'
);

-- Partial guarantee, completion through a deposit, and unique disbursement.
update public.loan_requests
set status = 'ACCEPTED', approved_amount = 100000,
    guarantee_required = 10000, guarantee_blocked_partial = 0
where id = 'cccccccc-0000-0000-0000-000000000001';

select public.sign_loan_contract(
  'aaaaaaaa-0000-0000-0000-000000000004',
  'cccccccc-0000-0000-0000-000000000001',
  '32323232-0000-0000-0000-000000000001',
  '32323232-0000-0000-0000-000000000002'
);

update public.wallets set reserved_amount = 1000
where client_id = 'aaaaaaaa-0000-0000-0000-000000000004';

select lives_ok(
  $$ select public.process_guarantee_blocking(
       'aaaaaaaa-0000-0000-0000-000000000004',
       'cccccccc-0000-0000-0000-000000000001',
       '33333333-0000-0000-0000-000000000001',
       '33333333-0000-0000-0000-000000000001'
     ) $$,
  'le blocage partiel de garantie reussit'
);
select is(
  (select status::text from public.loan_requests
   where id = 'cccccccc-0000-0000-0000-000000000001'),
  'GUARANTEE_PENDING',
  'une garantie partielle place la demande en attente'
);
select is(
  (select blocked_guarantee from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  1000::bigint,
  'seul le disponible apres reservation est bloque pour la garantie partielle'
);
select is(
  (select guarantee_blocked_partial from public.loan_requests
   where id = 'cccccccc-0000-0000-0000-000000000001'),
  1000::bigint,
  'la demande memorise le montant partiellement bloque'
);
select is(
  public.process_guarantee_blocking(
    'aaaaaaaa-0000-0000-0000-000000000004',
    'cccccccc-0000-0000-0000-000000000001',
    '33333333-0000-0000-0000-000000000001',
    '33333333-0000-0000-0000-000000000099'
  ),
  'cccccccc-0000-0000-0000-000000000001'::uuid,
  'le rejeu du blocage retourne la demande initiale'
);
select is(
  (select blocked_guarantee from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  1000::bigint,
  'le rejeu du blocage ne deplace aucun fonds supplementaire'
);

insert into mvp_test_state (name, id)
values (
  'guarantee_deposit',
  public.create_deposit_request(
    'aaaaaaaa-0000-0000-0000-000000000004', 9000, 'GUARANTEE', 'CASH',
    'GAR-001', 'aaaaaaaa-0000-0000-0000-000000000004/guarantee-proof.pdf',
    '33333333-0000-0000-0000-000000000002',
    '33333333-0000-0000-0000-000000000003'
  )
);
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"user_role":"admin"}}';
select lives_ok(
  $$ select public.confirm_deposit(
       (select id from mvp_test_state where name = 'guarantee_deposit'), 'CONFIRM', null
     ) $$,
  'le depot complete la garantie'
);
select is(
  (select status::text from public.loan_requests
   where id = 'cccccccc-0000-0000-0000-000000000001'),
  'GUARANTEE_COMPLETE',
  'la demande passe a garantie complete'
);
select is(
  (select guarantee_blocked_partial from public.loan_requests
   where id = 'cccccccc-0000-0000-0000-000000000001'),
  10000::bigint,
  'la demande enregistre la garantie complete exacte'
);
select is(
  (select blocked_guarantee from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  10000::bigint,
  'le wallet contient la garantie complete exacte'
);

select lives_ok(
  $$ insert into mvp_test_state (name, id)
     values (
       'loan',
       public.disburse_loan('cccccccc-0000-0000-0000-000000000001', null)
     ) $$,
  'le premier decaissement reussit'
);
select throws_ok(
  $$ select public.disburse_loan('cccccccc-0000-0000-0000-000000000001', null) $$,
  'P0001', 'INVALID_TRANSITION', 'un second decaissement est refuse'
);
select is(
  (select count(*)::bigint from public.loans
   where request_id = 'cccccccc-0000-0000-0000-000000000001'),
  1::bigint,
  'une demande ne produit qu un pret'
);
select is(
  (select sum(due_principal)::bigint from public.amortization_schedules
   where loan_id = (select id from mvp_test_state where name = 'loan')),
  100000::bigint,
  'l echeancier decaisse conserve exactement le capital'
);
select is(
  (select disbursed_loan from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  100000::bigint,
  'le decaissement interne credite une seule fois le wallet'
);

insert into public.loan_requests (
  id, client_id, product_id, amount, duration_months, purpose,
  requested_disbursement_method, status, approved_amount,
  guarantee_required, guarantee_blocked_partial
) values (
  'cccccccc-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000004',
  'bbbbbbbb-0000-0000-0000-000000000001',
  20000, 2, 'Garantie concurrente interdite', 'INTERNAL', 'ACCEPTED',
  20000, 2000, 0
);
select throws_ok(
  $$ select public.process_guarantee_blocking(
       'aaaaaaaa-0000-0000-0000-000000000004',
       'cccccccc-0000-0000-0000-000000000003',
       '33333333-0000-0000-0000-000000000010',
       '33333333-0000-0000-0000-000000000011'
     ) $$,
  'P0001', 'ACTIVE_LOAN_EXISTS',
  'une autre garantie est interdite tant qu un pret est actif'
);

-- Partial, overpaid and exact repayments; release occurs once on closure.
update public.loans set status = 'DEFAULTED'
where id = (select id from mvp_test_state where name = 'loan');
insert into mvp_test_state (name, id)
values (
  'repayment_partial',
  public.create_repayment_request(
    'aaaaaaaa-0000-0000-0000-000000000004',
    (select id from mvp_test_state where name = 'loan'),
    1000, 'CASH', 'REP-PARTIAL',
    'aaaaaaaa-0000-0000-0000-000000000004/repayment-partial.pdf',
    '44444444-0000-0000-0000-000000000001',
    '44444444-0000-0000-0000-000000000002'
  )
);
select lives_ok(
  $$ select public.confirm_repayment(
       (select id from mvp_test_state where name = 'repayment_partial'), 'CONFIRM', null
     ) $$,
  'un remboursement partiel est confirme'
);
select ok(
  exists(
    select 1 from public.amortization_schedules
    where loan_id = (select id from mvp_test_state where name = 'loan')
      and status = 'PARTIAL'
  ),
  'un remboursement partiel marque une echeance PARTIAL'
);
select is(
  (select status from public.loans where id = (select id from mvp_test_state where name = 'loan')),
  'DEFAULTED',
  'le pret en defaut reste remboursable apres un paiement partiel'
);

insert into mvp_test_state (name, id, amount)
select
  'repayment_overpay',
  public.create_repayment_request(
    'aaaaaaaa-0000-0000-0000-000000000004',
    (select id from mvp_test_state where name = 'loan'),
    outstanding + 1, 'CASH', 'REP-OVERPAY',
    'aaaaaaaa-0000-0000-0000-000000000004/repayment-overpay.pdf',
    '44444444-0000-0000-0000-000000000003',
    '44444444-0000-0000-0000-000000000004'
  ),
  outstanding + 1
from (
  select sum(
    greatest(penalty_accrued - paid_penalty, 0)
    + greatest(due_interest - paid_interest, 0)
    + greatest(due_fees - paid_fees, 0)
    + greatest(due_principal - paid_principal, 0)
    + greatest(due_mandatory_savings - paid_mandatory_savings, 0)
  )::bigint as outstanding
  from public.amortization_schedules
  where loan_id = (select id from mvp_test_state where name = 'loan')
) totals;

select throws_ok(
  $$ select public.confirm_repayment(
       (select id from mvp_test_state where name = 'repayment_overpay'), 'CONFIRM', null
     ) $$,
  '22023', 'OVERPAYMENT', 'un surpaiement est refuse'
);
select is(
  (select status from public.repayment_requests
   where id = (select id from mvp_test_state where name = 'repayment_overpay')),
  'PENDING',
  'le refus du surpaiement annule atomiquement la confirmation'
);
select public.confirm_repayment(
  (select id from mvp_test_state where name = 'repayment_overpay'),
  'REJECT',
  'surpaiement QA'
);

insert into mvp_test_state (name, id, amount)
select
  'repayment_exact',
  public.create_repayment_request(
    'aaaaaaaa-0000-0000-0000-000000000004',
    (select id from mvp_test_state where name = 'loan'),
    outstanding, 'CASH', 'REP-EXACT',
    'aaaaaaaa-0000-0000-0000-000000000004/repayment-exact.pdf',
    '44444444-0000-0000-0000-000000000005',
    '44444444-0000-0000-0000-000000000006'
  ),
  outstanding
from (
  select sum(
    greatest(penalty_accrued - paid_penalty, 0)
    + greatest(due_interest - paid_interest, 0)
    + greatest(due_fees - paid_fees, 0)
    + greatest(due_principal - paid_principal, 0)
    + greatest(due_mandatory_savings - paid_mandatory_savings, 0)
  )::bigint as outstanding
  from public.amortization_schedules
  where loan_id = (select id from mvp_test_state where name = 'loan')
) totals;

select lives_ok(
  $$ select public.confirm_repayment(
       (select id from mvp_test_state where name = 'repayment_exact'), 'CONFIRM', null
     ) $$,
  'le remboursement exact est confirme'
);
select is(
  (select status from public.loans where id = (select id from mvp_test_state where name = 'loan')),
  'CLOSED',
  'le remboursement exact cloture le pret'
);
select is(
  (select remaining_principal from public.loans
   where id = (select id from mvp_test_state where name = 'loan')),
  0::bigint,
  'le capital restant est exactement nul'
);
select ok(
  (select bool_and(status = 'PAID') from public.amortization_schedules
   where loan_id = (select id from mvp_test_state where name = 'loan')),
  'toutes les echeances sont integralement payees'
);
select is(
  (select blocked_guarantee from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  0::bigint,
  'la garantie est liberee a la cloture'
);
select is(
  (select mandatory_savings from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  0::bigint,
  'l epargne obligatoire est liberee a la cloture'
);
select is(
  (select disbursed_loan from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  0::bigint,
  'le reliquat decaisse est libere a la cloture'
);
select ok(
  (select free_savings > 0 from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  'les compartiments liberes reviennent dans l epargne libre'
);
select throws_ok(
  $$ select public.confirm_repayment(
       (select id from mvp_test_state where name = 'repayment_exact'), 'CONFIRM', null
     ) $$,
  'P0001', 'ALREADY_PROCESSED', 'la confirmation exacte ne peut pas etre rejouee'
);
select is(
  (select count(*)::bigint from public.audit_logs
   where target_id = (select id from mvp_test_state where name = 'loan')
     and action_type = 'AUTO_RELEASE'),
  1::bigint,
  'la liberation automatique est auditee une seule fois'
);

update mvp_test_state
set amount = (
  select free_savings from public.wallets
  where client_id = 'aaaaaaaa-0000-0000-0000-000000000004'
)
where name = 'loan';
update public.loans
set status = 'CLOSED'
where id = (select id from mvp_test_state where name = 'loan');
select is(
  (select free_savings from public.wallets
   where client_id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  (select amount from mvp_test_state where name = 'loan'),
  'une mise a jour CLOSED vers CLOSED ne libere rien de plus'
);
select is(
  (select count(*)::bigint from public.audit_logs
   where target_id = (select id from mvp_test_state where name = 'loan')
     and action_type = 'AUTO_RELEASE'),
  1::bigint,
  'la liberation reste unique apres un nouvel update'
);

-- Daily maintenance is idempotent within the same calendar day.
insert into public.loan_requests (
  id, client_id, product_id, amount, duration_months, purpose,
  requested_disbursement_method, status
)
values (
  'cccccccc-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000005',
  'bbbbbbbb-0000-0000-0000-000000000002',
  10000, 1, 'Test cron', 'INTERNAL', 'DISBURSED'
);
insert into public.loans (
  id, request_id, client_id, total_amount, remaining_principal,
  interest_rate, interest_method, start_date, end_date, status
)
values (
  'dddddddd-0000-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000005',
  10000, 10000, 12, 'CONSTANT_INSTALLMENT', current_date - 31, current_date - 1, 'ACTIVE'
);
insert into public.amortization_schedules (
  id, loan_id, installment_no, due_date, due_principal, due_interest,
  due_fees, due_mandatory_savings, status
)
values (
  'eeeeeeee-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000001',
  1, current_date - 3, 10000, 0, 0, 0, 'PENDING'
);

select lives_ok(
  $$ select app_private.run_daily_loan_jobs() $$,
  'le premier job quotidien reussit'
);
select lives_ok(
  $$ select app_private.run_daily_loan_jobs() $$,
  'le rejeu du job quotidien reussit'
);
select is(
  (select penalty_accrued from public.amortization_schedules
   where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  300::bigint,
  'le job rattrape trois jours puis le rejeu ne double pas la penalite'
);
select is(
  (select penalty_last_accrued_on from public.amortization_schedules
   where id = 'eeeeeeee-0000-0000-0000-000000000001'),
  current_date,
  'la date de derniere penalite est memorisee'
);
select is(
  (select status from public.loans
   where id = 'dddddddd-0000-0000-0000-000000000001'),
  'ACTIVE',
  'trois jours de retard ne declenchent pas le defaut a 90 jours'
);

update public.profiles set is_active = false
where id = 'aaaaaaaa-0000-0000-0000-000000000002';
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"user_role":"admin"}}';
select is(
  public.auth_role(),
  'client',
  'un admin desactive perd immediatement son role RLS malgre un JWT admin'
);
select is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', 'aaaaaaaa-0000-0000-0000-000000000002',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb)
    )
  ) -> 'claims' -> 'app_metadata' ->> 'user_role',
  'client',
  'le hook retire le role admin au compte desactive'
);
select is(
  (public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', 'aaaaaaaa-0000-0000-0000-000000000002',
      'claims', jsonb_build_object('app_metadata', '{}'::jsonb)
    )
  ) -> 'claims' -> 'app_metadata' ->> 'account_active')::boolean,
  false,
  'le hook marque le compte desactive'
);
select throws_ok(
  $$ select public.get_admin_kpis() $$,
  '42501', 'FORBIDDEN',
  'un admin desactive est refuse meme avec un JWT encore valide'
);

select * from finish();
rollback;
