-- Lot 6b — Tests du cœur d'amortissement (pgTAP). Ancre de non-régression (D5).

begin;
select plan(9);

-- ── Cas sans intérêt (r = 0) : valeurs exactes, 100 000 FCFA / 12 mois ──────────
-- round(100000/12) = 8333 pour k=1..11 ; la 12e absorbe : 100000 − 11×8333 = 8337.
select is(
  (select count(*)::int from public.amortization_rows(100000, 0, 12, 'CONSTANT_INSTALLMENT')),
  12,
  '12 échéances générées'
);
select is(
  (select sum(due_principal)::bigint from public.amortization_rows(100000, 0, 12, 'CONSTANT_INSTALLMENT')),
  100000::bigint,
  'Σ capital = capital emprunté (sans intérêt)'
);
select is(
  (select sum(due_interest)::bigint from public.amortization_rows(100000, 0, 12, 'CONSTANT_INSTALLMENT')),
  0::bigint,
  'aucun intérêt quand r = 0'
);
select is(
  (select due_principal from public.amortization_rows(100000, 0, 12, 'CONSTANT_INSTALLMENT') where installment_no = 1),
  8333::bigint,
  'échéance 1 : capital arrondi = 8333'
);
select is(
  (select due_principal from public.amortization_rows(100000, 0, 12, 'CONSTANT_INSTALLMENT') where installment_no = 12),
  8337::bigint,
  'échéance 12 : absorbe l''écart d''arrondi = 8337'
);

-- ── Cas avec intérêt (annuités, r = 1,5 %/mois) : invariants ────────────────────
select is(
  (select sum(due_principal)::bigint from public.amortization_rows(100000, 0.015, 12, 'CONSTANT_INSTALLMENT')),
  100000::bigint,
  'annuités : Σ capital = capital emprunté (arrondi absorbé)'
);
select ok(
  (select bool_and(due_principal > 0 and due_interest >= 0)
     from public.amortization_rows(100000, 0.015, 12, 'CONSTANT_INSTALLMENT')),
  'annuités : toutes les composantes sont positives'
);
select ok(
  (select max(due_interest) < 2000 and min(due_interest) >= 0
     from public.amortization_rows(100000, 0.015, 12, 'CONSTANT_INSTALLMENT')),
  'annuités : intérêt décroissant, borné'
);

-- ── Cas dégressif : capital constant, Σ capital exact ───────────────────────────
select is(
  (select sum(due_principal)::bigint from public.amortization_rows(120000, 0.02, 12, 'DEGRESSIVE')),
  120000::bigint,
  'dégressif : Σ capital = capital emprunté'
);

select * from finish();
rollback;
