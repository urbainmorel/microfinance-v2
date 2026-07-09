-- Lot 1 — Tables cœur : profiles, KYC, wallets (Specs §B.1–4).

-- 1. profiles — identité + statut KYC + langue + rôle + garde-fous PIN.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  firstname text not null,
  lastname text not null,
  phone text,
  country text,
  city text,
  address text,
  profession text,
  birth_date date,
  monthly_income_estimate bigint,
  id_type text,
  id_number text,
  id_expiry date,
  kyc_status text default 'NONE'
    check (kyc_status in ('NONE', 'PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED', 'INFO_REQUESTED')),
  pin_hash text,                       -- haché par l'Edge Function (bcrypt), jamais en clair
  pin_attempts int default 0,          -- tentatives PIN échouées consécutives
  pin_locked_until timestamptz,        -- verrouillage temporaire de la saisie PIN
  preferred_language text default 'fr',
  role text default 'client'
    check (role in ('client', 'agent_credit', 'agent_caisse', 'validator', 'admin', 'super_admin', 'auditor')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 2. kyc_documents — pièces d'identité (recto/verso) + selfie. Objets chiffrés au repos.
create table public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null check (doc_type in ('ID_FRONT', 'ID_BACK', 'SELFIE')),
  url text not null,
  verified boolean default false,
  uploaded_at timestamptz default now()
);

create index kyc_documents_client on public.kyc_documents (client_id);

-- 3. kyc_financials — informations financières collectées au KYC.
create table public.kyc_financials (
  client_id uuid primary key references public.profiles(id) on delete cascade,
  income_source text,
  monthly_charges bigint,
  momo_operator text,
  momo_number text,
  usual_bank text,
  updated_at timestamptz default now()
);

create trigger trg_kyc_financials_updated_at
  before update on public.kyc_financials
  for each row execute function public.set_updated_at();

-- 4. wallets — 1 ligne par client, 5 sous-comptes entiers FCFA (Specs §B.4, §F).
create table public.wallets (
  client_id uuid primary key references public.profiles(id) on delete cascade,
  free_savings bigint default 0 check (free_savings >= 0),           -- épargne libre disponible
  disbursed_loan bigint default 0 check (disbursed_loan >= 0),       -- part du prêt décaissé encore disponible
  blocked_guarantee bigint default 0 check (blocked_guarantee >= 0),
  mandatory_savings bigint default 0 check (mandatory_savings >= 0),
  reserved_amount bigint default 0 check (reserved_amount >= 0),     -- retraits/virements en attente
  updated_at timestamptz default now(),
  -- Le réservé ne peut jamais dépasser ce qui est réellement mobilisable (invariant §F).
  constraint reserved_within_available check (reserved_amount <= free_savings + disbursed_loan)
);

create trigger trg_wallets_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

-- Solde disponible : formule UNIQUE de référence (Specs §F, PRD §7.2).
-- Appliquée à l'identique à l'affichage, au contrôle des retraits et en base.
create or replace function public.get_available_balance(p_client uuid)
returns bigint
language sql
stable
as $$
  select free_savings + disbursed_loan - reserved_amount
  from public.wallets
  where client_id = p_client;
$$;
