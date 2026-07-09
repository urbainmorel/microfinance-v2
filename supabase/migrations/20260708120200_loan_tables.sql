-- Lot 1 — Domaine prêt : produits, demandes, prêts, échéanciers (Specs §B.5–8).

-- 5. loan_products — configuration paramétrable des produits (PRD §16.7).
-- Frais fixes (BIGINT FCFA) distincts des taux (%). Un produit peut combiner les deux.
create table public.loan_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  min_amount bigint not null,
  max_amount bigint not null,
  min_duration_months int not null,
  max_duration_months int not null,
  interest_rate numeric(6, 3) not null,                    -- taux périodique (mensuel), en %
  interest_method text not null default 'CONSTANT_INSTALLMENT'
    check (interest_method in ('CONSTANT_INSTALLMENT', 'DEGRESSIVE')),
  processing_fee_percent numeric(6, 3) default 0,          -- frais de dossier en %
  processing_fee_flat bigint default 0,                    -- frais de dossier fixe (FCFA)
  management_fee_percent numeric(6, 3) default 0,          -- frais de gestion en %
  management_fee_flat bigint default 0,                    -- frais de gestion fixe (FCFA)
  insurance_rate numeric(6, 3) default 0,                  -- assurance en %
  guarantee_rate numeric(6, 3) default 0,                  -- garantie en % du montant
  mandatory_savings_rate numeric(6, 3) default 0,          -- épargne obligatoire en % de l'échéance
  late_penalty_rate numeric(6, 3) default 0,               -- pénalité en % par jour de retard
  is_active boolean default true,
  created_at timestamptz default now(),
  constraint amount_bounds check (max_amount >= min_amount),
  constraint duration_bounds check (max_duration_months >= min_duration_months)
);

-- 6. loan_requests — demandes de prêt + workflow d'approbation (Specs §B.6).
create table public.loan_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  product_id uuid not null references public.loan_products(id),
  amount bigint not null,
  duration_months int not null,
  purpose text,
  monthly_income_estimate bigint,
  requested_disbursement_method text
    check (requested_disbursement_method in ('INTERNAL', 'MOBILE_MONEY', 'BANK_TRANSFER')),
  status public.loan_status_enum default 'DRAFT',
  approved_amount bigint,
  guarantee_required bigint,
  guarantee_blocked_partial bigint default 0,
  admin_comment text,
  rejected_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger trg_loan_requests_updated_at
  before update on public.loan_requests
  for each row execute function public.set_updated_at();

-- Un seul prêt « en cours » par client : les statuts non terminaux sont uniques par client
-- (contrainte structurante PRD §11.1, garantie au niveau base).
create unique index one_open_request_per_client
  on public.loan_requests (client_id)
  where status not in ('DISBURSED', 'REJECTED', 'CANCELLED');

-- 7. loans — prêts actifs générés au décaissement (Specs §B.7).
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.loan_requests(id),
  client_id uuid not null references public.profiles(id),
  total_amount bigint not null,          -- capital emprunté
  remaining_principal bigint not null,   -- capital restant dû (la dette)
  interest_rate numeric(6, 3) not null,
  interest_method text not null,
  start_date date not null,
  end_date date not null,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'CLOSED', 'DEFAULTED')),
  created_at timestamptz default now()
);

-- Un seul prêt ACTIVE par client (contrainte base, PRD §11.1).
create unique index one_active_loan_per_client
  on public.loans (client_id)
  where status = 'ACTIVE';

-- 8. amortization_schedules — échéanciers générés au décaissement (Specs §B.8).
create table public.amortization_schedules (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans(id) on delete cascade,
  installment_no int not null,
  due_date date not null,
  due_principal bigint not null,
  due_interest bigint not null,
  due_fees bigint default 0,
  due_mandatory_savings bigint default 0,
  total_due bigint generated always as
    (due_principal + due_interest + due_fees + due_mandatory_savings) stored,
  paid_principal bigint default 0,
  paid_interest bigint default 0,
  paid_fees bigint default 0,
  paid_mandatory_savings bigint default 0,
  penalty_accrued bigint default 0,       -- pénalités de retard cumulées sur l'échéance
  status text default 'PENDING' check (status in ('PENDING', 'PARTIAL', 'PAID', 'LATE')),
  updated_at timestamptz default now(),
  unique (loan_id, installment_no)
);

create index amortization_loan on public.amortization_schedules (loan_id);

create trigger trg_amortization_updated_at
  before update on public.amortization_schedules
  for each row execute function public.set_updated_at();
