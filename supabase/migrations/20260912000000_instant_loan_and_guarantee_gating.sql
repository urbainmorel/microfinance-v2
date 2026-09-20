-- 20260912000000_instant_loan_and_guarantee_gating.sql
-- 1. Approbation automatique et versement immédiat du prêt dans le portefeuille
-- 2. Dépôt de garantie via Mobile Money
-- 3. Conditionnement du retrait des fonds de prêt à la constitution de la garantie
-- 4. Éligibilité de retrait et statut de prêt enrichi

-- ============================================================================
-- 1. check_guarantee_completion & process_guarantee_blocking ajustés
-- ============================================================================
create or replace function app_private.check_guarantee_completion(p_client uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.loan_requests;
  v_blocked bigint;
begin
  select * into r from public.loan_requests
  where client_id = p_client and status in ('ACCEPTED', 'GUARANTEE_PENDING', 'DISBURSED')
  order by created_at desc limit 1 for update;
  if not found then return; end if;

  select blocked_guarantee into v_blocked from public.wallets where client_id = p_client for update;
  update public.loan_requests set
    guarantee_blocked_partial = least(coalesce(r.guarantee_required, 0), coalesce(v_blocked, 0)),
    updated_at = now()
  where id = r.id;
end;
$$;

create or replace function public.process_guarantee_blocking(
  p_client uuid,
  p_request uuid,
  p_idempotency_key uuid,
  p_correlation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.loan_requests;
  v_remaining bigint;
  v_move bigint;
  v_available_free bigint;
  v_existing uuid;
begin
  if p_client is null or p_request is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;

  insert into app_private.client_command_receipts (
    client_id, action, idempotency_key, target_id, result_status, correlation_id
  ) values (
    p_client, 'guarantee.block', p_idempotency_key, p_request,
    'GUARANTEE_PENDING', p_correlation_id
  ) on conflict (client_id, action, idempotency_key) do nothing;

  if not found then
    select target_id into v_existing
    from app_private.client_command_receipts
    where client_id = p_client and action = 'guarantee.block'
      and idempotency_key = p_idempotency_key;
    if v_existing <> p_request then
      raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED';
    end if;
    return v_existing;
  end if;

  select * into r from public.loan_requests
  where id = p_request and client_id = p_client
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'REQUEST_NOT_FOUND'; end if;

  v_remaining := greatest(coalesce(r.guarantee_required, 0) - coalesce(r.guarantee_blocked_partial, 0), 0);
  if v_remaining = 0 then
    return r.id;
  end if;

  select greatest(free_savings - coalesce(reserved_amount, 0), 0)
  into v_available_free
  from public.wallets where client_id = p_client for update;

  v_move := least(coalesce(v_available_free, 0), v_remaining);
  if v_move <= 0 then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_FUNDS';
  end if;

  update public.wallets set
    free_savings = free_savings - v_move,
    blocked_guarantee = blocked_guarantee + v_move,
    updated_at = now()
  where client_id = p_client;

  update public.loan_requests set
    guarantee_blocked_partial = guarantee_blocked_partial + v_move,
    correlation_id = coalesce(p_correlation_id, correlation_id),
    updated_at = now()
  where id = r.id;

  return r.id;
end;
$$;

-- ============================================================================
-- 2. create_deposit_request restreint à MOBILE_MONEY
-- ============================================================================
create or replace function public.create_deposit_request(
  p_client uuid,
  p_amount bigint,
  p_motif text,
  p_payment_method text,
  p_reference text,
  p_proof_path text,
  p_idempotency_key uuid,
  p_correlation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_client is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  select id into v_id
  from public.deposit_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  if found then return v_id; end if;

  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'INVALID_AMOUNT';
  end if;
  if p_motif not in ('FREE_SAVINGS', 'GUARANTEE', 'REPAYMENT') then
    raise exception using errcode = '22023', message = 'INVALID_MOTIF';
  end if;
  if p_payment_method <> 'MOBILE_MONEY' then
    raise exception using errcode = '22023', message = 'ONLY_MOBILE_MONEY_ALLOWED';
  end if;
  if p_proof_path is null or p_proof_path = '' or split_part(p_proof_path, '/', 1) <> p_client::text then
    raise exception using errcode = '22023', message = 'INVALID_PROOF_PATH';
  end if;

  insert into public.deposit_requests (
    client_id, amount, motif, payment_method, reference, proof_url,
    idempotency_key, correlation_id
  ) values (
    p_client, p_amount, p_motif, p_payment_method, nullif(trim(p_reference), ''),
    p_proof_path, p_idempotency_key, coalesce(p_correlation_id, gen_random_uuid())
  ) returning id into v_id;
  return v_id;
exception when unique_violation then
  select id into v_id from public.deposit_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  return v_id;
end;
$$;

-- ============================================================================
-- 3. create_loan_request : Approbation et versement automatiques et immédiats
-- ============================================================================
create or replace function public.create_loan_request(
  p_client uuid,
  p_product uuid,
  p_amount bigint,
  p_duration int,
  p_purpose text,
  p_monthly_income bigint,
  p_disbursement_method text,
  p_documents jsonb,
  p_idempotency_key uuid,
  p_correlation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_product public.loan_products;
  v_profile public.profiles;
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

  v_guarantee := round(p_amount * coalesce(v_product.guarantee_rate, 0) / 100)::bigint;
  v_terms := app_private.loan_product_terms(v_product);

  insert into public.loan_requests (
    client_id, product_id, amount, approved_amount, duration_months, purpose,
    monthly_income_estimate, requested_disbursement_method, status,
    guarantee_required, guarantee_blocked_partial,
    product_terms, product_terms_version,
    disbursed_at, disbursed_by,
    idempotency_key, correlation_id
  ) values (
    p_client, p_product, p_amount, p_amount, p_duration, trim(p_purpose),
    p_monthly_income, 'INTERNAL', 'DISBURSED',
    v_guarantee, 0,
    v_terms, gen_random_uuid(),
    now(), p_client,
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

  -- 3.1 Génération et signature automatique du contrat
  v_contract_content := jsonb_build_object(
    'schemaVersion', 1,
    'contractNumber', 'MF-' || to_char(current_date, 'YYYY') || '-' || upper(substr(replace(v_id::text, '-', ''), 1, 12)),
    'borrower', jsonb_build_object(
      'clientId', p_client, 'firstname', v_profile.firstname, 'lastname', v_profile.lastname,
      'country', v_profile.country, 'idType', v_profile.id_type, 'idNumber', v_profile.id_number
    ),
    'loan', jsonb_build_object(
      'requestId', v_id, 'principal', p_amount, 'currency', 'XOF',
      'durationMonths', p_duration, 'purpose', trim(p_purpose),
      'disbursementMethod', 'INTERNAL'
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
    now(), 'PIN', p_idempotency_key, coalesce(p_correlation_id, gen_random_uuid())
  ) on conflict (request_id) do nothing;

  -- 3.2 Création du prêt actif
  insert into public.loans (
    request_id, client_id, total_amount, remaining_principal, interest_rate,
    interest_method, start_date, end_date, status
  ) values (
    v_id, p_client, p_amount, p_amount, v_product.interest_rate,
    v_product.interest_method, current_date,
    (current_date + make_interval(months => p_duration))::date, 'ACTIVE'
  ) returning id into v_loan;

  -- 3.3 Création de l'échéancier
  v_mandatory_rate := coalesce(v_product.mandatory_savings_rate, 0);
  v_total_fees := round(p_amount * coalesce(v_product.processing_fee_percent, 0) / 100)::bigint
    + coalesce(v_product.processing_fee_flat, 0)
    + round(p_amount * coalesce(v_product.management_fee_percent, 0) / 100)::bigint
    + coalesce(v_product.management_fee_flat, 0)
    + round(p_amount * coalesce(v_product.insurance_rate, 0) / 100)::bigint;
  v_fee := v_total_fees / p_duration;
  v_fee_remainder := v_total_fees - v_fee * p_duration;

  for a in select * from public.amortization_rows(
    p_amount, (v_product.interest_rate / 12.0) / 100.0, p_duration, v_product.interest_method
  ) loop
    v_mandatory := round((a.due_principal + a.due_interest + v_fee
      + case when a.installment_no = p_duration then v_fee_remainder else 0 end)
      * v_mandatory_rate / 100)::bigint;
    insert into public.amortization_schedules (
      loan_id, installment_no, due_date, due_principal, due_interest, due_fees, due_mandatory_savings
    ) values (
      v_loan, a.installment_no, (current_date + make_interval(months => a.installment_no))::date,
      a.due_principal, a.due_interest,
      v_fee + case when a.installment_no = p_duration then v_fee_remainder else 0 end,
      v_mandatory
    );
  end loop;

  -- 3.4 Crédit immédiat des fonds dans le portefeuille
  insert into public.wallets (client_id) values (p_client) on conflict (client_id) do nothing;
  perform app_private.credit_wallet(p_client, 'disbursed_loan', p_amount);

  return v_id;
exception when unique_violation then
  select id into v_id from public.loan_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  if v_id is null then raise; end if;
  return v_id;
end;
$$;

-- ============================================================================
-- 4. create_client_withdrawal : Conditionnement du retrait à la garantie
-- ============================================================================
create or replace function public.create_client_withdrawal(
  p_client uuid,
  p_type text,
  p_amount bigint,
  p_recipient jsonb,
  p_idempotency_key uuid,
  p_correlation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_wallet public.wallets;
  v_guarantee_needed bigint := 0;
  v_guarantee_pending boolean := false;
  v_withdrawable bigint;
begin
  if p_client is null or p_idempotency_key is null or p_recipient is null then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'INVALID_AMOUNT';
  end if;
  if p_type not in ('MOBILE_MONEY', 'BANK_TRANSFER') then
    raise exception using errcode = '22023', message = 'INVALID_WITHDRAWAL_TYPE';
  end if;
  if coalesce(trim(p_recipient ->> 'name'), '') = '' then
    raise exception using errcode = '22023', message = 'RECIPIENT_NAME_REQUIRED';
  end if;
  if p_type = 'BANK_TRANSFER' and (
    p_recipient ->> 'country' not in ('BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG')
    or coalesce(trim(p_recipient ->> 'bank'), '') = ''
    or coalesce(trim(p_recipient ->> 'bankCode'), '') = ''
    or coalesce(trim(p_recipient ->> 'account'), '') = ''
    or coalesce(trim(p_recipient ->> 'motif'), '') = ''
  ) then
    raise exception using errcode = '22023', message = 'INVALID_BANK_RECIPIENT';
  end if;
  if p_type = 'MOBILE_MONEY' and (
    coalesce(trim(p_recipient ->> 'operator'), '') = ''
    or coalesce(trim(p_recipient ->> 'phone'), '') = ''
  ) then
    raise exception using errcode = '22023', message = 'INVALID_MOMO_RECIPIENT';
  end if;

  select id into v_id from public.withdrawal_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  if found then return v_id; end if;

  select * into v_wallet from public.wallets
  where client_id = p_client for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'WALLET_NOT_FOUND';
  end if;

  -- Vérification si un prêt actif a une garantie requise non encore couverte
  select coalesce(r.guarantee_required, 0) into v_guarantee_needed
  from public.loans l
  join public.loan_requests r on r.id = l.request_id
  where l.client_id = p_client and l.status in ('ACTIVE', 'DEFAULTED')
  order by l.created_at desc limit 1;

  if v_guarantee_needed > 0 and coalesce(v_wallet.blocked_guarantee, 0) < v_guarantee_needed then
    v_guarantee_pending := true;
  end if;

  if v_guarantee_pending then
    -- Seule l'épargne libre est retirable, les fonds du prêt sont verrouillés
    v_withdrawable := greatest(coalesce(v_wallet.free_savings, 0) - coalesce(v_wallet.reserved_amount, 0), 0);
    if p_amount > v_withdrawable then
      raise exception using errcode = 'P0001', message = 'GUARANTEE_REQUIRED_FOR_LOAN_WITHDRAWAL';
    end if;
  else
    v_withdrawable := greatest(coalesce(v_wallet.free_savings, 0) + coalesce(v_wallet.disbursed_loan, 0) - coalesce(v_wallet.reserved_amount, 0), 0);
    if p_amount > v_withdrawable then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_FUNDS';
    end if;
  end if;

  update public.wallets
  set reserved_amount = reserved_amount + p_amount, updated_at = now()
  where client_id = p_client;

  insert into public.withdrawal_requests (
    client_id, type, amount, recipient_operator, recipient_phone,
    recipient_bank, recipient_account, recipient_name, recipient_country,
    recipient_bank_code, recipient_iban, motif, idempotency_key, correlation_id
  ) values (
    p_client, p_type, p_amount, nullif(trim(p_recipient ->> 'operator'), ''),
    nullif(trim(p_recipient ->> 'phone'), ''), nullif(trim(p_recipient ->> 'bank'), ''),
    nullif(trim(p_recipient ->> 'account'), ''), trim(p_recipient ->> 'name'),
    nullif(trim(p_recipient ->> 'country'), ''), nullif(trim(p_recipient ->> 'bankCode'), ''),
    nullif(trim(p_recipient ->> 'iban'), ''), nullif(trim(p_recipient ->> 'motif'), ''),
    p_idempotency_key, coalesce(p_correlation_id, gen_random_uuid())
  ) returning id into v_id;

  return v_id;
exception when unique_violation then
  select id into v_id from public.withdrawal_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  return v_id;
end;
$$;

-- ============================================================================
-- 5. get_active_loan_status enrichi avec état de garantie et retraits
-- ============================================================================
create or replace function public.get_active_loan_status()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  r public.loan_requests;
  l public.loans;
  w public.wallets;
  v_has_payment boolean;
  v_signed boolean;
  v_guar_req bigint;
  v_guar_blocked bigint;
  v_guar_satisfied boolean;
  v_withdrawable bigint;
begin
  select * into w from public.wallets where client_id = auth.uid();

  select * into l from public.loans where client_id = auth.uid() and status in ('ACTIVE', 'DEFAULTED')
  order by created_at desc limit 1;

  if found then
    select * into r from public.loan_requests where id = l.request_id;
    v_guar_req := coalesce(r.guarantee_required, 0);
    v_guar_blocked := coalesce(w.blocked_guarantee, 0);
    v_guar_satisfied := (v_guar_blocked >= v_guar_req);
    v_withdrawable := case
      when v_guar_satisfied then greatest(coalesce(w.free_savings, 0) + coalesce(w.disbursed_loan, 0) - coalesce(w.reserved_amount, 0), 0)
      else greatest(coalesce(w.free_savings, 0) - coalesce(w.reserved_amount, 0), 0)
    end;

    select exists(select 1 from public.repayment_requests where loan_id = l.id and status = 'CONFIRMED') into v_has_payment;
    return jsonb_build_object(
      'displayState', case when v_has_payment then 8 else 7 end,
      'loanId', l.id,
      'requestId', r.id,
      'status', l.status,
      'remainingPrincipal', l.remaining_principal,
      'totalAmount', l.total_amount,
      'guaranteeRequired', v_guar_req,
      'guaranteeBlocked', v_guar_blocked,
      'guaranteeSatisfied', v_guar_satisfied,
      'remainingGuarantee', greatest(v_guar_req - v_guar_blocked, 0),
      'freeSavings', coalesce(w.free_savings, 0),
      'disbursedLoan', coalesce(w.disbursed_loan, 0),
      'withdrawableAmount', v_withdrawable
    );
  end if;

  select * into r from public.loan_requests where client_id = auth.uid()
    and status not in ('DRAFT', 'CANCELLED') order by created_at desc limit 1;
  if found then
    select exists(select 1 from public.loan_contracts where request_id = r.id and signed_at is not null) into v_signed;
    v_guar_req := coalesce(r.guarantee_required, 0);
    v_guar_blocked := coalesce(w.blocked_guarantee, 0);
    v_guar_satisfied := (v_guar_blocked >= v_guar_req);
    v_withdrawable := case
      when v_guar_satisfied then greatest(coalesce(w.free_savings, 0) + coalesce(w.disbursed_loan, 0) - coalesce(w.reserved_amount, 0), 0)
      else greatest(coalesce(w.free_savings, 0) - coalesce(w.reserved_amount, 0), 0)
    end;
    return jsonb_build_object(
      'displayState', case
        when r.status in ('SUBMITTED', 'IN_ANALYSIS', 'PRE_APPROVED') then 2
        when r.status = 'INFO_REQUESTED' then 3
        when r.status = 'ACCEPTED' then 4
        when r.status = 'GUARANTEE_PENDING' then 5
        when r.status in ('GUARANTEE_COMPLETE', 'AWAITING_DISBURSEMENT') then 6
        when r.status = 'DISBURSED' then 7
        when r.status = 'REJECTED' then 10
        else 1 end,
      'requestId', r.id,
      'status', r.status,
      'contractSigned', v_signed,
      'guaranteeRequired', v_guar_req,
      'guaranteeBlocked', v_guar_blocked,
      'guaranteeSatisfied', v_guar_satisfied,
      'remainingGuarantee', greatest(v_guar_req - v_guar_blocked, 0),
      'freeSavings', coalesce(w.free_savings, 0),
      'disbursedLoan', coalesce(w.disbursed_loan, 0),
      'withdrawableAmount', v_withdrawable
    );
  end if;

  select * into l from public.loans where client_id = auth.uid() and status = 'CLOSED'
  order by created_at desc limit 1;
  if found then
    return jsonb_build_object(
      'displayState', 9,
      'loanId', l.id,
      'status', l.status,
      'guaranteeSatisfied', true,
      'remainingGuarantee', 0,
      'freeSavings', coalesce(w.free_savings, 0),
      'disbursedLoan', coalesce(w.disbursed_loan, 0),
      'withdrawableAmount', greatest(coalesce(w.free_savings, 0) + coalesce(w.disbursed_loan, 0) - coalesce(w.reserved_amount, 0), 0)
    );
  end if;

  return jsonb_build_object(
    'displayState', 1,
    'guaranteeSatisfied', true,
    'remainingGuarantee', 0,
    'freeSavings', coalesce(w.free_savings, 0),
    'disbursedLoan', coalesce(w.disbursed_loan, 0),
    'withdrawableAmount', greatest(coalesce(w.free_savings, 0) + coalesce(w.disbursed_loan, 0) - coalesce(w.reserved_amount, 0), 0)
  );
end;
$$;

-- ============================================================================
-- 6. confirm_deposit : Validation des dépôts de garantie sur prêt actif
-- ============================================================================
create or replace function public.confirm_deposit(
  p_request uuid,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.deposit_requests;
  v_actor uuid := auth.uid();
begin
  perform app_private.require_active_staff(array['agent_caisse', 'admin', 'super_admin']);
  if p_action not in ('CONFIRM', 'REJECT') then
    raise exception using errcode = '22023', message = 'INVALID_ACTION';
  end if;
  if p_action = 'REJECT' and coalesce(trim(p_reason), '') = '' then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;

  update public.deposit_requests
  set status = case when p_action = 'CONFIRM' then 'CONFIRMED' else 'REJECTED' end,
      confirmed_by = v_actor,
      confirmed_at = case when p_action = 'CONFIRM' then now() else null end,
      rejected_reason = case when p_action = 'REJECT' then trim(p_reason) else null end
  where id = p_request and status = 'PENDING'
  returning * into r;
  if not found then
    raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED';
  end if;

  if p_action = 'CONFIRM' then
    if r.motif = 'FREE_SAVINGS' then
      perform app_private.credit_wallet(r.client_id, 'free_savings', r.amount);
    elsif r.motif = 'GUARANTEE' then
      perform app_private.credit_wallet(r.client_id, 'blocked_guarantee', r.amount);
      perform app_private.check_guarantee_completion(r.client_id);
    else
      perform app_private.apply_repayment(r.client_id, r.amount, r.id);
    end if;
  end if;
end;
$$;

-- ============================================================================
-- 7. settle_withdrawal : Respect de la réserve de garantie lors de l'exécution
-- ============================================================================
create or replace function public.settle_withdrawal(
  p_request uuid,
  p_action text,
  p_reference text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.withdrawal_requests;
  v_actor uuid := auth.uid();
  v_from_loan bigint;
  v_hour int;
  v_start int;
  v_end int;
  v_guarantee_needed bigint := 0;
  v_wallet public.wallets;
begin
  perform app_private.require_active_staff(array['agent_caisse', 'admin', 'super_admin']);
  if p_action not in ('EXECUTE', 'REJECT') then
    raise exception using errcode = '22023', message = 'INVALID_ACTION';
  end if;
  if p_action = 'EXECUTE' and coalesce(trim(p_reference), '') = '' then
    raise exception using errcode = '22023', message = 'REFERENCE_REQUIRED';
  end if;
  if p_action = 'REJECT' and coalesce(trim(p_reason), '') = '' then
    raise exception using errcode = '22023', message = 'REASON_REQUIRED';
  end if;

  select * into r from public.withdrawal_requests where id = p_request for update;
  if not found or r.status <> 'PENDING' then
    raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED';
  end if;

  if p_action = 'EXECUTE' then
    select withdrawal_window_start, withdrawal_window_end into v_start, v_end
    from public.app_settings where id;
    v_hour := extract(hour from now() at time zone 'Africa/Abidjan');
    if not public.withdrawal_hour_open(v_hour, v_start, v_end) then
      raise exception using errcode = 'P0001', message = 'OUTSIDE_WINDOW';
    end if;

    select coalesce(r_lr.guarantee_required, 0) into v_guarantee_needed
    from public.loans l
    join public.loan_requests r_lr on r_lr.id = l.request_id
    where l.client_id = r.client_id and l.status in ('ACTIVE', 'DEFAULTED')
    order by l.created_at desc limit 1;

    select * into v_wallet from public.wallets where client_id = r.client_id for update;

    if v_guarantee_needed > 0 and coalesce(v_wallet.blocked_guarantee, 0) < v_guarantee_needed then
      -- Retrait de l'épargne libre uniquement car garantie non encore constituée
      v_from_loan := 0;
      if r.amount > coalesce(v_wallet.free_savings, 0) then
        raise exception using errcode = 'P0001', message = 'INSUFFICIENT_FUNDS';
      end if;
    else
      v_from_loan := least(r.amount, coalesce(v_wallet.disbursed_loan, 0));
    end if;

    update public.wallets set
      disbursed_loan = disbursed_loan - v_from_loan,
      free_savings = free_savings - (r.amount - v_from_loan),
      reserved_amount = reserved_amount - r.amount,
      updated_at = now()
    where client_id = r.client_id and reserved_amount >= r.amount;

    update public.withdrawal_requests set
      status = 'COMPLETED', processed_by = v_actor,
      external_reference = trim(p_reference), updated_at = now()
    where id = p_request;
  else
    update public.wallets set reserved_amount = reserved_amount - r.amount, updated_at = now()
    where client_id = r.client_id and reserved_amount >= r.amount;

    update public.withdrawal_requests set
      status = 'REJECTED', processed_by = v_actor,
      rejected_reason = trim(p_reason), updated_at = now()
    where id = p_request;
  end if;
end;
$$;

-- ============================================================================
-- 8. Permissions
-- ============================================================================
grant execute on function public.create_loan_request(uuid, uuid, bigint, int, text, bigint, text, jsonb, uuid, uuid) to service_role;
grant execute on function public.create_client_withdrawal(uuid, text, bigint, jsonb, uuid, uuid) to service_role;
grant execute on function public.create_deposit_request(uuid, bigint, text, text, text, text, uuid, uuid) to service_role;
grant execute on function public.process_guarantee_blocking(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.get_active_loan_status() to authenticated;
grant execute on function public.confirm_deposit(uuid, text, text) to authenticated;
grant execute on function public.settle_withdrawal(uuid, text, text, text) to authenticated;
