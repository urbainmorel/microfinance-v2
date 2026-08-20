create or replace function app_private.assert_owned_storage_object(
  p_client uuid,
  p_bucket text,
  p_path text,
  p_max_bytes bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_metadata jsonb;
begin
  if p_client is null or p_path is null
     or split_part(p_path, '/', 1) <> p_client::text
     or p_path like '%..%' or p_path like '%//%' then
    raise exception using errcode = '22023', message = 'INVALID_DOCUMENT_PATH';
  end if;

  select metadata into v_metadata
  from storage.objects
  where bucket_id = p_bucket and name = p_path and owner_id = p_client::text;
  if not found then
    raise exception using errcode = '22023', message = 'DOCUMENT_NOT_FOUND';
  end if;
  if coalesce((v_metadata ->> 'size')::bigint, 0) not between 1 and p_max_bytes then
    raise exception using errcode = '22023', message = 'INVALID_DOCUMENT_SIZE';
  end if;
  if coalesce(v_metadata ->> 'mimetype', '') not in (
    'image/jpeg', 'image/png', 'application/pdf'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_DOCUMENT_MIME';
  end if;
end;
$$;

create or replace function public.finalize_kyc_document(p_doc_type text, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app_private.assert_kyc_editable();
begin
  if p_doc_type not in ('ID_FRONT', 'ID_BACK', 'SELFIE')
     or p_path <> v_user::text || '/' || p_doc_type then
    raise exception using errcode = '22023', message = 'INVALID_DOCUMENT_PATH';
  end if;
  perform app_private.assert_owned_storage_object(
    v_user, 'kyc-documents', p_path, 5242880
  );
  insert into public.kyc_documents (client_id, doc_type, url, verified, uploaded_at)
  values (v_user, p_doc_type, p_path, false, now())
  on conflict (client_id, doc_type) do update set
    url = excluded.url, verified = false, uploaded_at = now();
end;
$$;

create or replace function app_private.guard_financial_document()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'deposit_requests' then
    perform app_private.assert_owned_storage_object(
      new.client_id, 'deposit-proofs', new.proof_url, 10485760
    );
  elsif tg_table_name = 'repayment_requests' then
    perform app_private.assert_owned_storage_object(
      new.client_id, 'repayment-proofs', new.proof_url, 10485760
    );
  elsif tg_table_name = 'loan_request_documents' then
    perform app_private.assert_owned_storage_object(
      new.client_id, 'loan-documents', new.object_path, 10485760
    );
  else
    raise exception using errcode = '22023', message = 'UNSUPPORTED_DOCUMENT_TABLE';
  end if;
  return new;
end;
$$;

drop policy if exists "kyc_docs_client_insert" on public.kyc_documents;
drop policy if exists "kyc_docs_client_update" on public.kyc_documents;
revoke insert, update, delete on table public.kyc_documents from authenticated;

drop trigger if exists trg_verify_deposit_proof on public.deposit_requests;
create trigger trg_verify_deposit_proof
before insert or update of proof_url on public.deposit_requests
for each row execute function app_private.guard_financial_document();

drop trigger if exists trg_verify_repayment_proof on public.repayment_requests;
create trigger trg_verify_repayment_proof
before insert or update of proof_url on public.repayment_requests
for each row execute function app_private.guard_financial_document();

drop trigger if exists trg_verify_loan_document on public.loan_request_documents;
create trigger trg_verify_loan_document
before insert or update of object_path on public.loan_request_documents
for each row execute function app_private.guard_financial_document();

revoke all on function app_private.assert_owned_storage_object(uuid, text, text, bigint)
from public, anon, authenticated;
revoke all on function app_private.guard_financial_document()
from public, anon, authenticated;
revoke all on function public.finalize_kyc_document(text, text) from public, anon;
grant execute on function public.finalize_kyc_document(text, text) to authenticated;
