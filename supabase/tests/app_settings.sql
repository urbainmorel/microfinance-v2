begin;
select plan(3);
insert into auth.users (id, email, raw_user_meta_data)
values ('22222222-2222-2222-2222-222222222222', 'settings-admin@test.dev', '{"firstname":"Admin","lastname":"Settings"}');
select set_config('app.privileged', 'on', true);
update public.profiles set role = 'admin', is_active = true where id = '22222222-2222-2222-2222-222222222222';
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","app_metadata":{"user_role":"admin"}}';
select lives_ok($$ select public.update_app_settings('{"withdrawalWindowStart":7,"withdrawalWindowEnd":18,"transferFee":500}') $$,
  'l’administrateur peut modifier les paramètres');
select is((select transfer_fee from public.app_settings where id), 500::bigint, 'les frais sont enregistrés');
select ok(exists(select 1 from public.audit_logs where action_type = 'APP_SETTINGS_UPDATED'), 'la modification est auditée');
select * from finish();
rollback;
