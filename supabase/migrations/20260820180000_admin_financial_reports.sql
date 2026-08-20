create or replace function public.get_admin_financial_report(p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_summary jsonb; v_countries jsonb;
begin
  perform app_private.require_active_staff(array['admin']);
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception using errcode = '22023', message = 'INVALID_REPORT_PERIOD';
  end if;
  select jsonb_build_object(
    'confirmedDeposits', coalesce((select sum(amount) from public.deposit_requests
      where status = 'CONFIRMED' and created_at >= p_from and created_at < p_to + 1), 0),
    'completedWithdrawals', coalesce((select sum(amount) from public.withdrawal_requests
      where status = 'COMPLETED' and created_at >= p_from and created_at < p_to + 1), 0),
    'confirmedRepayments', coalesce((select sum(amount) from public.repayment_requests
      where status = 'CONFIRMED' and created_at >= p_from and created_at < p_to + 1), 0),
    'disbursedLoans', coalesce((select sum(coalesce(approved_amount, amount)) from public.loan_requests
      where status = 'DISBURSED' and disbursed_at >= p_from and disbursed_at < p_to + 1), 0),
    'outstandingPrincipal', coalesce((select sum(remaining_principal) from public.loans
      where status in ('ACTIVE', 'DEFAULTED')), 0),
    'activeLoans', (select count(*) from public.loans where status = 'ACTIVE'),
    'defaultedLoans', (select count(*) from public.loans where status = 'DEFAULTED')
  ) into v_summary;
  with country_clients as (
    select id, country from public.profiles where role = 'client'
  ), deposit_totals as (
    select client_id, sum(amount)::bigint as deposits
    from public.deposit_requests
    where status = 'CONFIRMED' and created_at >= p_from and created_at < p_to + 1
    group by client_id
  ), withdrawal_totals as (
    select client_id, sum(amount)::bigint as withdrawals
    from public.withdrawal_requests
    where status = 'COMPLETED' and created_at >= p_from and created_at < p_to + 1
    group by client_id
  ), country_totals as (
    select c.country,
      count(*)::bigint as clients,
      coalesce(sum(d.deposits), 0)::bigint as deposits,
      coalesce(sum(w.withdrawals), 0)::bigint as withdrawals
    from country_clients c
    left join deposit_totals d on d.client_id = c.id
    left join withdrawal_totals w on w.client_id = c.id
    group by c.country
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'country', coalesce(country, 'NON_RENSEIGNE'), 'clients', clients,
    'deposits', deposits, 'withdrawals', withdrawals
  ) order by country), '[]'::jsonb) into v_countries from country_totals;
  return jsonb_build_object('from', p_from, 'to', p_to, 'summary', v_summary, 'countries', v_countries);
end;
$$;
revoke all on function public.get_admin_financial_report(date, date) from public, anon;
grant execute on function public.get_admin_financial_report(date, date) to authenticated;
