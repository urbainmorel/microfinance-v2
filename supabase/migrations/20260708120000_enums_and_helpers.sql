-- Lot 1 — Enums et fonctions utilitaires (Specs §B).
-- Migrations rejouables depuis zéro (`supabase db reset`).

-- Workflow de demande de prêt : ensemble unique et normalisé de statuts (Specs §B.6, PRD §11.5).
create type public.loan_status_enum as enum (
  'DRAFT',
  'SUBMITTED',
  'IN_ANALYSIS',
  'INFO_REQUESTED',
  'PRE_APPROVED',
  'ACCEPTED',
  'GUARANTEE_PENDING',
  'GUARANTEE_COMPLETE',
  'AWAITING_DISBURSEMENT',
  'DISBURSED',
  'REJECTED',
  'CANCELLED'
);

-- Rôle porté par le jeton (Specs §B, invariant 4). Le claim `app_metadata.user_role`
-- est recopié depuis profiles.role par le Custom Access Token Hook. Jamais de valeur
-- modifiable par l'utilisateur. STABLE : évaluée une fois par requête.
create or replace function public.auth_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'user_role', 'client');
$$;

-- Helper générique : met à jour updated_at avant écriture.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
