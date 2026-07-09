-- Lot 1 — Garde-fous, audit, provisioning et Custom Access Token Hook (Specs §C, §D.10).

-- ── Garde des colonnes privilégiées (Specs §C) ────────────────────────────────
-- role / is_active / kyc_status ne changent que via des fonctions SECURITY DEFINER
-- dédiées, qui posent `SET LOCAL app.privileged = 'on'`. Filet de sécurité sinon.
create or replace function public.guard_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if (new.role is distinct from old.role
      or new.is_active is distinct from old.is_active
      or new.kyc_status is distinct from old.kyc_status)
     and current_setting('app.privileged', true) is distinct from 'on' then
    raise exception 'Modification de colonne privilégiée interdite';
  end if;
  return new;
end;
$$;

create trigger trg_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_privileged_columns();

-- ── Audit générique append-only (Specs §D.10, PRD §17) ────────────────────────
-- SECURITY DEFINER : l'INSERT réussit malgré l'absence de policy INSERT sur audit_logs
-- (la table reste append-only pour les utilisateurs).
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
  v_old jsonb;
  v_new jsonb;
begin
  if tg_op = 'DELETE' then
    v_target := (to_jsonb(old) ->> 'id')::uuid;
    v_old := to_jsonb(old);
  else
    v_target := (to_jsonb(new) ->> 'id')::uuid;
    v_new := to_jsonb(new);
    if tg_op = 'UPDATE' then
      v_old := to_jsonb(old);
    end if;
  end if;

  insert into public.audit_logs (user_id, user_role, action_type, target_id, old_value, new_value)
  values (auth.uid(), coalesce(public.auth_role(), 'system'),
          tg_table_name || '_' || tg_op, v_target, v_old, v_new);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Configuration (modifications) + workflow de prêt (transitions de statut).
create trigger trg_audit_loan_products
  after insert or update or delete on public.loan_products
  for each row execute function public.audit_trigger();

create trigger trg_audit_templates
  after insert or update or delete on public.notification_templates
  for each row execute function public.audit_trigger();

create trigger trg_audit_loan_requests
  after update on public.loan_requests
  for each row execute function public.audit_trigger();

-- ── Provisioning à l'inscription (Specs §B, ROADMAP Lot 1) ────────────────────
-- Crée la ligne profiles ET la ligne wallets (1 wallet par client) à la création auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, firstname, lastname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'firstname', ''),
    coalesce(new.raw_user_meta_data ->> 'lastname', '')
  );
  insert into public.wallets (client_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Custom Access Token Hook (Specs §B, invariant 4) ──────────────────────────
-- Recopie profiles.role dans le claim app_metadata.user_role à l'émission du jeton.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_role text;
  claims jsonb := event -> 'claims';
begin
  select role into v_role from public.profiles where id = (event ->> 'user_id')::uuid;
  v_role := coalesce(v_role, 'client');

  if claims ? 'app_metadata' then
    claims := jsonb_set(claims, '{app_metadata,user_role}', to_jsonb(v_role));
  else
    claims := jsonb_set(claims, '{app_metadata}', jsonb_build_object('user_role', v_role));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Le hook s'exécute en tant que supabase_auth_admin : accès en exécution + lecture des rôles.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on public.profiles to supabase_auth_admin;

create policy "auth_admin_read_profiles" on public.profiles
  for select to supabase_auth_admin using (true);
