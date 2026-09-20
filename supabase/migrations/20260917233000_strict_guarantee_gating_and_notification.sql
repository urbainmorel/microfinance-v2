-- 20260917233000_strict_guarantee_gating_and_notification.sql
-- 1. Modèle d'email loan_guarantee_required
-- 2. Interdiction stricte de tout retrait sans garantie constituée (create_client_withdrawal)
-- 3. Solde retirable nul si garantie non satisfaite (get_active_loan_status)
-- 4. Déclenchement automatique de notification email et in-app à la signature (sign_loan_contract)

-- ============================================================================
-- 1. Modèle d'email dans public.notification_templates
-- ============================================================================
insert into public.notification_templates (slug, language, subject, body_html, variables)
values (
  'loan_guarantee_required',
  'fr',
  'Action requise : Constitution de votre garantie de prêt',
  '<p>Bonjour {{client_firstname}},</p><p>Votre prêt de <strong>{{amount}} FCFA</strong> a bien été accordé et versé sur votre compte.</p><p>Pour activer le retrait de vos fonds, vous devez constituer votre dépôt de garantie obligatoire d''un montant de <strong>{{guarantee_amount}} FCFA</strong>.</p><p>Vous pouvez effectuer ce dépôt directement par Mobile Money depuis votre espace client.</p><p>Ce montant reste votre propriété et vous sera intégralement restitué à la fin de votre prêt.</p>',
  '["client_firstname", "amount", "guarantee_amount"]'
) on conflict (slug, language) do update set
  subject = excluded.subject,
  body_html = excluded.body_html,
  variables = excluded.variables;

-- ============================================================================
-- 2. create_client_withdrawal : Verrouillage strict de TOUT retrait sans garantie
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

  -- 1. Vérification stricte : le retrait est STRICTEMENT IMPOSSIBLE si un prêt a une garantie non encore couverte
  select coalesce(r.guarantee_required, 0) into v_guarantee_needed
  from public.loans l
  join public.loan_requests r on r.id = l.request_id
  where l.client_id = p_client and l.status in ('ACTIVE', 'DEFAULTED')
  order by l.created_at desc limit 1;

  if v_guarantee_needed is null or v_guarantee_needed = 0 then
    select coalesce(r.guarantee_required, 0) into v_guarantee_needed
    from public.loan_requests r
    where r.client_id = p_client and r.status in ('ACCEPTED', 'GUARANTEE_PENDING', 'DISBURSED')
    order by r.created_at desc limit 1;
  end if;

  if coalesce(v_guarantee_needed, 0) > 0 and coalesce(v_wallet.blocked_guarantee, 0) < v_guarantee_needed then
    v_guarantee_pending := true;
  end if;

  if v_guarantee_pending then
    raise exception using errcode = 'P0001', message = 'GUARANTEE_REQUIRED_BEFORE_WITHDRAWAL';
  end if;

  v_withdrawable := greatest(coalesce(v_wallet.free_savings, 0) + coalesce(v_wallet.disbursed_loan, 0) - coalesce(v_wallet.reserved_amount, 0), 0);
  if p_amount > v_withdrawable then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_FUNDS';
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

revoke all on function public.create_client_withdrawal(uuid, text, bigint, jsonb, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.create_client_withdrawal(uuid, text, bigint, jsonb, uuid, uuid)
to service_role;

-- ============================================================================
-- 3. get_active_loan_status : Solde retirable strictement à 0 si garantie non satisfaite
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
      else 0
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
      else 0
    end;
    return jsonb_build_object(
      'displayState', case
        when r.status in ('SUBMITTED', 'IN_ANALYSIS', 'PRE_APPROVED') then 2
        when r.status = 'INFO_REQUESTED' then 3
        when r.status = 'REJECTED' then 10
        when r.status in ('ACCEPTED', 'GUARANTEE_PENDING') and not v_signed then 4
        when r.status in ('ACCEPTED', 'GUARANTEE_PENDING') and v_signed and not v_guar_satisfied then 5
        when r.status in ('GUARANTEE_COMPLETE', 'AWAITING_DISBURSEMENT') or (v_signed and v_guar_satisfied) then 6
        when r.status = 'DISBURSED' then 7
        else 1
      end,
      'contractSigned', v_signed,
      'requestId', r.id,
      'status', r.status,
      'totalAmount', coalesce(r.approved_amount, r.amount),
      'guaranteeRequired', v_guar_req,
      'guaranteeBlocked', v_guar_blocked,
      'guaranteeSatisfied', v_guar_satisfied,
      'remainingGuarantee', greatest(v_guar_req - v_guar_blocked, 0),
      'freeSavings', coalesce(w.free_savings, 0),
      'disbursedLoan', coalesce(w.disbursed_loan, 0),
      'withdrawableAmount', v_withdrawable
    );
  end if;

  return jsonb_build_object(
    'displayState', 1,
    'guaranteeRequired', 0,
    'guaranteeBlocked', coalesce(w.blocked_guarantee, 0),
    'guaranteeSatisfied', true,
    'remainingGuarantee', 0,
    'freeSavings', coalesce(w.free_savings, 0),
    'disbursedLoan', coalesce(w.disbursed_loan, 0),
    'withdrawableAmount', greatest(coalesce(w.free_savings, 0) + coalesce(w.disbursed_loan, 0) - coalesce(w.reserved_amount, 0), 0)
  );
end;
$$;

-- ============================================================================
-- 4. sign_loan_contract : Envoi de notification email & in-app pour la garantie
-- ============================================================================
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
  v_profile public.profiles;
  v_guarantee bigint;
  v_blocked bigint;
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
  select * into v_profile from public.profiles where id = r.client_id;

  select coalesce(auto_loan_approval, false) into v_auto_approval from public.app_settings where id = true;
  if v_auto_approval or coalesce((v_contract.content -> 'clauses' ->> 'automatedInstantApproval')::boolean, false) is true then
    -- Décaissement et versement direct sur le portefeuille dès signature
    v_amount := coalesce(r.approved_amount, r.amount);
    v_interest := (r.product_terms ->> 'interestRate')::numeric;
    v_method := r.product_terms ->> 'interestMethod';
    v_mandatory_rate := coalesce((r.product_terms ->> 'mandatorySavingsRate')::numeric, 0);
    v_guarantee := coalesce(r.guarantee_required, 0);

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

    -- Vérification si la garantie obligatoire est nécessaire et non couverte
    select coalesce(blocked_guarantee, 0) into v_blocked from public.wallets where client_id = r.client_id;
    if v_guarantee > 0 and v_blocked < v_guarantee then
      perform app_private.enqueue_notification(
        r.client_id,
        'loan_guarantee_required',
        'Action requise : Constitution de votre garantie',
        'Votre prêt de ' || v_amount || ' FCFA est validé et crédité. Veuillez déposer votre garantie de ' || (v_guarantee - v_blocked) || ' FCFA par Mobile Money pour débloquer vos retraits.',
        jsonb_build_object(
          'client_firstname', coalesce(v_profile.firstname, 'client'),
          'amount', v_amount,
          'guarantee_amount', (v_guarantee - v_blocked),
          'loan_id', v_loan
        ),
        'loan_guarantee_required:' || r.id::text
      );
    end if;

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
