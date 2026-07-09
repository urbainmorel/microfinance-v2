-- Lot 3 — Tests de la brique de crédit (pgTAP). `supabase test db`.

begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data)
values ('33333333-3333-3333-3333-333333333333', 'carol@test.dev', '{"firstname":"Carol","lastname":"C"}');

-- Crédit épargne libre.
select public.credit_wallet('33333333-3333-3333-3333-333333333333', 'free_savings', 10000);
select is(
  (select free_savings from public.wallets where client_id = '33333333-3333-3333-3333-333333333333'),
  10000::bigint,
  'crédite l''épargne libre'
);

-- Crédit prêt décaissé disponible.
select public.credit_wallet('33333333-3333-3333-3333-333333333333', 'disbursed_loan', 50000);
select is(
  (select disbursed_loan from public.wallets where client_id = '33333333-3333-3333-3333-333333333333'),
  50000::bigint,
  'crédite le prêt décaissé disponible'
);

-- Solde disponible = free_savings + disbursed_loan − reserved_amount.
select is(
  public.get_available_balance('33333333-3333-3333-3333-333333333333'),
  60000::bigint,
  'solde disponible = 60000 (10000 + 50000 − 0)'
);

-- Champ non autorisé rejeté (le réservé ne se crédite jamais par cette voie).
select throws_ok(
  $$ select public.credit_wallet('33333333-3333-3333-3333-333333333333', 'reserved_amount', 100) $$,
  NULL,
  NULL,
  'champ de crédit non autorisé rejeté'
);

-- Montant non positif rejeté.
select throws_ok(
  $$ select public.credit_wallet('33333333-3333-3333-3333-333333333333', 'free_savings', 0) $$,
  NULL,
  NULL,
  'montant de crédit non positif rejeté'
);

select * from finish();
rollback;
