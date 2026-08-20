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
    update public.loan_requests
    set status = 'CANCELLED', correlation_id = coalesce(p_correlation_id, correlation_id),
        updated_at = now()
    where id = p_request and client_id = p_client
      and status in ('DRAFT', 'SUBMITTED', 'INFO_REQUESTED');
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

create or replace function app_private.apply_repayment(
  p_client uuid,
  p_amount bigint,
  p_request uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loan public.loans;
  s record;
  v_remaining bigint := p_amount;
  v_outstanding bigint;
  v_apply bigint;
  v_principal_paid bigint := 0;
  v_mandatory_paid bigint := 0;
begin
  select * into v_loan from public.loans
  where client_id = p_client and status in ('ACTIVE', 'DEFAULTED')
  order by created_at desc limit 1 for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'ACTIVE_LOAN_NOT_FOUND';
  end if;

  select coalesce(sum(
    greatest(penalty_accrued - paid_penalty, 0)
    + greatest(due_interest - paid_interest, 0)
    + greatest(due_fees - paid_fees, 0)
    + greatest(due_principal - paid_principal, 0)
    + greatest(due_mandatory_savings - paid_mandatory_savings, 0)
  ), 0)::bigint into v_outstanding
  from public.amortization_schedules where loan_id = v_loan.id;
  if p_amount <= 0 or p_amount > v_outstanding then
    raise exception using errcode = '22023', message = 'OVERPAYMENT';
  end if;

  for s in select * from public.amortization_schedules
    where loan_id = v_loan.id order by installment_no for update
  loop
    exit when v_remaining = 0;
    v_apply := least(v_remaining, greatest(s.penalty_accrued - s.paid_penalty, 0));
    if v_apply > 0 then
      update public.amortization_schedules set paid_penalty = paid_penalty + v_apply where id = s.id;
      v_remaining := v_remaining - v_apply;
    end if;
    v_apply := least(v_remaining, greatest(s.due_interest - s.paid_interest, 0));
    if v_apply > 0 then
      update public.amortization_schedules set paid_interest = paid_interest + v_apply where id = s.id;
      v_remaining := v_remaining - v_apply;
    end if;
    v_apply := least(v_remaining, greatest(s.due_fees - s.paid_fees, 0));
    if v_apply > 0 then
      update public.amortization_schedules set paid_fees = paid_fees + v_apply where id = s.id;
      v_remaining := v_remaining - v_apply;
    end if;
    v_apply := least(v_remaining, greatest(s.due_principal - s.paid_principal, 0));
    if v_apply > 0 then
      update public.amortization_schedules set paid_principal = paid_principal + v_apply where id = s.id;
      v_principal_paid := v_principal_paid + v_apply;
      v_remaining := v_remaining - v_apply;
    end if;
    v_apply := least(v_remaining, greatest(s.due_mandatory_savings - s.paid_mandatory_savings, 0));
    if v_apply > 0 then
      update public.amortization_schedules
      set paid_mandatory_savings = paid_mandatory_savings + v_apply where id = s.id;
      v_mandatory_paid := v_mandatory_paid + v_apply;
      v_remaining := v_remaining - v_apply;
    end if;
    update public.amortization_schedules set status = case
      when paid_penalty >= penalty_accrued and paid_interest >= due_interest
        and paid_fees >= due_fees and paid_principal >= due_principal
        and paid_mandatory_savings >= due_mandatory_savings then 'PAID'
      when paid_penalty + paid_interest + paid_fees + paid_principal + paid_mandatory_savings > 0 then 'PARTIAL'
      when due_date < current_date then 'LATE'
      else 'PENDING' end,
      updated_at = now()
    where id = s.id;
  end loop;

  if v_remaining <> 0 then
    raise exception using errcode = '22023', message = 'OVERPAYMENT';
  end if;
  if v_mandatory_paid > 0 then
    perform app_private.credit_wallet(p_client, 'mandatory_savings', v_mandatory_paid);
  end if;
  update public.loans set remaining_principal = remaining_principal - v_principal_paid
  where id = v_loan.id;
  update public.loans l set status = 'CLOSED'
  where l.id = v_loan.id and l.remaining_principal = 0
    and l.status in ('ACTIVE', 'DEFAULTED')
    and not exists (
      select 1 from public.amortization_schedules a
      where a.loan_id = l.id and (
        a.paid_penalty < a.penalty_accrued
        or a.paid_interest < a.due_interest
        or a.paid_fees < a.due_fees
        or a.paid_principal < a.due_principal
        or a.paid_mandatory_savings < a.due_mandatory_savings
      )
    );
end;
$$;

revoke all on function public.cancel_client_request(uuid, text, uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.cancel_client_request(uuid, text, uuid, uuid, uuid)
to service_role;
revoke all on function app_private.apply_repayment(uuid, bigint, uuid)
from public, anon, authenticated;
