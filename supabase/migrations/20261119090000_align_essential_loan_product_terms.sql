-- Migration : alignement des conditions du Prêt Essentiel
-- Date : 2026-11-19
--
-- Conditions validées par la microfinance :
--   Prêt Essentiel  : taux annuel 8,5 %, dépôt de garantie 10 %
--   Prêt Croissance : taux annuel 5 %, dépôt de garantie 5 % (déjà correct)
--
-- loan_products.interest_rate stocke un taux ANNUEL en %.
-- Les calculs (simulate_loan, disburse_loan, TEG) convertissent déjà via
-- (interest_rate / 12.0) / 100.0. Aucun changement de moteur n'est nécessaire.
--
-- On crée une nouvelle révision produit et on retire l'ancienne, afin de
-- préserver l'historique d'audit (trg_guard_loan_product_history).

do $$
declare
  v_old public.loan_products;
  v_new_id uuid;
  v_active_count integer;
begin
  select count(*) into v_active_count
  from public.loan_products
  where is_active
    and logical_product_id = '10000000-0000-4000-8000-000000000001';

  if v_active_count <> 1 then
    raise exception 'Prêt Essentiel : une seule révision active attendue, trouvé %', v_active_count;
  end if;

  select * into v_old
  from public.loan_products
  where is_active
    and logical_product_id = '10000000-0000-4000-8000-000000000001'
  for update;

  if v_old.interest_rate <> 8.5 or v_old.guarantee_rate <> 10 then
    insert into public.loan_products (
      name, description, min_amount, max_amount, min_duration_months, max_duration_months,
      interest_rate, interest_method, processing_fee_percent, processing_fee_flat,
      management_fee_percent, management_fee_flat, insurance_rate, guarantee_rate,
      mandatory_savings_rate, late_penalty_rate, is_active,
      logical_product_id, revision, supersedes_id
    ) values (
      v_old.name, v_old.description, v_old.min_amount, v_old.max_amount,
      v_old.min_duration_months, v_old.max_duration_months,
      8.5, v_old.interest_method,
      v_old.processing_fee_percent, v_old.processing_fee_flat,
      v_old.management_fee_percent, v_old.management_fee_flat,
      v_old.insurance_rate, 10,
      v_old.mandatory_savings_rate, v_old.late_penalty_rate, true,
      v_old.logical_product_id, v_old.revision + 1, v_old.id
    ) returning id into v_new_id;

    update public.loan_products
    set is_active = false, retired_at = now()
    where id = v_old.id;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from public.loan_products
    where is_active
      and logical_product_id = '10000000-0000-4000-8000-000000000001'
      and interest_rate = 8.5
      and guarantee_rate = 10
  ) then
    raise exception 'Prêt Essentiel : conditions non alignées après migration';
  end if;
end;
$$;
