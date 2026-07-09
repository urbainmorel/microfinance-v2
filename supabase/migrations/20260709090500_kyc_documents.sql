-- Lot 2 — Pièces KYC (PRD §6.4 étapes 4.5–4.7 ; §20 chiffrement au repos).
-- Complète le socle KYC (20260709090400) : upload recto/verso/selfie dans un bucket
-- Storage privé, métadonnées dans public.kyc_documents, et durcissement de submit_kyc.

-- Une seule pièce par (client, type) : permet un upsert idempotent au ré-upload.
create unique index if not exists kyc_documents_client_doctype
  on public.kyc_documents (client_id, doc_type);

-- Le client peut remplacer sa propre pièce (upsert) ; INSERT/SELECT déjà couverts (Lot 1).
create policy "kyc_docs_client_update" on public.kyc_documents
  for update using (auth.uid() = client_id) with check (auth.uid() = client_id);

-- ── Storage : bucket privé + RLS « chacun son dossier » ───────────────────────
-- Gardé par to_regclass : NO-OP si le schéma storage est absent (storage désactivé
-- en dev sur cette machine). Appliqué tel quel en préprod/CI/hébergé, où storage tourne.
-- plpgsql diffère la résolution des noms : les DDL sur storage.objects ne sont
-- compilées qu'à l'exécution, donc aucune erreur quand le schéma n'existe pas.
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'Schéma storage absent — bucket/policies KYC ignorés (storage désactivé).';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('kyc-documents', 'kyc-documents', false, 5242880,
          array['image/jpeg', 'image/png', 'application/pdf'])
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  -- Le premier segment du chemin est l'uid : `<uid>/ID_FRONT`. Isolation par dossier.
  drop policy if exists "kyc_obj_client_select" on storage.objects;
  create policy "kyc_obj_client_select" on storage.objects
    for select to authenticated
    using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

  drop policy if exists "kyc_obj_client_insert" on storage.objects;
  create policy "kyc_obj_client_insert" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

  drop policy if exists "kyc_obj_client_update" on storage.objects;
  create policy "kyc_obj_client_update" on storage.objects
    for update to authenticated
    using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

  drop policy if exists "kyc_obj_client_delete" on storage.objects;
  create policy "kyc_obj_client_delete" on storage.objects
    for delete to authenticated
    using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

  -- Revue KYC : le personnel lit les pièces (URL signées générées côté back-office).
  drop policy if exists "kyc_obj_staff_select" on storage.objects;
  create policy "kyc_obj_staff_select" on storage.objects
    for select to authenticated
    using (bucket_id = 'kyc-documents' and public.auth_role() in
      ('agent_credit', 'agent_caisse', 'validator', 'admin', 'super_admin', 'auditor'));
end $$;

-- ── Soumission durcie : complétude des pièces vérifiée côté serveur ───────────
-- Le wizard ne peut pas être court-circuité : recto + selfie obligatoires ; verso
-- obligatoire sauf passeport (PRD §6.4). id_type doit être renseigné.
create or replace function public.submit_kyc()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_type text;
  v_has_front boolean;
  v_has_back boolean;
  v_has_selfie boolean;
begin
  select id_type into v_id_type from public.profiles where id = auth.uid();
  if v_id_type is null then
    raise exception 'KYC incomplet : type de pièce d''identité manquant';
  end if;

  select
    bool_or(doc_type = 'ID_FRONT'),
    bool_or(doc_type = 'ID_BACK'),
    bool_or(doc_type = 'SELFIE')
  into v_has_front, v_has_back, v_has_selfie
  from public.kyc_documents where client_id = auth.uid();

  if not coalesce(v_has_front, false) or not coalesce(v_has_selfie, false) then
    raise exception 'KYC incomplet : recto de la pièce et selfie obligatoires';
  end if;
  if v_id_type <> 'PASSPORT' and not coalesce(v_has_back, false) then
    raise exception 'KYC incomplet : verso de la pièce obligatoire';
  end if;

  set local app.privileged = 'on';
  update public.profiles set kyc_status = 'PENDING', updated_at = now()
   where id = auth.uid() and kyc_status in ('NONE', 'INFO_REQUESTED');
  if not found then
    raise exception 'KYC déjà soumis ou statut invalide';
  end if;
end;
$$;
