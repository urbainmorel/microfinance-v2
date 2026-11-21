-- Réglages privés du hook Send Email de Supabase Auth.
-- Les valeurs sont écrites par l'administration et lues uniquement avec la clé
-- serveur (service_role). Aucun accès anon/authenticated n'est accordé.
create table if not exists public.auth_email_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.auth_email_settings enable row level security;

revoke all on public.auth_email_settings from public, anon, authenticated;
grant select, insert, update, delete on public.auth_email_settings to service_role;

comment on table public.auth_email_settings is
  'Secrets et expéditeurs du Send Email Hook Supabase Auth. Accès service_role uniquement.';
