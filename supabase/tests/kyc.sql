-- Lot 2 — Tests KYC : sauvegarde par étape + soumission (pgTAP).

begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data)
values ('77777777-7777-7777-7777-777777777777', 'kyc@test.dev', '{"firstname":"Koffi","lastname":"K"}');

select set_config('request.jwt.claims', json_build_object(
  'sub', '77777777-7777-7777-7777-777777777777', 'role', 'authenticated',
  'app_metadata', json_build_object('user_role', 'client'))::text, true);

-- Étape profil.
select public.save_kyc_profile(
  '{"birth_date":"1990-05-10","country":"CI","city":"Abidjan","profession":"Commerçante","monthly_income_estimate":250000}'::jsonb);
select is((select profession from public.profiles where id = auth.uid()), 'Commerçante', 'profession sauvegardée');
select is((select monthly_income_estimate from public.profiles where id = auth.uid()), 250000::bigint, 'revenu sauvegardé');

-- Sauvegarde partielle : ajoute la pièce d'identité sans effacer le reste.
select public.save_kyc_profile('{"id_type":"CNI","id_number":"CI-123456"}'::jsonb);
select is((select id_number from public.profiles where id = auth.uid()), 'CI-123456', 'pièce ajoutée');
select is((select city from public.profiles where id = auth.uid()), 'Abidjan', 'ville conservée (sauvegarde partielle)');

-- Informations financières (upsert).
select public.save_kyc_financials('{"income_source":"Commerce","momo_operator":"MTN","momo_number":"+2250700000000"}'::jsonb);
select is((select momo_operator from public.kyc_financials where client_id = auth.uid()), 'MTN', 'infos financières upsert');

-- Soumission → PENDING.
select public.submit_kyc();
select is((select kyc_status from public.profiles where id = auth.uid()), 'PENDING', 'KYC soumis (statut PENDING)');

reset role;
select * from finish();
rollback;
