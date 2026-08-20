begin;
select plan(2);

-- La fonction d'annulation contient désormais une garde explicite de cohérence.
select matches(
  pg_get_functiondef('public.cancel_client_request(uuid,text,uuid,uuid,uuid)'::regprocedure),
  'RESERVATION_INCONSISTENT',
  'une annulation échoue atomiquement si la réserve ne peut pas être libérée'
);

-- La clôture dépend de toutes les composantes de chaque échéance.
select matches(
  pg_get_functiondef('app_private.apply_repayment(uuid,bigint,uuid)'::regprocedure),
  'paid_mandatory_savings < a.due_mandatory_savings',
  'la clôture contrôle aussi l’épargne obligatoire restante'
);

select * from finish();
rollback;
