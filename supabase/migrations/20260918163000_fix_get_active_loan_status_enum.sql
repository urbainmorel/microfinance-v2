-- 20260918163000_fix_get_active_loan_status_enum.sql
-- Correction du bug 22P02 : 'ANALYZING' n'est pas une valeur valide de public.loan_status_enum.
-- Utilisation de 'IN_ANALYSIS' et 'INFO_REQUESTED'.

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

revoke all on function public.get_active_loan_status() from public, anon;
grant execute on function public.get_active_loan_status() to authenticated;
