-- Migration : catalogue produit reproductible (conditions confirmées D26)
-- Date : 2026-11-19
--
-- Aligne les deux familles actives sur les conditions validées :
--   Prêt Essentiel  : 100 000–500 000 FCFA, 6–12 mois, 8,5 %/an, garantie 10 %
--   Prêt Croissance : 1 000 000–5 000 000 FCFA, 12–60 mois, 5 %/an, garantie 5 %
--
-- La base de production est déjà alignée : la migration est sans effet.
-- Elle garantit qu'une base recréée depuis les migrations (CI) obtient le même
-- catalogue que la production, en créant une nouvelle révision produit.

do $$
declare
  target record;
  v_old public.loan_products;
  v_active_count integer;
  v_next_revision integer;
begin
  for target in
    select *
    from (
      values
        (
          '10000000-0000-4000-8000-000000000001'::uuid,
          'Prêt Essentiel',
          'Financement court terme pour les besoins essentiels.',
          100000::bigint,
          500000::bigint,
          6,
          12,
          8.5,
          10.0
        ),
        (
          '10000000-0000-4000-8000-000000000002'::uuid,
          'Prêt Croissance',
          'Financement du développement d''activité.',
          1000000::bigint,
          5000000::bigint,
          12,
          60,
          5.0,
          5.0
        )
    ) as t(
      logical_id, name, description, min_amount, max_amount,
      min_duration, max_duration, interest_rate, guarantee_rate
    )
  loop
    select count(*) into v_active_count
    from public.loan_products
    where is_active and logical_product_id = target.logical_id;

    if v_active_count <> 1 then
      raise exception 'Produit % : une seule révision active attendue, trouvé %',
        target.name, v_active_count;
    end if;

    select * into v_old
    from public.loan_products
    where is_active and logical_product_id = target.logical_id
    for update;

    if v_old.name = target.name
      and v_old.min_amount = target.min_amount
      and v_old.max_amount = target.max_amount
      and v_old.min_duration_months = target.min_duration
      and v_old.max_duration_months = target.max_duration
      and v_old.interest_rate = target.interest_rate
      and v_old.guarantee_rate = target.guarantee_rate
      and v_old.interest_method = 'CONSTANT_INSTALLMENT'
      and v_old.processing_fee_percent = 0
      and v_old.processing_fee_flat = 0
      and v_old.management_fee_percent = 0
      and v_old.management_fee_flat = 0
      and v_old.insurance_rate = 0
      and v_old.mandatory_savings_rate = 5
      and v_old.late_penalty_rate = 0.03
    then
      continue;
    end if;

    select coalesce(max(revision), 0) + 1 into v_next_revision
    from public.loan_products
    where logical_product_id = target.logical_id;

    insert into public.loan_products (
      name, description, min_amount, max_amount, min_duration_months, max_duration_months,
      interest_rate, interest_method, processing_fee_percent, processing_fee_flat,
      management_fee_percent, management_fee_flat, insurance_rate, guarantee_rate,
      mandatory_savings_rate, late_penalty_rate, is_active,
      logical_product_id, revision, supersedes_id
    ) values (
      target.name, target.description, target.min_amount, target.max_amount,
      target.min_duration, target.max_duration,
      target.interest_rate, 'CONSTANT_INSTALLMENT',
      0, 0, 0, 0, 0, target.guarantee_rate,
      5, 0.03, true,
      target.logical_id, v_next_revision, v_old.id
    );

    update public.loan_products
    set is_active = false, retired_at = now()
    where id = v_old.id;
  end loop;
end;
$$;

do $$
begin
  if not exists (
    select 1 from public.loan_products
    where is_active
      and logical_product_id = '10000000-0000-4000-8000-000000000001'
      and interest_rate = 8.5 and guarantee_rate = 10
      and min_amount = 100000 and max_amount = 500000
      and min_duration_months = 6 and max_duration_months = 12
  ) then
    raise exception 'Prêt Essentiel : conditions non alignées après migration';
  end if;

  if not exists (
    select 1 from public.loan_products
    where is_active
      and logical_product_id = '10000000-0000-4000-8000-000000000002'
      and interest_rate = 5.0 and guarantee_rate = 5
      and min_amount = 1000000 and max_amount = 5000000
      and min_duration_months = 12 and max_duration_months = 60
  ) then
    raise exception 'Prêt Croissance : conditions non alignées après migration';
  end if;
end;
$$;
