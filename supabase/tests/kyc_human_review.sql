begin;
select plan(4);

select ok(
  to_regprocedure('public.verify_kyc_document(uuid,boolean,text)') is not null,
  'une commande dediee trace le controle humain de chaque piece'
);
select ok(
  position(
    'kyc_documents_not_verified' in lower(
      pg_get_functiondef('public.review_kyc(uuid,text,text)'::regprocedure)
    )
  ) > 0,
  'la validation KYC bloque les pieces obligatoires non controlees'
);
select ok(
  position(
    'kyc_document_reviewed' in lower(
      pg_get_functiondef('public.verify_kyc_document(uuid,boolean,text)'::regprocedure)
    )
  ) > 0,
  'le controle documentaire produit une trace d audit'
);
select ok(
  position(
    $$v_id_type <> 'passport'$$ in lower(
      pg_get_functiondef('public.review_kyc(uuid,text,text)'::regprocedure)
    )
  ) > 0,
  'le verso est obligatoire sauf pour un passeport'
);

select * from finish();
rollback;
