alter table public.withdrawal_requests
  add column if not exists recipient_country text,
  add column if not exists recipient_bank_code text,
  add column if not exists recipient_iban text,
  add column if not exists motif text;

-- Preserve legacy internal requests while making every future bank transfer explicit.
update public.withdrawal_requests
set recipient_country = coalesce(nullif(trim(recipient_country), ''), 'CI'),
    recipient_bank_code = coalesce(nullif(trim(recipient_bank_code), ''), 'LEGACY'),
    motif = coalesce(nullif(trim(motif), ''), 'Virement antérieur')
where type = 'BANK_TRANSFER';

alter table public.withdrawal_requests
  drop constraint if exists withdrawal_bank_country_umoa,
  drop constraint if exists withdrawal_bank_required_fields;

alter table public.withdrawal_requests
  add constraint withdrawal_bank_country_umoa check (
    type <> 'BANK_TRANSFER' or recipient_country in ('BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG')
  ),
  add constraint withdrawal_bank_required_fields check (
    type <> 'BANK_TRANSFER' or (
      nullif(trim(recipient_bank), '') is not null
      and nullif(trim(recipient_bank_code), '') is not null
      and nullif(trim(recipient_account), '') is not null
      and nullif(trim(motif), '') is not null
    )
  );

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

  select id into v_id from public.withdrawal_requests
  where client_id = p_client and idempotency_key = p_idempotency_key;
  if found then return v_id; end if;

  update public.wallets
  set reserved_amount = reserved_amount + p_amount, updated_at = now()
  where client_id = p_client
    and free_savings + disbursed_loan - reserved_amount >= p_amount;
  if not found then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_FUNDS';
  end if;

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

create or replace function public.get_client_operation_detail(
  p_operation uuid,
  p_kind text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_kind = 'deposit' then
    select jsonb_build_object(
      'id', id, 'kind', 'deposit', 'amount', amount, 'status', status,
      'label', case motif when 'FREE_SAVINGS' then 'Dépôt épargne'
        when 'GUARANTEE' then 'Dépôt de garantie' else 'Remboursement anticipé' end,
      'createdAt', created_at, 'completedAt', confirmed_at,
      'paymentMethod', payment_method, 'reference', reference,
      'reason', rejected_reason, 'correlationId', correlation_id
    ) into v_result
    from public.deposit_requests where id = p_operation and client_id = auth.uid();
  elsif p_kind = 'withdrawal' then
    select jsonb_build_object(
      'id', id, 'kind', 'withdrawal', 'amount', amount, 'status', status,
      'label', case when type = 'BANK_TRANSFER' then 'Virement bancaire'
        else 'Retrait Mobile Money' end,
      'createdAt', created_at, 'completedAt', updated_at,
      'reference', external_reference, 'reason', rejected_reason,
      'correlationId', correlation_id,
      'recipient', jsonb_strip_nulls(jsonb_build_object(
        'name', recipient_name, 'operator', recipient_operator,
        'phone', recipient_phone, 'bank', recipient_bank,
        'bankCode', recipient_bank_code, 'account', recipient_account,
        'country', recipient_country, 'iban', recipient_iban, 'motif', motif
      ))
    ) into v_result
    from public.withdrawal_requests where id = p_operation and client_id = auth.uid();
  elsif p_kind = 'repayment' then
    select jsonb_build_object(
      'id', id, 'kind', 'repayment', 'amount', amount, 'status', status,
      'label', 'Remboursement de prêt', 'loanId', loan_id,
      'createdAt', created_at, 'completedAt', confirmed_at,
      'paymentMethod', payment_method, 'reference', reference,
      'reason', rejected_reason, 'correlationId', correlation_id
    ) into v_result
    from public.repayment_requests where id = p_operation and client_id = auth.uid();
  else
    raise exception using errcode = '22023', message = 'INVALID_OPERATION_KIND';
  end if;

  if v_result is null then
    raise exception using errcode = 'P0002', message = 'OPERATION_NOT_FOUND';
  end if;
  return v_result;
end;
$$;

revoke all on function public.get_client_operation_detail(uuid, text) from public, anon;
grant execute on function public.get_client_operation_detail(uuid, text) to authenticated;
