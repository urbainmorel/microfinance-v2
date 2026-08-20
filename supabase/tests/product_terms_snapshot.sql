begin;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data)
values ('12121212-1212-1212-1212-121212121212', 'snapshot@test.dev', '{"firstname":"Snapshot","lastname":"Client"}');
select set_config('app.privileged', 'on', true);
update public.profiles set kyc_status = 'COMPLETED'
where id = '12121212-1212-1212-1212-121212121212';
insert into public.loan_products (
  id, name, min_amount, max_amount, min_duration_months, max_duration_months,
  interest_rate, interest_method, processing_fee_flat, late_penalty_rate
) values (
  '13131313-1313-1313-1313-131313131313', 'Snapshot V1', 10000, 200000,
  3, 12, 1, 'CONSTANT_INSTALLMENT', 500, 0.1
);
insert into public.loan_requests (
  id, client_id, product_id, amount, duration_months, purpose, status
) values (
  '14141414-1414-1414-1414-141414141414',
  '12121212-1212-1212-1212-121212121212',
  '13131313-1313-1313-1313-131313131313', 50000, 6, 'Test snapshot', 'SUBMITTED'
);

select is((select product_terms ->> 'interestRate' from public.loan_requests
  where id = '14141414-1414-1414-1414-141414141414'), '1.000', 'le taux est figé');
update public.loan_products set interest_rate = 1.2
where id = '13131313-1313-1313-1313-131313131313';
select is((select product_terms ->> 'interestRate' from public.loan_requests
  where id = '14141414-1414-1414-1414-141414141414'), '1.000', 'le produit ne réécrit pas la demande');
select throws_ok(
  $$ update public.loan_requests set product_terms = '{}'::jsonb
     where id = '14141414-1414-1414-1414-141414141414' $$,
  '22023', 'PRODUCT_TERMS_IMMUTABLE', 'l’instantané ne peut pas être altéré'
);
select * from finish();
rollback;
