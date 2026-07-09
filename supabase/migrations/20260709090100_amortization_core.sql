-- Lot 6b — Cœur de calcul d'amortissement (Specs §D.8, §F ; PRD §11.3-4).
-- Fonction PURE (immutable), testable isolément : renvoie capital + intérêt par échéance.
--   p_rate  = taux périodique en FRACTION (ex. 0.015 pour 1,5 %/mois).
--   CONSTANT_INSTALLMENT : échéance = P·r / (1 − (1+r)^(−n)) ; intérêt = solde·r.
--   DEGRESSIVE           : capital = P/n (constant) ; intérêt = solde·r.
-- Chaque composante est arrondie à l'unité FCFA ; la DERNIÈRE échéance absorbe l'écart
-- cumulé pour garantir Σ capital = P (règle d'arrondi immuable, Specs §F).
create or replace function public.amortization_rows(
  p_principal bigint,
  p_rate numeric,
  p_n int,
  p_method text
)
returns table (installment_no int, due_principal bigint, due_interest bigint)
language plpgsql
immutable
as $$
declare
  v_balance numeric := p_principal;
  v_installment numeric := 0;
  v_principal bigint;
  v_interest bigint;
  v_sum_principal bigint := 0;
  k int;
begin
  if p_n < 1 then raise exception 'Durée invalide : %', p_n; end if;
  if p_principal <= 0 then raise exception 'Capital invalide : %', p_principal; end if;
  if p_method not in ('CONSTANT_INSTALLMENT', 'DEGRESSIVE') then
    raise exception 'Méthode d''intérêt inconnue : %', p_method;
  end if;

  if p_method = 'CONSTANT_INSTALLMENT' then
    if p_rate = 0 then
      v_installment := p_principal::numeric / p_n;
    else
      v_installment := p_principal * p_rate / (1 - power(1 + p_rate, -p_n));
    end if;
  end if;

  for k in 1..p_n loop
    -- Intérêt sur le capital restant dû (avant remboursement de la période).
    v_interest := round(v_balance * p_rate);

    if p_method = 'DEGRESSIVE' then
      v_principal := round(p_principal::numeric / p_n);
    else
      v_principal := round(v_installment) - v_interest;
    end if;

    -- Dernière échéance : solde exactement le capital restant (absorbe l'arrondi).
    if k = p_n then
      v_principal := p_principal - v_sum_principal;
    end if;

    v_sum_principal := v_sum_principal + v_principal;
    v_balance := v_balance - v_principal;

    installment_no := k;
    due_principal := v_principal;
    due_interest := v_interest;
    return next;
  end loop;
end;
$$;
