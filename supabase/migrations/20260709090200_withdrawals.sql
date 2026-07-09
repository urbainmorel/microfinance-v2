-- Lot 5 — Retraits/virements : réservation + exécution (Specs §D.4-5, PRD §13.2-6).
-- Plus le paramétrage de la plage horaire (décision D6 / PRD §16.7) via un singleton.

-- Paramètres applicatifs (singleton). Plage de traitement des retraits (Africa/Abidjan).
create table public.app_settings (
  id boolean primary key default true check (id),
  withdrawal_window_start int not null default 8 check (withdrawal_window_start between 0 and 23),
  withdrawal_window_end int not null default 19 check (withdrawal_window_end between 1 and 24),
  updated_at timestamptz default now(),
  constraint window_order check (withdrawal_window_end > withdrawal_window_start)
);
insert into public.app_settings (id) values (true);

alter table public.app_settings enable row level security;
create policy "app_settings_read_all" on public.app_settings for select using (true);
create policy "app_settings_admin_write" on public.app_settings for all
  using (public.auth_role() in ('admin', 'super_admin'))
  with check (public.auth_role() in ('admin', 'super_admin'));

-- Prédicat de plage horaire, PUR et testable indépendamment du temps courant.
create or replace function public.withdrawal_hour_open(p_hour int, p_start int, p_end int)
returns boolean
language sql
immutable
as $$
  select p_hour >= p_start and p_hour < p_end;
$$;

-- create_withdrawal (Specs §D.4) : réserve atomiquement SI le disponible suffit.
-- Garde d'autorisation : un client n'initie qu'un retrait pour LUI-MÊME (bypass RLS ⇒
-- la fonction doit vérifier l'appelant, invariant 2/4).
create or replace function public.create_withdrawal(
  p_client uuid, p_type text, p_amount bigint, p_recipient jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_client is null or p_client is distinct from auth.uid() then
    raise exception 'Opération non autorisée';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Montant invalide'; end if;
  if p_type not in ('MOBILE_MONEY', 'BANK_TRANSFER') then raise exception 'Type invalide'; end if;

  -- Réserve UNIQUEMENT si le disponible net du réservé est suffisant (atomique).
  update public.wallets
     set reserved_amount = reserved_amount + p_amount, updated_at = now()
   where client_id = p_client
     and (free_savings + disbursed_loan - reserved_amount) >= p_amount;
  if not found then raise exception 'Solde disponible insuffisant'; end if;

  insert into public.withdrawal_requests (
    client_id, type, amount, recipient_operator, recipient_phone,
    recipient_bank, recipient_account, recipient_name, status
  )
  values (
    p_client, p_type, p_amount, p_recipient ->> 'operator', p_recipient ->> 'phone',
    p_recipient ->> 'bank', p_recipient ->> 'account',
    coalesce(p_recipient ->> 'name', ''), 'PENDING'
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- settle_withdrawal (Specs §D.5) : EXECUTE / REJECT / CANCEL. Idempotent (garde PENDING).
-- EXECUTE : contrôle plage horaire ; débit prêt décaissé PUIS épargne libre ; lève le réservé.
-- Réservé aux agents de caisse / admin (garde d'autorisation).
create or replace function public.settle_withdrawal(
  p_request uuid, p_action text, p_agent uuid,
  p_ref text default null, p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.withdrawal_requests;
  v_from_loan bigint;
  v_hour int;
  v_ws int;
  v_we int;
begin
  if p_action = 'CANCEL' then
    -- Annulation client : autorisée pour le propriétaire de la demande.
    null;
  elsif public.auth_role() not in ('agent_caisse', 'admin', 'super_admin') then
    raise exception 'Opération non autorisée';
  end if;

  -- Verrou + garde d'idempotence : une seule transition possible.
  update public.withdrawal_requests set status = 'PROCESSING'
   where id = p_request and status = 'PENDING'
  returning * into r;
  if not found then raise exception 'Demande déjà traitée ou introuvable'; end if;

  if p_action = 'CANCEL' and r.client_id is distinct from auth.uid()
     and public.auth_role() not in ('agent_caisse', 'admin', 'super_admin') then
    raise exception 'Opération non autorisée';
  end if;

  if p_action = 'EXECUTE' then
    select withdrawal_window_start, withdrawal_window_end into v_ws, v_we
      from public.app_settings where id;
    v_hour := extract(hour from now() at time zone 'Africa/Abidjan');
    if not public.withdrawal_hour_open(v_hour, v_ws, v_we) then
      update public.withdrawal_requests set status = 'PENDING' where id = p_request; -- remis en file
      raise exception 'Traitement des retraits autorisé uniquement entre %h et %h', v_ws, v_we;
    end if;

    -- Débit : prêt décaissé d'abord (jusqu'à épuisement), puis épargne libre ; lève le réservé.
    select least(r.amount, disbursed_loan) into v_from_loan
      from public.wallets where client_id = r.client_id;
    update public.wallets set
      disbursed_loan = disbursed_loan - v_from_loan,
      free_savings = free_savings - (r.amount - v_from_loan),
      reserved_amount = reserved_amount - r.amount,
      updated_at = now()
    where client_id = r.client_id;

    update public.withdrawal_requests
       set status = 'COMPLETED', processed_by = p_agent, external_reference = p_ref
     where id = p_request;

  elsif p_action in ('REJECT', 'CANCEL') then
    -- Lève la réservation sans débit.
    update public.wallets set reserved_amount = reserved_amount - r.amount, updated_at = now()
     where client_id = r.client_id;
    update public.withdrawal_requests
       set status = case when p_action = 'CANCEL' then 'CANCELLED' else 'REJECTED' end,
           processed_by = p_agent, rejected_reason = p_reason
     where id = p_request;
  else
    raise exception 'Action invalide : %', p_action;
  end if;
end;
$$;
