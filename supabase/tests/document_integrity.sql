begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data)
values ('44444444-4444-4444-4444-444444444444', 'documents@test.dev', '{"firstname":"Doc","lastname":"Test"}');
select set_config('app.privileged', 'on', true);
update public.profiles set is_active = true
where id = '44444444-4444-4444-4444-444444444444';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text,
  true
);

select throws_ok(
  $$ select public.finalize_kyc_document('ID_FRONT', auth.uid()::text || '/ID_FRONT') $$,
  '22023', 'DOCUMENT_NOT_FOUND',
  'un chemin sans objet Storage est refusé'
);

reset role;
insert into storage.objects (bucket_id, name, owner_id, metadata)
values (
  'kyc-documents',
  '44444444-4444-4444-4444-444444444444/ID_FRONT',
  '44444444-4444-4444-4444-444444444444',
  '{"size":1024,"mimetype":"image/jpeg"}'::jsonb
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text,
  true
);
select lives_ok(
  $$ select public.finalize_kyc_document('ID_FRONT', auth.uid()::text || '/ID_FRONT') $$,
  'un objet Storage valide peut être finalisé'
);
select is(
  (select url from public.kyc_documents where client_id = auth.uid() and doc_type = 'ID_FRONT'),
  auth.uid()::text || '/ID_FRONT',
  'la métadonnée référence exactement l’objet validé'
);
select throws_ok(
  $$ insert into public.kyc_documents (client_id, doc_type, url)
     values (auth.uid(), 'SELFIE', auth.uid()::text || '/SELFIE') $$,
  '42501', null,
  'le client ne peut plus créer directement une métadonnée KYC'
);
select throws_ok(
  $$ select public.finalize_kyc_document('SELFIE', auth.uid()::text || '/ID_FRONT') $$,
  '22023', 'INVALID_DOCUMENT_PATH',
  'le type KYC doit correspondre au nom déterministe de l’objet'
);

reset role;
select * from finish();
rollback;
