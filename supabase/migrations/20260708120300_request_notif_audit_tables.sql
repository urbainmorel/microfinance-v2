-- Lot 1 — Demandes financières, notifications, templates, audit (Specs §B.9–14).

-- 9. deposit_requests — demandes de dépôt initiées par le client (Specs §B.9).
create table public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  amount bigint not null check (amount > 0),
  motif text not null check (motif in ('FREE_SAVINGS', 'GUARANTEE', 'REPAYMENT')),
  payment_method text not null check (payment_method in ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER')),
  reference text,
  proof_url text not null,
  status text default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED')),
  confirmed_by uuid references public.profiles(id),
  rejected_reason text,
  created_at timestamptz default now(),
  confirmed_at timestamptz
);

create index deposit_requests_pending on public.deposit_requests (status) where status = 'PENDING';
create index deposit_requests_client on public.deposit_requests (client_id);

-- 10. withdrawal_requests — retraits MM et virements bancaires (Specs §B.10).
create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  type text not null check (type in ('MOBILE_MONEY', 'BANK_TRANSFER')),
  amount bigint not null check (amount > 0),
  recipient_operator text,
  recipient_phone text,
  recipient_bank text,
  recipient_account text,
  recipient_name text not null,
  status text default 'PENDING'
    check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED')),
  processed_by uuid references public.profiles(id),
  external_reference text,
  rejected_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index withdrawal_requests_pending on public.withdrawal_requests (status) where status = 'PENDING';
create index withdrawal_requests_client on public.withdrawal_requests (client_id);

create trigger trg_withdrawal_requests_updated_at
  before update on public.withdrawal_requests
  for each row execute function public.set_updated_at();

-- 11. repayment_requests — remboursements initiés par le client (Specs §B.11).
create table public.repayment_requests (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id),
  client_id uuid not null references public.profiles(id),
  amount bigint not null check (amount > 0),
  payment_method text not null check (payment_method in ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER')),
  reference text,
  proof_url text not null,
  status text default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED')),
  confirmed_by uuid references public.profiles(id),
  rejected_reason text,
  created_at timestamptz default now(),
  confirmed_at timestamptz
);

create index repayment_requests_pending on public.repayment_requests (status) where status = 'PENDING';
create index repayment_requests_client on public.repayment_requests (client_id);

-- 12. notifications — in-app (cloche) (Specs §B.12).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,                    -- ex : LOAN_DISBURSED, DEPOSIT_CONFIRMED
  title text not null,
  body text,
  payload jsonb default '{}',
  read_at timestamptz,
  created_at timestamptz default now()
);

create index notifications_user_unread on public.notifications (user_id) where read_at is null;

-- 13. notification_templates — emails multilingues (Specs §B.13). Une version par (slug, langue).
create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null,                    -- ex : loan_disbursed
  language text not null default 'fr',
  subject text not null,
  body_html text not null,
  variables jsonb default '[]',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz default now(),
  unique (slug, language)
);

-- 14. audit_logs — journal append-only (Specs §B.14, PRD §17).
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  user_role text not null,
  action_type text not null,
  target_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  reason text,
  created_at timestamptz default now()
);

create index audit_logs_target on public.audit_logs (target_id);
create index audit_logs_created on public.audit_logs (created_at desc);
