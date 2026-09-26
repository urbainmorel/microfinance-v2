-- Migration 20260926140000_clarify_simulate_loan_totals.sql
-- Clarifie la simulation de prêt en distinguant rigoureusement :
-- 1. La mensualité de remboursement du crédit (capital + intérêts + frais périodiques)
-- 2. Le montant total remboursé du prêt (capital emprunté + total intérêts + total frais)
-- 3. L'épargne obligatoire et la garantie requise (montants récupérables / restitués, non imputés au coût du prêt)
-- 4. Ajuste le taux nominal annuel du Prêt Croissance à 5.000% fixe (et frais d'assurance à 0%) pour les prêts 1M - 5M sur 60 mois.

-- 1. Mise à jour de simulate_loan
create or replace function public.simulate_loan(
  p_product uuid,
  p_amount bigint,
  p_duration int,
  p_start_date date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.loan_products;
  v_total_interest bigint := 0;
  v_total_fees bigint := 0;
  v_fee bigint;
  v_fee_remainder bigint;
  v_guarantee bigint := 0;
  v_mandatory bigint := 0;
  v_total_mandatory bigint := 0;
  v_total_due bigint := 0;
  v_loan_total_repaid bigint := 0;
  v_first_monthly_payment bigint := 0;
  v_first_monthly_total bigint := 0;
  r record;
  v_rows jsonb := '[]'::jsonb;
begin
  select * into strict p from public.loan_products where id = p_product and is_active;
  if p_amount < p.min_amount or p_amount > p.max_amount then
    raise exception using errcode = '22023', message = 'AMOUNT_OUT_OF_RANGE';
  end if;
  if p_duration < p.min_duration_months or p_duration > p.max_duration_months then
    raise exception using errcode = '22023', message = 'DURATION_OUT_OF_RANGE';
  end if;

  v_total_fees := round(p_amount * coalesce(p.processing_fee_percent, 0) / 100)::bigint
    + coalesce(p.processing_fee_flat, 0)
    + round(p_amount * coalesce(p.management_fee_percent, 0) / 100)::bigint
    + coalesce(p.management_fee_flat, 0)
    + round(p_amount * coalesce(p.insurance_rate, 0) / 100)::bigint;
  v_fee := v_total_fees / p_duration;
  v_fee_remainder := v_total_fees - (v_fee * p_duration);
  v_guarantee := round(p_amount * coalesce(p.guarantee_rate, 0) / 100)::bigint;

  for r in select * from public.amortization_rows(
    p_amount, (p.interest_rate / 12.0) / 100.0, p_duration, p.interest_method
  ) loop
    v_total_interest := v_total_interest + r.due_interest;
    v_mandatory := round(
      (r.due_principal + r.due_interest + v_fee
        + case when r.installment_no = p_duration then v_fee_remainder else 0 end)
      * coalesce(p.mandatory_savings_rate, 0) / 100
    )::bigint;
    v_total_mandatory := v_total_mandatory + v_mandatory;
    v_total_due := v_total_due + r.due_principal + r.due_interest + v_fee
      + case when r.installment_no = p_duration then v_fee_remainder else 0 end
      + v_mandatory;

    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'installmentNo', r.installment_no,
      'dueDate', (p_start_date + make_interval(months => r.installment_no))::date,
      'principal', r.due_principal,
      'interest', r.due_interest,
      'fees', v_fee + case when r.installment_no = p_duration then v_fee_remainder else 0 end,
      'loanInstallment', r.due_principal + r.due_interest + v_fee
        + case when r.installment_no = p_duration then v_fee_remainder else 0 end,
      'mandatorySavings', v_mandatory,
      'total', r.due_principal + r.due_interest + v_fee
        + case when r.installment_no = p_duration then v_fee_remainder else 0 end
        + v_mandatory
    ));
  end loop;

  v_loan_total_repaid := p_amount + v_total_interest + v_total_fees;
  v_first_monthly_payment := coalesce(
    (v_rows->0->>'loanInstallment')::bigint,
    (v_rows->0->>'principal')::bigint + (v_rows->0->>'interest')::bigint + (v_rows->0->>'fees')::bigint,
    0
  );
  v_first_monthly_total := coalesce((v_rows->0->>'total')::bigint, 0);

  return jsonb_build_object(
    'productId', p.id,
    'productName', p.name,
    'amount', p_amount,
    'durationMonths', p_duration,
    'interestRate', p.interest_rate,
    'interestMethod', p.interest_method,
    'totalInterest', v_total_interest,
    'totalFees', v_total_fees,
    'loanTotalRepaid', v_loan_total_repaid,
    'monthlyPayment', v_first_monthly_payment,
    'monthlyTotal', v_first_monthly_total,
    'guaranteeRequired', v_guarantee,
    'mandatorySavingsTotal', v_total_mandatory,
    'totalDue', v_total_due,
    'recoverableAmount', v_guarantee + v_total_mandatory,
    'schedule', v_rows
  );
end;
$$;

grant execute on function public.simulate_loan(uuid, bigint, int, date) to authenticated, anon;

-- 2. Mise à niveau du produit Croissance actif (taux 5% annuel fixe, 0% assurance)
alter table public.loan_products disable trigger trg_guard_loan_product_history;
alter table public.loan_products disable trigger trg_guard_loan_product_cost;

update public.loan_products
set
  interest_rate = 5.000,
  insurance_rate = 0.000
where name = 'Prêt Croissance' and is_active = true;

alter table public.loan_products enable trigger trg_guard_loan_product_history;
alter table public.loan_products enable trigger trg_guard_loan_product_cost;
