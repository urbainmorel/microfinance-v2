alter table public.loan_products
  add column if not exists logical_product_id uuid,
  add column if not exists revision integer,
  add column if not exists supersedes_id uuid references public.loan_products(id),
  add column if not exists retired_at timestamptz;
update public.loan_products set logical_product_id = id, revision = 1
where logical_product_id is null or revision is null;
alter table public.loan_products alter column logical_product_id set not null;
alter table public.loan_products alter column revision set not null;
alter table public.loan_products add constraint loan_product_revision_positive check (revision > 0);
create unique index loan_product_logical_revision on public.loan_products(logical_product_id, revision);

create or replace function app_private.initialize_loan_product_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.logical_product_id := coalesce(new.logical_product_id, new.id);
  new.revision := coalesce(new.revision, 1);
  return new;
end;
$$;
create trigger trg_initialize_loan_product_history before insert on public.loan_products
for each row execute function app_private.initialize_loan_product_history();

create or replace function app_private.guard_loan_product_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.name is distinct from old.name or new.description is distinct from old.description
    or new.min_amount is distinct from old.min_amount or new.max_amount is distinct from old.max_amount
    or new.min_duration_months is distinct from old.min_duration_months
    or new.max_duration_months is distinct from old.max_duration_months
    or new.interest_rate is distinct from old.interest_rate or new.interest_method is distinct from old.interest_method
    or new.processing_fee_percent is distinct from old.processing_fee_percent
    or new.processing_fee_flat is distinct from old.processing_fee_flat
    or new.management_fee_percent is distinct from old.management_fee_percent
    or new.management_fee_flat is distinct from old.management_fee_flat
    or new.insurance_rate is distinct from old.insurance_rate or new.guarantee_rate is distinct from old.guarantee_rate
    or new.mandatory_savings_rate is distinct from old.mandatory_savings_rate
    or new.late_penalty_rate is distinct from old.late_penalty_rate
    or new.logical_product_id is distinct from old.logical_product_id or new.revision is distinct from old.revision
    or new.supersedes_id is distinct from old.supersedes_id then
    raise exception using errcode = '22023', message = 'PRODUCT_REVISION_REQUIRED';
  end if;
  return new;
end;
$$;
create trigger trg_guard_loan_product_history before update on public.loan_products
for each row execute function app_private.guard_loan_product_history();

create or replace function public.revise_loan_product(p_product uuid, p_values jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_old public.loan_products; v_new uuid; v_revision integer;
begin
  perform app_private.require_active_staff(array['admin']);
  if p_values is null then raise exception using errcode = '22023', message = 'VALIDATION_ERROR'; end if;
  select * into v_old from public.loan_products where id = p_product for update;
  if not found then raise exception using errcode = 'P0002', message = 'PRODUCT_NOT_FOUND'; end if;
  select coalesce(max(revision), 0) + 1 into v_revision from public.loan_products
  where logical_product_id = v_old.logical_product_id;
  insert into public.loan_products (
    name, description, min_amount, max_amount, min_duration_months, max_duration_months,
    interest_rate, interest_method, processing_fee_percent, processing_fee_flat,
    management_fee_percent, management_fee_flat, insurance_rate, guarantee_rate,
    mandatory_savings_rate, late_penalty_rate, is_active, logical_product_id, revision, supersedes_id
  ) values (
    trim(p_values ->> 'name'), nullif(trim(p_values ->> 'description'), ''),
    (p_values ->> 'minAmount')::bigint, (p_values ->> 'maxAmount')::bigint,
    (p_values ->> 'minDurationMonths')::integer, (p_values ->> 'maxDurationMonths')::integer,
    (p_values ->> 'interestRate')::numeric, 'CONSTANT_INSTALLMENT',
    coalesce((p_values ->> 'processingFeePercent')::numeric, 0), coalesce((p_values ->> 'processingFeeFlat')::bigint, 0),
    coalesce((p_values ->> 'managementFeePercent')::numeric, 0), coalesce((p_values ->> 'managementFeeFlat')::bigint, 0),
    coalesce((p_values ->> 'insuranceRate')::numeric, 0), coalesce((p_values ->> 'guaranteeRate')::numeric, 0),
    coalesce((p_values ->> 'mandatorySavingsRate')::numeric, 0), coalesce((p_values ->> 'latePenaltyRate')::numeric, 0),
    coalesce((p_values ->> 'isActive')::boolean, false), v_old.logical_product_id, v_revision, v_old.id
  ) returning id into v_new;
  update public.loan_products set is_active = false, retired_at = now() where id = v_old.id;
  return v_new;
end;
$$;
revoke all on function public.revise_loan_product(uuid, jsonb) from public, anon;
grant execute on function public.revise_loan_product(uuid, jsonb) to authenticated;
revoke all on function app_private.guard_loan_product_history() from public, anon, authenticated;
revoke all on function app_private.initialize_loan_product_history() from public, anon, authenticated;
