begin;
select plan(3);
insert into auth.users (id, email, raw_user_meta_data)
values ('23232323-2323-2323-2323-232323232323', 'template-admin@test.dev', '{"firstname":"Admin","lastname":"Template"}');
select set_config('app.privileged', 'on', true);
update public.profiles set role = 'admin', is_active = true where id = '23232323-2323-2323-2323-232323232323';
set local request.jwt.claims = '{"sub":"23232323-2323-2323-2323-232323232323","role":"authenticated","app_metadata":{"user_role":"admin"}}';
select lives_ok($$ select public.save_notification_template('test_notice','en','Hello {{name}}','<p>Hello {{name}}</p>','["name"]') $$, 'un modèle valide est enregistré');
select is((select language from public.notification_templates where slug = 'test_notice'), 'en', 'la langue est conservée');
select throws_ok($$ select public.save_notification_template('unsafe','fr','Test','<script>alert(1)</script>','[]') $$,
  '22023', 'UNSAFE_TEMPLATE_HTML', 'le HTML actif est refusé');
select * from finish();
rollback;
