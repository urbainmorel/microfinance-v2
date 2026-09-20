-- Migration: Permettre l'annulation d'une demande de prêt avec statut 'ACCEPTED' si le contrat n'est pas encore signé
create or replace function public.cancel_client_request(
  p_client uuid,
  p_kind text,
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
  v_amount bigint;
  v_existing uuid;
  v_changed boolean := false;
begin
  if p_client is null or p_request is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  insert into app_private.client_command_receipts (
    client_id, action, idempotency_key, target_id, result_status, correlation_id
  ) values (
    p_client, 'request.cancel', p_idempotency_key, p_request, 'CANCELLED', p_correlation_id
  ) on conflict (client_id, action, idempotency_key) do nothing;
  if not found then
    select target_id into v_existing from app_private.client_command_receipts
    where client_id = p_client and action = 'request.cancel'
      and idempotency_key = p_idempotency_key;
    if v_existing <> p_request then
      raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED';
    end if;
    return v_existing;
  end if;

  if p_kind = 'deposit' then
    update public.deposit_requests
    set status = 'CANCELLED', correlation_id = coalesce(p_correlation_id, correlation_id)
    where id = p_request and client_id = p_client and status = 'PENDING';
    v_changed := found;
  elsif p_kind = 'repayment' then
    update public.repayment_requests
    set status = 'CANCELLED', correlation_id = coalesce(p_correlation_id, correlation_id)
    where id = p_request and client_id = p_client and status = 'PENDING';
    v_changed := found;
  elsif p_kind = 'loan' then
    -- Permet l'annulation si la demande n'a pas encore fait l'objet d'un prêt actif
    -- et si le contrat n'a pas encore été signé électroniquement.
    update public.loan_requests
    set status = 'CANCELLED', correlation_id = coalesce(p_correlation_id, correlation_id),
        updated_at = now()
    where id = p_request and client_id = p_client
      and (
        status in ('DRAFT', 'SUBMITTED', 'INFO_REQUESTED')
        or (
          status = 'ACCEPTED'
          and not exists (
            select 1 from public.loan_contracts
            where request_id = p_request and signed_at is not null
          )
          and not exists (
            select 1 from public.loans
            where request_id = p_request
          )
        )
      );
    v_changed := found;
  elsif p_kind = 'withdrawal' then
    update public.withdrawal_requests
    set status = 'CANCELLED', correlation_id = coalesce(p_correlation_id, correlation_id),
        updated_at = now()
    where id = p_request and client_id = p_client and status = 'PENDING'
    returning amount into v_amount;
    v_changed := found;
    if v_changed then
      update public.wallets
      set reserved_amount = reserved_amount - v_amount, updated_at = now()
      where client_id = p_client and reserved_amount >= v_amount;
      if not found then
        raise exception using errcode = '23514', message = 'RESERVATION_INCONSISTENT';
      end if;
    end if;
  else
    raise exception using errcode = '22023', message = 'INVALID_REQUEST_KIND';
  end if;

  if not v_changed then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION';
  end if;
  return p_request;
end;
$$;

revoke all on function public.cancel_client_request(uuid, text, uuid, uuid, uuid) from public, anon;
grant execute on function public.cancel_client_request(uuid, text, uuid, uuid, uuid) to service_role;
