begin;
select plan(2);
insert into auth.users (id, email, raw_user_meta_data)
values ('24242424-2424-2424-2424-242424242424', 'report-admin@test.dev', '{"firstname":"Admin","lastname":"Report"}');
select set_config('app.privileged', 'on', true);
update public.profiles set role = 'admin', is_active = true where id = '24242424-2424-2424-2424-242424242424';
set local request.jwt.claims = '{"sub":"24242424-2424-2424-2424-242424242424","role":"authenticated","app_metadata":{"user_role":"admin"}}';
select lives_ok($$ select public.get_admin_financial_report(current_date - 30, current_date) $$, 'un rapport valide est généré');
select throws_ok($$ select public.get_admin_financial_report(current_date, current_date - 1) $$,
  '22023', 'INVALID_REPORT_PERIOD', 'une période inversée est refusée');
select * from finish();
rollback;
