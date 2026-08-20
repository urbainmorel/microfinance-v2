begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data)
values ('15151515-1515-1515-1515-151515151515', 'contract@test.dev', '{"firstname":"Awa","lastname":"Test"}');
select set_config('app.privileged', 'on', true);
update public.profiles set kyc_status = 'COMPLETED', country = 'SN', id_type = 'PASSPORT', id_number = 'P123'
where id = '15151515-1515-1515-1515-151515151515';
insert into public.loan_products (
  id, name, min_amount, max_amount, min_duration_months, max_duration_months,
  interest_rate, interest_method, guarantee_rate
) values ('16161616-1616-1616-1616-161616161616', 'Contrat V1', 10000, 200000, 3, 12, 1,
  'CONSTANT_INSTALLMENT', 10);
insert into public.loan_requests (
  id, client_id, product_id, amount, duration_months, purpose, status,
  approved_amount, guarantee_required
) values ('17171717-1717-1717-1717-171717171717', '15151515-1515-1515-1515-151515151515',
  '16161616-1616-1616-1616-161616161616', 50000, 6, 'Stock', 'PRE_APPROVED', 50000, 5000);

update public.loan_requests set status = 'ACCEPTED'
where id = '17171717-1717-1717-1717-171717171717';
select ok(exists(select 1 from public.loan_contracts
  where request_id = '17171717-1717-1717-1717-171717171717'), 'le contrat est généré');
select is(length((select content_hash from public.loan_contracts
  where request_id = '17171717-1717-1717-1717-171717171717')), 64, 'l’empreinte SHA-256 est complète');
select throws_ok(
  $$ update public.loan_requests set status = 'GUARANTEE_PENDING'
     where id = '17171717-1717-1717-1717-171717171717' $$,
  'P0001', 'CONTRACT_SIGNATURE_REQUIRED', 'la progression non signée est bloquée'
);
select lives_ok(
  $$ select public.sign_loan_contract(
    '15151515-1515-1515-1515-151515151515', '17171717-1717-1717-1717-171717171717',
    '18181818-1818-1818-1818-181818181818', '19191919-1919-1919-1919-191919191919') $$,
  'la signature PIN est enregistrée'
);
select is((select signature_method from public.loan_contracts
  where request_id = '17171717-1717-1717-1717-171717171717'), 'PIN', 'la méthode de signature est tracée');

select * from finish();
rollback;
