-- Migration : Mode d'approbation des prêts (Automatique vs Manuel) configurable par l'admin
-- 1. Ajout de la colonne auto_loan_approval dans app_settings
alter table public.app_settings
  add column if not exists auto_loan_approval boolean not null default false;

-- 2. Mise à jour de update_app_settings pour supporter autoLoanApproval
create or replace function public.update_app_settings(p_values jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  perform app_private.require_active_staff(array['admin']);
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;

  select to_jsonb(s) into v_old from public.app_settings s where id for update;

  update public.app_settings set
    platform_name = coalesce(nullif(trim(p_values ->> 'platformName'), ''), platform_name),
    auto_loan_approval = coalesce((p_values ->> 'autoLoanApproval')::boolean, auto_loan_approval),
    withdrawal_window_start = coalesce((p_values ->> 'withdrawalWindowStart')::int, withdrawal_window_start),
    withdrawal_window_end = coalesce((p_values ->> 'withdrawalWindowEnd')::int, withdrawal_window_end),
    default_after_days = coalesce((p_values ->> 'defaultAfterDays')::int, default_after_days),
    withdrawal_fee = coalesce((p_values ->> 'withdrawalFee')::bigint, withdrawal_fee),
    transfer_fee = coalesce((p_values ->> 'transferFee')::bigint, transfer_fee),
    kyc_retention_days = coalesce((p_values ->> 'kycRetentionDays')::int, kyc_retention_days),
    audit_retention_days = coalesce((p_values ->> 'auditRetentionDays')::int, audit_retention_days),
    updated_at = now()
  where id;

  select to_jsonb(s) into v_new from public.app_settings s where id;

  insert into public.audit_logs (
    user_id, user_role, action_type, old_value, new_value, reason
  ) values (
    auth.uid(),
    'admin',
    'APP_SETTINGS_UPDATED',
    v_old,
    v_new,
    'Mise à jour du paramétrage général (dont mode d’approbation des prêts)'
  );
end;
$$;

revoke all on function public.update_app_settings(jsonb) from public, anon;
grant execute on function public.update_app_settings(jsonb) to authenticated;

-- 2.5 Correction de app_private.credit_wallet pour PL/pgSQL dynamic SQL (ROW_COUNT au lieu de FOUND)
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

-- 3. Mise à jour de create_loan_request pour respecter le mode auto_loan_approval
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

  -- 1. Idempotence : Si cette même requête avec cette clé a déjà été soumise, on la retourne immédiatement
  select id into v_id from public.loan_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  if found then return v_id; end if;

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

-- 4. Mise à jour de sign_loan_contract pour décaisser automatiquement lors de la signature en mode automatique
create or replace function public.sign_loan_contract(
  p_client uuid, p_request uuid, p_idempotency_key uuid, p_correlation_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_contract public.loan_contracts;
  r public.loan_requests;
  v_auto_approval boolean := false;
  v_amount bigint;
  v_interest numeric;
  v_method text;
  v_total_fees bigint;
  v_fee bigint;
  v_fee_remainder bigint;
  v_mandatory bigint;
  v_mandatory_rate numeric;
  v_loan uuid;
  a record;
begin
  if p_client is null or p_request is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  select * into v_contract from public.loan_contracts
  where request_id = p_request and client_id = p_client for update;
  if not found then raise exception using errcode = 'P0002', message = 'CONTRACT_NOT_FOUND'; end if;
  if v_contract.signed_at is not null then return v_contract.id; end if;

  update public.loan_contracts set signed_at = now(), signature_method = 'PIN',
    signature_idempotency_key = p_idempotency_key,
    signature_correlation_id = coalesce(p_correlation_id, gen_random_uuid())
  where id = v_contract.id;

  select * into r from public.loan_requests where id = p_request for update;

  select coalesce(auto_loan_approval, false) into v_auto_approval from public.app_settings where id = true;
  if v_auto_approval or coalesce((v_contract.content -> 'clauses' ->> 'automatedInstantApproval')::boolean, false) is true then
    -- Décaissement et versement direct sur le portefeuille dès signature
    v_amount := coalesce(r.approved_amount, r.amount);
    v_interest := (r.product_terms ->> 'interestRate')::numeric;
    v_method := r.product_terms ->> 'interestMethod';
    v_mandatory_rate := coalesce((r.product_terms ->> 'mandatorySavingsRate')::numeric, 0);

    insert into public.loans (
      request_id, client_id, total_amount, remaining_principal, interest_rate,
      interest_method, start_date, end_date, status
    ) values (
      r.id, r.client_id, v_amount, v_amount, v_interest, v_method, current_date,
      (current_date + make_interval(months => r.duration_months))::date, 'ACTIVE'
    ) returning id into v_loan;

    v_total_fees := round(v_amount * coalesce((r.product_terms ->> 'processingFeePercent')::numeric, 0) / 100)::bigint
      + coalesce((r.product_terms ->> 'processingFeeFlat')::bigint, 0)
      + round(v_amount * coalesce((r.product_terms ->> 'managementFeePercent')::numeric, 0) / 100)::bigint
      + coalesce((r.product_terms ->> 'managementFeeFlat')::bigint, 0)
      + round(v_amount * coalesce((r.product_terms ->> 'insuranceRate')::numeric, 0) / 100)::bigint;
    v_fee := v_total_fees / r.duration_months;
    v_fee_remainder := v_total_fees - v_fee * r.duration_months;

    for a in select * from public.amortization_rows(
      v_amount, (v_interest / 12.0) / 100.0, r.duration_months, v_method
    ) loop
      v_mandatory := round((a.due_principal + a.due_interest + v_fee
        + case when a.installment_no = r.duration_months then v_fee_remainder else 0 end)
        * v_mandatory_rate / 100)::bigint;
      insert into public.amortization_schedules (
        loan_id, installment_no, due_date, due_principal, due_interest, due_fees, due_mandatory_savings
      ) values (
        v_loan, a.installment_no, (current_date + make_interval(months => a.installment_no))::date,
        a.due_principal, a.due_interest,
        v_fee + case when a.installment_no = r.duration_months then v_fee_remainder else 0 end,
        v_mandatory
      );
    end loop;

    insert into public.wallets (client_id) values (r.client_id) on conflict (client_id) do nothing;
    perform app_private.credit_wallet(r.client_id, 'disbursed_loan', v_amount);

    update public.loan_requests set
      status = 'DISBURSED',
      disbursed_at = now(),
      disbursed_by = p_client,
      updated_at = now()
    where id = r.id;

  else
    update public.loan_requests set status = 'GUARANTEE_COMPLETE'
    where id = p_request and status = 'ACCEPTED' and coalesce(guarantee_required, 0) = 0;
  end if;

  return v_contract.id;
exception when unique_violation then
  select id into v_contract.id from public.loan_contracts
  where client_id = p_client and signature_idempotency_key = p_idempotency_key;
  return v_contract.id;
end;
$$;

revoke all on function public.sign_loan_contract(uuid, uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.sign_loan_contract(uuid, uuid, uuid, uuid)
to service_role;

-- 5. Correction de app_private.status_notification_trigger pour éviter l'erreur "record new has no field total_amount"
create or replace function app_private.status_notification_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_status text;
  v_event text;
  v_title text;
  v_body text;
  v_amount bigint;
  v_json jsonb;
begin
  if tg_table_name = 'profiles' then
    if new.kyc_status is not distinct from old.kyc_status then return new; end if;
    v_user := new.id;
    v_status := lower(new.kyc_status);
    v_event := 'kyc_' || v_status;
    v_title := case new.kyc_status when 'COMPLETED' then 'KYC validé'
      when 'REJECTED' then 'KYC rejeté' else 'Informations KYC requises' end;
    v_body := 'Le statut de votre dossier KYC a changé.';
  else
    if new.status is not distinct from old.status then return new; end if;
    v_user := new.client_id;
    v_status := lower(new.status::text);
    v_event := tg_table_name || '_' || v_status;
    v_json := to_jsonb(new);
    v_amount := coalesce(
      (v_json ->> 'approved_amount')::bigint,
      (v_json ->> 'total_amount')::bigint,
      (v_json ->> 'amount')::bigint
    );
    v_title := case
      when tg_table_name = 'deposit_requests' then 'Mise à jour de votre dépôt'
      when tg_table_name = 'withdrawal_requests' then 'Mise à jour de votre retrait'
      when tg_table_name = 'repayment_requests' then 'Mise à jour de votre remboursement'
      else 'Mise à jour de votre prêt' end;
    v_body := 'Nouveau statut : ' || new.status::text;
  end if;

  perform app_private.enqueue_notification(
    v_user, v_event, v_title, v_body,
    jsonb_strip_nulls(jsonb_build_object(
      'reference', new.id,
      'status', v_status,
      'amount', v_amount
    )),
    tg_table_name || ':' || new.id::text || ':' || v_status
  );
  return new;
end;
$$;

