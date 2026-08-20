begin;
delete from public.loan_products;
select plan(5);

select is(
  public.effective_annual_cost(100000, 0, 6, 'CONSTANT_INSTALLMENT', 0),
  0.000000::numeric,
  'un crédit sans intérêt ni frais a un coût effectif nul'
);

select cmp_ok(
  public.effective_annual_cost(100000, 0.01, 6, 'CONSTANT_INSTALLMENT', 0),
  '>', 12::numeric,
  'un taux mensuel de 1 % est annualisé par les flux'
);

select lives_ok(
  $$
    insert into public.loan_products (
      name, min_amount, max_amount, min_duration_months, max_duration_months,
      interest_rate, interest_method
    ) values ('Conforme', 100000, 500000, 6, 12, 1, 'CONSTANT_INSTALLMENT')
  $$,
  'un produit conforme au plafond est accepté'
);

select throws_ok(
  $$
    insert into public.loan_products (
      name, min_amount, max_amount, min_duration_months, max_duration_months,
      interest_rate, interest_method
    ) values ('Trop cher', 100000, 500000, 3, 12, 3, 'CONSTANT_INSTALLMENT')
  $$,
  '22023', 'EFFECTIVE_COST_CAP_EXCEEDED',
  'un produit dépassant 20 % est bloqué'
);

select throws_ok(
  $$
    insert into public.loan_products (
      name, min_amount, max_amount, min_duration_months, max_duration_months,
      interest_rate, interest_method
    ) values ('Dégressif', 100000, 500000, 6, 12, 1, 'DEGRESSIVE')
  $$,
  '22023', 'INTEREST_METHOD_NOT_ALLOWED',
  'la méthode dégressive est interdite en V1'
);

select * from finish();
rollback;
