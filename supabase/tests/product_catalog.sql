begin;
select plan(3);

select is(
  (select count(distinct logical_product_id)::integer from public.loan_products),
  2,
  'le catalogue V1 contient exactement deux familles'
);

select is(
  (select count(*)::integer from public.loan_products
   where is_active and interest_method = 'CONSTANT_INSTALLMENT'
     and guarantee_rate = 10 and mandatory_savings_rate = 5 and late_penalty_rate = 0.03),
  2,
  'les deux produits actifs appliquent les paramètres métier initiaux'
);

select throws_ok(
  $$
    insert into public.loan_products (
      name, min_amount, max_amount, min_duration_months, max_duration_months,
      interest_rate, interest_method
    ) values ('Troisième produit', 50000, 100000, 3, 6, 1, 'CONSTANT_INSTALLMENT')
  $$,
  '22023',
  'V1_PRODUCT_FAMILY_LIMIT',
  'une troisième famille est refusée'
);

select * from finish();
rollback;
