-- Mise à jour de la génération de contrat de prêt pour retirer le canal de décaissement
create or replace function app_private.generate_loan_contract()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_amount bigint := coalesce(new.approved_amount, new.amount);
  v_content jsonb;
begin
  if new.status not in ('ACCEPTED', 'GUARANTEE_PENDING', 'GUARANTEE_COMPLETE', 'AWAITING_DISBURSEMENT')
     then return new; end if;
  select * into strict v_profile from public.profiles where id = new.client_id;
  v_content := jsonb_build_object(
    'schemaVersion', 1,
    'contractNumber', 'MF-' || to_char(current_date, 'YYYY') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 12)),
    'borrower', jsonb_build_object(
      'clientId', new.client_id, 'firstname', v_profile.firstname, 'lastname', v_profile.lastname,
      'country', v_profile.country, 'idType', v_profile.id_type, 'idNumber', v_profile.id_number
    ),
    'loan', jsonb_build_object(
      'requestId', new.id, 'principal', v_amount, 'currency', 'XOF',
      'durationMonths', new.duration_months, 'purpose', new.purpose
    ),
    'terms', new.product_terms,
    'clauses', jsonb_build_object(
      'constantInstallments', true, 'manualFinancialConfirmation', true,
      'oneLiveLoan', true, 'effectiveCostCapPercent', 20,
      'earlyRepaymentFee', 0, 'guaranteeMayBeMobilized', true,
      'jurisdiction', coalesce(v_profile.country, 'Pays de résidence du client')
    )
  );
  insert into public.loan_contracts (
    request_id, client_id, contract_number, terms_version, content, content_hash
  ) values (
    new.id, new.client_id, v_content ->> 'contractNumber', new.product_terms_version,
    v_content, encode(extensions.digest(v_content::text, 'sha256'), 'hex')
  ) on conflict (request_id) do nothing;
  return new;
end;
$$;
