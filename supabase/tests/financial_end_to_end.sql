-- Complete financial lifecycle through the production RPCs.
-- Every fixture and business mutation is rolled back at the end of the test.

begin;
delete from public.loan_products;
select plan(29);

create temporary table financial_e2e_state (
  name text primary key,
  id uuid not null
) on commit drop;

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    'e2e00000-0000-4000-8000-000000000001',
    'financial-client@test.dev',
    '{"firstname":"Financial","lastname":"Client"}'
  ),
  (
    'e2e00000-0000-4000-8000-000000000002',
    'financial-admin@test.dev',
    '{"firstname":"Financial","lastname":"Admin"}'
  );

select set_config('app.privileged', 'on', true);
update public.profiles
set kyc_status = 'COMPLETED'
where id = 'e2e00000-0000-4000-8000-000000000001';
update public.profiles
set role = 'admin', is_active = true
where id = 'e2e00000-0000-4000-8000-000000000002';
select set_config('app.privileged', 'off', true);

insert into public.loan_products (
  id, name, min_amount, max_amount, min_duration_months, max_duration_months,
  interest_rate, interest_method, guarantee_rate, mandatory_savings_rate,
  late_penalty_rate, is_active
) values (
  'e2e00000-0000-4000-8000-000000000010', 'Produit E2E financier',
  10000, 500000, 1, 24, 18, 'CONSTANT_INSTALLMENT', 10, 5, 1, true
);

insert into storage.objects (bucket_id, name, owner_id, metadata)
values
  ('deposit-proofs', 'e2e00000-0000-4000-8000-000000000001/deposit-cancel.pdf',
   'e2e00000-0000-4000-8000-000000000001', '{"size":1024,"mimetype":"application/pdf"}'),
  ('deposit-proofs', 'e2e00000-0000-4000-8000-000000000001/deposit-confirm.pdf',
   'e2e00000-0000-4000-8000-000000000001', '{"size":1024,"mimetype":"application/pdf"}'),
  ('repayment-proofs', 'e2e00000-0000-4000-8000-000000000001/repayment.pdf',
   'e2e00000-0000-4000-8000-000000000001', '{"size":1024,"mimetype":"application/pdf"}');

insert into financial_e2e_state (name, id)
values (
  'deposit_cancel',
  public.create_deposit_request(
    'e2e00000-0000-4000-8000-000000000001', 2000, 'FREE_SAVINGS', 'CASH',
    'E2E-DEP-CANCEL',
    'e2e00000-0000-4000-8000-000000000001/deposit-cancel.pdf',
    'e2e00000-0000-4000-8000-000000000101',
    'e2e00000-0000-4000-8000-000000000102'
  )
);
select ok(
  (select id is not null from financial_e2e_state where name = 'deposit_cancel'),
  'le client cree une demande de depot'
);
select is(
  public.cancel_client_request(
    'e2e00000-0000-4000-8000-000000000001', 'deposit',
    (select id from financial_e2e_state where name = 'deposit_cancel'),
    'e2e00000-0000-4000-8000-000000000103',
    'e2e00000-0000-4000-8000-000000000104'
  ),
  (select id from financial_e2e_state where name = 'deposit_cancel'),
  'le client annule sa demande en attente'
);
select is(
  (select status from public.deposit_requests
   where id = (select id from financial_e2e_state where name = 'deposit_cancel')),
  'CANCELLED',
  'le depot annule reste trace avec son statut final'
);

insert into financial_e2e_state (name, id)
values (
  'deposit_confirm',
  public.create_deposit_request(
    'e2e00000-0000-4000-8000-000000000001', 30000, 'FREE_SAVINGS', 'CASH',
    'E2E-DEP-CONFIRM',
    'e2e00000-0000-4000-8000-000000000001/deposit-confirm.pdf',
    'e2e00000-0000-4000-8000-000000000105',
    'e2e00000-0000-4000-8000-000000000106'
  )
);
select ok(
  (select id is not null from financial_e2e_state where name = 'deposit_confirm'),
  'une seconde demande de depot est creee'
);

