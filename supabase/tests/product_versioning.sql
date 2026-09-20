begin;
delete from public.loan_products;
select plan(4);
insert into auth.users (id, email, raw_user_meta_data)
values ('20202020-2020-2020-2020-202020202020', 'product-admin@test.dev', '{"firstname":"Admin","lastname":"Produit"}');
select set_config('app.privileged', 'on', true);
update public.profiles set role = 'admin', is_active = true where id = '20202020-2020-2020-2020-202020202020';
insert into public.loan_products (id, name, min_amount, max_amount, min_duration_months,
  max_duration_months, interest_rate, interest_method)
values ('21212121-2121-2121-2121-212121212121', 'Produit R1', 10000, 100000, 3, 12, 12, 'CONSTANT_INSTALLMENT');
set local request.jwt.claims = '{"sub":"20202020-2020-2020-2020-202020202020","role":"authenticated","app_metadata":{"user_role":"admin"}}';
select lives_ok($$ select public.revise_loan_product(
  '21212121-2121-2121-2121-212121212121',
  '{"name":"Produit R2","minAmount":20000,"maxAmount":150000,"minDurationMonths":3,"maxDurationMonths":12,"interestRate":13.2,"processingFeePercent":0,"processingFeeFlat":0,"managementFeePercent":0,"managementFeeFlat":0,"insuranceRate":0,"guaranteeRate":10,"mandatorySavingsRate":0,"latePenaltyRate":0.1,"isActive":true}'
) $$, 'une révision est créée atomiquement');
select is((select is_active from public.loan_products where id = '21212121-2121-2121-2121-212121212121'), false, 'l’ancienne révision est désactivée');
select is((select max(revision) from public.loan_products where logical_product_id = '21212121-2121-2121-2121-212121212121'), 2, 'la révision est incrémentée');
select throws_ok($$ update public.loan_products set interest_rate = 14 where id = '21212121-2121-2121-2121-212121212121' $$,
  '22023', 'PRODUCT_REVISION_REQUIRED', 'la mutation directe est refusée');
select * from finish();
rollback;
