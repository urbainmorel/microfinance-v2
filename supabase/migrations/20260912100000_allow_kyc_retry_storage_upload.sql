-- Alignement des politiques RLS de Storage pour autoriser le ré-upload en cas de rejet (REJECTED) ou de resoumission (PENDING)
-- Permet aux utilisateurs dont le dossier KYC a été rejeté (ex: par l'IA ou un agent) de téléverser de nouveaux documents corrigés.

drop policy if exists "kyc_obj_client_insert" on storage.objects;
create policy "kyc_obj_client_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.filename(name)) in ('ID_FRONT', 'ID_BACK', 'SELFIE')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.kyc_status in ('NONE', 'INFO_REQUESTED', 'REJECTED', 'PENDING')
  )
);

drop policy if exists "kyc_obj_client_update" on storage.objects;
create policy "kyc_obj_client_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.kyc_status in ('NONE', 'INFO_REQUESTED', 'REJECTED', 'PENDING')
  )
)
with check (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.filename(name)) in ('ID_FRONT', 'ID_BACK', 'SELFIE')
);

drop policy if exists "kyc_obj_client_delete" on storage.objects;
create policy "kyc_obj_client_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.kyc_status in ('NONE', 'INFO_REQUESTED', 'REJECTED', 'PENDING')
  )
);
