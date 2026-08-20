create or replace function app_private.guard_single_live_loan_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Sérialise les soumissions d'un même client, y compris entre deux sessions.
  perform pg_advisory_xact_lock(hashtextextended(new.client_id::text, 0));
  if exists (
    select 1 from public.loans
    where client_id = new.client_id and status in ('ACTIVE', 'DEFAULTED')
  ) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_LOAN_EXISTS';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_single_live_loan_request on public.loan_requests;
create trigger trg_single_live_loan_request
before insert on public.loan_requests
for each row execute function app_private.guard_single_live_loan_request();

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
  v_has_payment boolean;
begin
  select * into l from public.loans
  where client_id = auth.uid() and status in ('ACTIVE', 'DEFAULTED')
  order by created_at desc limit 1;
  if found then
    select exists(
      select 1 from public.repayment_requests where loan_id = l.id and status = 'CONFIRMED'
    ) into v_has_payment;
    return jsonb_build_object(
      'displayState', case when v_has_payment then 8 else 7 end,
      'loanId', l.id, 'status', l.status, 'remainingPrincipal', l.remaining_principal,
      'totalAmount', l.total_amount
    );
  end if;

  -- Une nouvelle demande prime sur l'historique d'un ancien prêt clôturé.
  select * into r from public.loan_requests
  where client_id = auth.uid() and status not in ('DRAFT', 'DISBURSED', 'CANCELLED')
  order by created_at desc limit 1;
  if found then
    return jsonb_build_object(
      'displayState', case
        when r.status in ('SUBMITTED', 'IN_ANALYSIS', 'PRE_APPROVED') then 2
        when r.status = 'INFO_REQUESTED' then 3
        when r.status = 'ACCEPTED' then 4
        when r.status = 'GUARANTEE_PENDING' then 5
        when r.status in ('GUARANTEE_COMPLETE', 'AWAITING_DISBURSEMENT') then 6
        when r.status = 'REJECTED' then 10 else 1 end,
      'requestId', r.id, 'status', r.status,
      'guaranteeRequired', r.guarantee_required,
      'guaranteeBlocked', r.guarantee_blocked_partial
    );
  end if;

  select * into l from public.loans
  where client_id = auth.uid() and status = 'CLOSED'
  order by created_at desc limit 1;
  if found then
    return jsonb_build_object('displayState', 9, 'loanId', l.id, 'status', l.status);
  end if;
  return jsonb_build_object('displayState', 1);
end;
$$;

revoke all on function app_private.guard_single_live_loan_request()
from public, anon, authenticated;
revoke all on function public.get_active_loan_status() from public, anon;
grant execute on function public.get_active_loan_status() to authenticated;
