process.loadEnvFile(".env.local");

const projectRef = "qdmriiokeindzgeokvqj";
const token = process.env.SUPABASE_ACCESS_TOKEN;

async function run() {
  const sql = `
  drop function if exists public.test_execute_found(uuid);

  -- Correction de app_private.credit_wallet (ROW_COUNT au lieu de FOUND sur EXECUTE)
  create or replace function app_private.credit_wallet(
    p_client uuid,
    p_field text,
    p_amount bigint
  )
  returns void
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_rows int;
  begin
    if p_field not in ('free_savings', 'blocked_guarantee', 'mandatory_savings', 'disbursed_loan') then
      raise exception using errcode = '22023', message = 'INVALID_WALLET_FIELD';
    end if;
    if p_amount is null or p_amount <= 0 then
      raise exception using errcode = '22023', message = 'INVALID_AMOUNT';
    end if;

    execute format(
      'update public.wallets set %I = %I + $1, updated_at = now() where client_id = $2',
      p_field,
      p_field
    ) using p_amount, p_client;

    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception using errcode = 'P0002', message = 'WALLET_NOT_FOUND';
    end if;
  end;
  $$;

  -- Supprimer toutes les surcharges conflictuelles de create_loan_request
  drop function if exists public.create_loan_request(uuid, uuid, bigint, integer, text, bigint, text, jsonb, uuid, uuid);
  drop function if exists public.create_loan_request(uuid, uuid, uuid, bigint, integer, text, bigint, text, jsonb, uuid);

  -- Créer la version unique et canonique
  create or replace function public.create_loan_request(
    p_client uuid,
    p_idempotency_key uuid,
    p_product uuid,
    p_amount bigint,
    p_duration integer,
    p_purpose text,
    p_monthly_income bigint default null,
    p_disbursement_method text default 'INTERNAL',
    p_documents jsonb default null,
    p_correlation_id uuid default null
  )
  returns uuid
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_id uuid;
    v_profile public.profiles;
    v_product public.loan_products;
    v_path text;
    v_guarantee bigint;
    v_loan uuid;
    v_total_fees bigint;
    v_fee bigint;
    v_fee_remainder bigint;
    v_mandatory bigint;
    v_mandatory_rate numeric;
    v_terms jsonb;
    v_contract_content jsonb;
    v_auto_approval boolean := false;
    a record;
  begin
    if p_client is null or p_idempotency_key is null then
      raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
    end if;
    select * into strict v_profile from public.profiles where id = p_client and is_active;
    if v_profile.kyc_status <> 'COMPLETED' then
      raise exception using errcode = '42501', message = 'KYC_REQUIRED';
    end if;

    if exists (
      select 1 from public.loan_requests
      where client_id = p_client and status not in ('DISBURSED', 'REJECTED', 'CANCELLED')
    ) or exists (
      select 1 from public.loans
      where client_id = p_client and status in ('ACTIVE', 'DEFAULTED')
    ) then
      raise exception using errcode = 'P0001', message = 'ACTIVE_LOAN_EXISTS';
    end if;

    select * into v_product from public.loan_products where id = p_product and is_active;
    if not found then raise exception using errcode = 'P0002', message = 'PRODUCT_NOT_FOUND'; end if;
    if p_amount < v_product.min_amount or p_amount > v_product.max_amount then
      raise exception using errcode = '22023', message = 'AMOUNT_OUT_OF_RANGE';
    end if;
    if p_duration < v_product.min_duration_months or p_duration > v_product.max_duration_months then
      raise exception using errcode = '22023', message = 'DURATION_OUT_OF_RANGE';
    end if;
    if coalesce(trim(p_purpose), '') = '' then
      raise exception using errcode = '22023', message = 'PURPOSE_REQUIRED';
    end if;

    select id into v_id from public.loan_requests
    where client_id = p_client and idempotency_key = p_idempotency_key;
    if found then return v_id; end if;

    -- Vérifier le mode configuré par l'administrateur
    select coalesce(auto_loan_approval, false) into v_auto_approval
    from public.app_settings where id = true;

    v_guarantee := round(p_amount * coalesce(v_product.guarantee_rate, 0) / 100)::bigint;
    v_terms := app_private.loan_product_terms(v_product);

    if v_auto_approval then
      -- =========================================================================
      -- MODE AUTOMATIQUE (Pré-approbation avec contrat généré pour signature explicite)
      -- =========================================================================
      insert into public.loan_requests (
        client_id, product_id, amount, approved_amount, duration_months, purpose,
        monthly_income_estimate, requested_disbursement_method, status,
        guarantee_required, guarantee_blocked_partial,
        product_terms, product_terms_version,
        disbursed_at, disbursed_by,
        idempotency_key, correlation_id
      ) values (
        p_client, p_product, p_amount, p_amount, p_duration, trim(p_purpose),
        p_monthly_income, 'INTERNAL', 'ACCEPTED',
        v_guarantee, 0,
        v_terms, gen_random_uuid(),
        null, null,
        p_idempotency_key, coalesce(p_correlation_id, gen_random_uuid())
      ) returning id into v_id;

      if p_documents is not null and jsonb_typeof(p_documents) = 'array' then
        for v_path in select jsonb_array_elements_text(p_documents) loop
          if split_part(v_path, '/', 1) <> p_client::text then
            raise exception using errcode = '22023', message = 'INVALID_DOCUMENT_PATH';
          end if;
          insert into public.loan_request_documents (request_id, client_id, object_path)
          values (v_id, p_client, v_path);
        end loop;
      end if;

      -- Génération du contrat prêt pour signature explicite par l'emprunteur
      v_contract_content := jsonb_build_object(
        'schemaVersion', 1,
        'contractNumber', 'MF-' || to_char(current_date, 'YYYY') || '-' || upper(substr(replace(v_id::text, '-', ''), 1, 12)),
        'borrower', jsonb_build_object(
          'clientId', p_client, 'firstname', v_profile.firstname, 'lastname', v_profile.lastname,
          'country', v_profile.country, 'idType', v_profile.id_type, 'idNumber', v_profile.id_number
        ),
        'loan', jsonb_build_object(
          'requestId', v_id, 'principal', p_amount, 'currency', 'XOF',
          'durationMonths', p_duration, 'purpose', trim(p_purpose)
        ),
        'terms', v_terms,
        'clauses', jsonb_build_object(
          'constantInstallments', true, 'automatedInstantApproval', true,
          'oneLiveLoan', true, 'effectiveCostCapPercent', 20,
          'earlyRepaymentFee', 0, 'guaranteeMayBeMobilized', true,
          'jurisdiction', coalesce(v_profile.country, 'Pays de résidence du client')
        )
      );

      insert into public.loan_contracts (
        request_id, client_id, contract_number, terms_version, content, content_hash,
        signed_at, signature_method, signature_idempotency_key, signature_correlation_id
      ) values (
        v_id, p_client, v_contract_content ->> 'contractNumber', gen_random_uuid(),
        v_contract_content, encode(extensions.digest(v_contract_content::text, 'sha256'), 'hex'),
        null, null, null, null
      ) on conflict (request_id) do nothing;

    else
      -- =========================================================================
      -- MODE MANUEL (Workflow institutionnel standard avec examen par agent/comité)
      -- =========================================================================
      insert into public.loan_requests (
        client_id, product_id, amount, approved_amount, duration_months, purpose,
        monthly_income_estimate, requested_disbursement_method, status,
        guarantee_required, guarantee_blocked_partial,
        product_terms, product_terms_version,
        disbursed_at, disbursed_by,
        idempotency_key, correlation_id
      ) values (
        p_client, p_product, p_amount, null, p_duration, trim(p_purpose),
        p_monthly_income, 'INTERNAL', 'SUBMITTED',
        v_guarantee, 0,
        v_terms, gen_random_uuid(),
        null, null,
        p_idempotency_key, coalesce(p_correlation_id, gen_random_uuid())
      ) returning id into v_id;

      if p_documents is not null and jsonb_typeof(p_documents) = 'array' then
        for v_path in select jsonb_array_elements_text(p_documents) loop
          if split_part(v_path, '/', 1) <> p_client::text then
            raise exception using errcode = '22023', message = 'INVALID_DOCUMENT_PATH';
          end if;
          insert into public.loan_request_documents (request_id, client_id, object_path)
          values (v_id, p_client, v_path);
        end loop;
      end if;

    end if;

    return v_id;
  exception when unique_violation then
    select id into v_id from public.loan_requests
    where client_id = p_client and idempotency_key = p_idempotency_key;
    if v_id is null then raise; end if;
    return v_id;
  end;
  $$;

  revoke all on function public.create_loan_request(uuid, uuid, uuid, bigint, integer, text, bigint, text, jsonb, uuid)
  from public, anon, authenticated;
  grant execute on function public.create_loan_request(uuid, uuid, uuid, bigint, integer, text, bigint, text, jsonb, uuid)
  to service_role;
  `;

  console.log("Removing conflicting overloads and updating canonical create_loan_request...");
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const res = await response.json();
  if (!response.ok) {
    console.error("Failed:", res);
    process.exit(1);
  }
  console.log("Success! Conflicting overloads dropped.");
}

run().catch(console.error);