set local request.jwt.claims =
  '{"sub":"e2e00000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"user_role":"admin"}}';
select lives_ok(
  $$ select public.confirm_deposit(
       (select id from financial_e2e_state where name = 'deposit_confirm'),
       'CONFIRM', null
     ) $$,
  'l administrateur confirme manuellement le depot'
);
select is(
  (select status from public.deposit_requests
   where id = (select id from financial_e2e_state where name = 'deposit_confirm')),
  'CONFIRMED',
  'la demande confirmee porte le statut final attendu'
);
select is(
  (select free_savings from public.wallets
   where client_id = 'e2e00000-0000-4000-8000-000000000001'),
  30000::bigint,
  'le depot credite exactement l epargne libre'
);

insert into financial_e2e_state (name, id)
values (
  'withdrawal_cancel',
  public.create_client_withdrawal(
    'e2e00000-0000-4000-8000-000000000001', 'MOBILE_MONEY', 5000,
    '{"name":"Financial Client","operator":"MTN","phone":"+2250700000000"}'::jsonb,
    'e2e00000-0000-4000-8000-000000000107',
    'e2e00000-0000-4000-8000-000000000108'
  )
);
select ok(
  (select id is not null from financial_e2e_state where name = 'withdrawal_cancel'),
  'le client cree une demande de retrait'
);
select is(
  public.cancel_client_request(
    'e2e00000-0000-4000-8000-000000000001', 'withdrawal',
    (select id from financial_e2e_state where name = 'withdrawal_cancel'),
    'e2e00000-0000-4000-8000-000000000109',
    'e2e00000-0000-4000-8000-000000000110'
  ),
  (select id from financial_e2e_state where name = 'withdrawal_cancel'),
  'le client annule le retrait avant traitement'
);
select is(
  (select reserved_amount from public.wallets
   where client_id = 'e2e00000-0000-4000-8000-000000000001'),
  0::bigint,
  'l annulation restitue integralement la reservation'
);

insert into financial_e2e_state (name, id)
values (
  'request',
  public.create_loan_request(
    'e2e00000-0000-4000-8000-000000000001',
    'e2e00000-0000-4000-8000-000000000010',
    100000, 4, 'Financement E2E', 250000, 'INTERNAL', '[]'::jsonb,
    'e2e00000-0000-4000-8000-000000000111',
    'e2e00000-0000-4000-8000-000000000112'
  )
);
select ok(
  (select id is not null from financial_e2e_state where name = 'request'),
  'le client soumet une demande de pret via la RPC publique serveur'
);
select is(
  (select status::text from public.loan_requests
   where id = (select id from financial_e2e_state where name = 'request')),
  'SUBMITTED',
  'la demande debute en attente d analyse'
);
select is(
  public.transition_loan_request(
    (select id from financial_e2e_state where name = 'request'),
    'ANALYZE', null, null
  ),
  'IN_ANALYSIS',
  'l administrateur ouvre l analyse'
);
select is(
  public.transition_loan_request(
    (select id from financial_e2e_state where name = 'request'),
    'PRE_APPROVE', 100000, 'capacite verifiee'
  ),
  'PRE_APPROVED',
  'l administrateur pre-approuve le montant'
);
select is(
  public.transition_loan_request(
    (select id from financial_e2e_state where name = 'request'),
    'ACCEPT', 100000, 'decision finale E2E'
  ),
  'ACCEPTED',
  'l administrateur accepte le pret avec garantie'
);
select is(
  (select count(*)::bigint from public.loan_contracts
   where request_id = (select id from financial_e2e_state where name = 'request')),
  1::bigint,
  'l acceptation genere exactement un contrat dynamique'
);

