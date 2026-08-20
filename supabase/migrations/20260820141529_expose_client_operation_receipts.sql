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
        'phone', recipient_phone, 'bank', recipient_bank, 'account', recipient_account
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
