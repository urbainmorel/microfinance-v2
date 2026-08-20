-- Les pièces KYC deviennent immuables dès leur soumission.
drop policy if exists "kyc_docs_client_insert" on public.kyc_documents;
create policy "kyc_docs_client_insert" on public.kyc_documents
for insert to authenticated
with check (
  client_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.kyc_status in ('NONE', 'INFO_REQUESTED')
  )
);

drop policy if exists "kyc_docs_client_update" on public.kyc_documents;
create policy "kyc_docs_client_update" on public.kyc_documents
for update to authenticated
using (
  client_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.kyc_status in ('NONE', 'INFO_REQUESTED')
  )
)
with check (client_id = auth.uid());

-- Storage est présent dans les environnements Supabase ciblés par cette migration.
-- Chaque écriture exige un compte actif et un chemin strictement propriétaire.
drop policy if exists "kyc_obj_client_insert" on storage.objects;
create policy "kyc_obj_client_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.filename(name)) in ('ID_FRONT', 'ID_BACK', 'SELFIE')
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.kyc_status in ('NONE', 'INFO_REQUESTED')
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
    where p.id = auth.uid() and p.is_active and p.kyc_status in ('NONE', 'INFO_REQUESTED')
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
    where p.id = auth.uid() and p.is_active and p.kyc_status in ('NONE', 'INFO_REQUESTED')
  )
);

drop policy if exists "kyc_obj_staff_select" on storage.objects;
create policy "kyc_obj_staff_select" on storage.objects
for select to authenticated
using (bucket_id = 'kyc-documents' and public.auth_role() = 'admin');

drop policy if exists "deposit_proofs_owner_insert" on storage.objects;
create policy "deposit_proofs_owner_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'deposit-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
);

drop policy if exists "deposit_proofs_owner_select" on storage.objects;
create policy "deposit_proofs_owner_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'deposit-proofs'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.auth_role() = 'admin')
);

drop policy if exists "deposit_proofs_orphan_delete" on storage.objects;
create policy "deposit_proofs_orphan_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'deposit-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (select 1 from public.deposit_requests r where r.proof_url = name)
);

drop policy if exists "loan_documents_owner_insert" on storage.objects;
create policy "loan_documents_owner_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'loan-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
);

drop policy if exists "loan_documents_read" on storage.objects;
create policy "loan_documents_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'loan-documents'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.auth_role() = 'admin')
);

drop policy if exists "loan_documents_orphan_delete" on storage.objects;
create policy "loan_documents_orphan_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'loan-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (select 1 from public.loan_request_documents d where d.object_path = name)
);

drop policy if exists "repayment_proofs_owner_insert" on storage.objects;
create policy "repayment_proofs_owner_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'repayment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
);

drop policy if exists "repayment_proofs_read" on storage.objects;
create policy "repayment_proofs_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'repayment-proofs'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.auth_role() = 'admin')
);

drop policy if exists "repayment_proofs_orphan_delete" on storage.objects;
create policy "repayment_proofs_orphan_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'repayment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (select 1 from public.repayment_requests r where r.proof_url = name)
);
