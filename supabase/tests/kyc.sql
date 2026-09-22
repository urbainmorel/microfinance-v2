-- Lot 2 — Tests KYC : sauvegarde par étape, complétude des pièces, soumission (pgTAP).

begin;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data)
values ('77777777-7777-7777-7777-777777777777', 'kyc@test.dev', '{"firstname":"Koffi","lastname":"K"}'),
       ('88888888-8888-8888-8888-888888888888', 'kyc2@test.dev', '{"firstname":"Ama","lastname":"P"}');

insert into storage.objects (bucket_id, name, owner_id, metadata)
values
  ('kyc-documents', '77777777-7777-7777-7777-777777777777/ID_FRONT', '77777777-7777-7777-7777-777777777777', '{"size":1024,"mimetype":"image/jpeg"}'),
  ('kyc-documents', '77777777-7777-7777-7777-777777777777/ID_BACK', '77777777-7777-7777-7777-777777777777', '{"size":1024,"mimetype":"image/jpeg"}'),
  ('kyc-documents', '77777777-7777-7777-7777-777777777777/SELFIE', '77777777-7777-7777-7777-777777777777', '{"size":1024,"mimetype":"image/jpeg"}'),
  ('kyc-documents', '88888888-8888-8888-8888-888888888888/ID_FRONT', '88888888-8888-8888-8888-888888888888', '{"size":1024,"mimetype":"image/jpeg"}'),
  ('kyc-documents', '88888888-8888-8888-8888-888888888888/SELFIE', '88888888-8888-8888-8888-888888888888', '{"size":1024,"mimetype":"image/jpeg"}');

-- ── Utilisateur 1 : pièce CNI (recto + verso + selfie obligatoires) ───────────
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

-- Soumission refusée tant qu'aucune pièce n'est téléversée (SQLSTATE P0001).
select throws_ok('select public.submit_kyc()', 'P0001');

-- Recto seulement : le verso reste obligatoire pour une CNI.
select public.finalize_kyc_document('ID_FRONT', auth.uid()::text || '/ID_FRONT');
select throws_ok('select public.submit_kyc()', 'P0001');

-- Unicité (client_id, doc_type) : une seule pièce par type et par client.
select throws_ok(
  $$ insert into public.kyc_documents (client_id, doc_type, url)
     values ('77777777-7777-7777-7777-777777777777', 'ID_FRONT', 'dup/ID_FRONT') $$,
  '23505');

-- Verso ajouté : dossier complet (sans selfie) → soumission acceptée → PENDING.
select public.finalize_kyc_document('ID_BACK', auth.uid()::text || '/ID_BACK');
select lives_ok('select public.submit_kyc()', 'soumission acceptée (CNI complète)');
select is((select kyc_status from public.profiles where id = auth.uid()), 'PENDING', 'KYC CNI soumis (PENDING)');

-- ── Utilisateur 2 : passeport (recto seul suffit, pas de verso ni de selfie) ────
select set_config('request.jwt.claims', json_build_object(
  'sub', '88888888-8888-8888-8888-888888888888', 'role', 'authenticated',
  'app_metadata', json_build_object('user_role', 'client'))::text, true);
select public.save_kyc_profile('{"id_type":"PASSPORT","id_number":"P-999"}'::jsonb);
select public.finalize_kyc_document('ID_FRONT', auth.uid()::text || '/ID_FRONT');
select lives_ok('select public.submit_kyc()', 'soumission acceptée (passeport sans verso)');

reset role;
select * from finish();
rollback;