insert into financial_e2e_state (name, id)
values (
  'contract',
  public.sign_loan_contract(
    'e2e00000-0000-4000-8000-000000000001',
    (select id from financial_e2e_state where name = 'request'),
    'e2e00000-0000-4000-8000-000000000113',
    'e2e00000-0000-4000-8000-000000000114'
  )
);
select ok(
  (select id is not null from financial_e2e_state where name = 'contract'),
  'le client signe le contrat par PIN'
);
select ok(
  (select signed_at is not null from public.loan_contracts
   where id = (select id from financial_e2e_state where name = 'contract')),
  'la preuve temporelle de signature est conservee'
);

select is(
  public.process_guarantee_blocking(
    'e2e00000-0000-4000-8000-000000000001',
    (select id from financial_e2e_state where name = 'request'),
    'e2e00000-0000-4000-8000-000000000115',
    'e2e00000-0000-4000-8000-000000000116'
  ),
  (select id from financial_e2e_state where name = 'request'),
  'la garantie est mobilisee depuis l epargne disponible'
);
select is(
  (select status::text from public.loan_requests
   where id = (select id from financial_e2e_state where name = 'request')),
  'GUARANTEE_COMPLETE',
  'la demande atteint le statut pret au decaissement'
);
select is(
  (select blocked_guarantee from public.wallets
   where client_id = 'e2e00000-0000-4000-8000-000000000001'),
  10000::bigint,
  'la garantie bloquee correspond exactement aux dix pour cent'
);

insert into financial_e2e_state (name, id)
values (
  'loan',
  public.disburse_loan(
    (select id from financial_e2e_state where name = 'request'), null
  )
);
select ok(
  (select id is not null from financial_e2e_state where name = 'loan'),
  'l administrateur decaisse le pret'
);
select is(
  (select status from public.loans
   where id = (select id from financial_e2e_state where name = 'loan')),
  'ACTIVE',
  'le pret decaisse devient actif'
);
select is(
  (select sum(due_principal)::bigint from public.amortization_schedules
   where loan_id = (select id from financial_e2e_state where name = 'loan')),
  100000::bigint,
  'les mensualites constantes conservent exactement le capital'
);

insert into financial_e2e_state (name, id)
select
  'repayment',
  public.create_repayment_request(
    'e2e00000-0000-4000-8000-000000000001',
    (select id from financial_e2e_state where name = 'loan'),
    outstanding, 'CASH', 'E2E-REP-EXACT',
    'e2e00000-0000-4000-8000-000000000001/repayment.pdf',
    'e2e00000-0000-4000-8000-000000000117',
    'e2e00000-0000-4000-8000-000000000118'
  )
from (
  select sum(
    greatest(penalty_accrued - paid_penalty, 0)
    + greatest(due_interest - paid_interest, 0)
    + greatest(due_fees - paid_fees, 0)
    + greatest(due_principal - paid_principal, 0)
    + greatest(due_mandatory_savings - paid_mandatory_savings, 0)
  )::bigint as outstanding
  from public.amortization_schedules
  where loan_id = (select id from financial_e2e_state where name = 'loan')
) totals;
select ok(
  (select id is not null from financial_e2e_state where name = 'repayment'),
  'le client declare le remboursement total'
);
select lives_ok(
  $$ select public.confirm_repayment(
       (select id from financial_e2e_state where name = 'repayment'),
       'CONFIRM', null
     ) $$,
  'l administrateur confirme manuellement le remboursement'
);
select is(
  (select status from public.loans
   where id = (select id from financial_e2e_state where name = 'loan')),
  'CLOSED',
  'le remboursement total cloture le pret'
);
select is(
  (select remaining_principal from public.loans
   where id = (select id from financial_e2e_state where name = 'loan')),
  0::bigint,
  'le capital restant du est nul'
);
select is(
  (select blocked_guarantee from public.wallets
   where client_id = 'e2e00000-0000-4000-8000-000000000001'),
  0::bigint,
  'la cloture libere automatiquement la garantie'
);

select * from finish();
rollback;
