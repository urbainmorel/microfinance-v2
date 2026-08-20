begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data)
values ('33333333-3333-3333-3333-333333333333', 'kyc@test.dev', '{"firstname":"Kyc","lastname":"Test"}');

select set_config('app.privileged', 'on', true);
update public.profiles set is_active = true
where id = '33333333-3333-3333-3333-333333333333';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  $$ select public.save_kyc_profile('{"role":"admin"}'::jsonb) $$,
  '22023', 'INVALID_KYC_FIELDS',
  'la RPC refuse tout champ hors liste blanche'
);
select throws_ok(
  $$ select public.save_kyc_profile('{"country":"France"}'::jsonb) $$,
  '22023', 'COUNTRY_OUTSIDE_UMOA',
  'la V1 refuse un pays hors UMOA'
);
select lives_ok(
  $$ select public.save_kyc_profile('{"country":"SN","phone":"+221771234567"}'::jsonb) $$,
  'un pays UMOA et un téléphone valide sont acceptés'
);
select is(
  (select country from public.profiles where id = auth.uid()),
  'SN',
  'le pays est normalisé en majuscules'
);

reset role;
select set_config('app.privileged', 'on', true);
update public.profiles set kyc_status = 'PENDING'
where id = '33333333-3333-3333-3333-333333333333';
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text,
  true
);
select throws_ok(
  $$ select public.save_kyc_profile('{"city":"Dakar"}'::jsonb) $$,
  '42501', 'KYC_NOT_EDITABLE',
  'un dossier soumis est immuable côté client'
);

reset role;
select * from finish();
rollback;
