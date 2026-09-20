create or replace function app_private.enforce_v1_product_family_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_family uuid := coalesce(new.logical_product_id, new.id);
begin
  if not exists (
    select 1 from public.loan_products where logical_product_id = v_family
  ) and (
    select count(distinct logical_product_id) from public.loan_products
  ) >= 2 then
    raise exception using errcode = '22023', message = 'V1_PRODUCT_FAMILY_LIMIT';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_v1_product_family_limit on public.loan_products;
create trigger trg_enforce_v1_product_family_limit
before insert on public.loan_products
for each row execute function app_private.enforce_v1_product_family_limit();

insert into public.loan_products (
  id, logical_product_id, name, description,
  min_amount, max_amount, min_duration_months, max_duration_months,
  interest_rate, interest_method,
  processing_fee_percent, processing_fee_flat,
  management_fee_percent, management_fee_flat, insurance_rate,
  guarantee_rate, mandatory_savings_rate, late_penalty_rate, is_active
) values
  (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Prêt Essentiel',
    'Financement court terme pour les besoins essentiels.',
    50000, 300000, 3, 6,
    12.000, 'CONSTANT_INSTALLMENT',
    0, 0, 0, 0, 0,
    10.000, 5.000, 0.030, true
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'Prêt Croissance',
    'Financement du développement d’une activité.',
    100000, 1500000, 6, 12,
    15.000, 'CONSTANT_INSTALLMENT',
    0, 0, 0, 0, 0,
    10.000, 5.000, 0.030, true
  )
on conflict (id) do update set
  description = excluded.description;

revoke all on function app_private.enforce_v1_product_family_limit()
from public, anon, authenticated;
