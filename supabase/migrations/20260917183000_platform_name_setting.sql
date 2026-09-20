-- Ajout de la colonne platform_name dans app_settings (dynamique & modifiable via l'admin)
alter table public.app_settings
  add column if not exists platform_name text not null default 'Azari Microfinance';

-- Mise à jour du nom par défaut si l'enregistrement existe déjà
update public.app_settings
set platform_name = 'Azari Microfinance'
where platform_name is null or platform_name = 'Microfinance';

-- Mise à jour de la fonction RPC update_app_settings pour supporter platformName
create or replace function public.update_app_settings(p_values jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  perform app_private.require_active_staff(array['admin']);
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;

  select to_jsonb(s) into v_old from public.app_settings s where id for update;

  update public.app_settings set
    platform_name = coalesce(nullif(trim(p_values ->> 'platformName'), ''), platform_name),
    withdrawal_window_start = coalesce((p_values ->> 'withdrawalWindowStart')::int, withdrawal_window_start),
    withdrawal_window_end = coalesce((p_values ->> 'withdrawalWindowEnd')::int, withdrawal_window_end),
    default_after_days = coalesce((p_values ->> 'defaultAfterDays')::int, default_after_days),
    withdrawal_fee = coalesce((p_values ->> 'withdrawalFee')::bigint, withdrawal_fee),
    transfer_fee = coalesce((p_values ->> 'transferFee')::bigint, transfer_fee),
    kyc_retention_days = coalesce((p_values ->> 'kycRetentionDays')::int, kyc_retention_days),
    audit_retention_days = coalesce((p_values ->> 'auditRetentionDays')::int, audit_retention_days),
    updated_at = now()
  where id;

  select to_jsonb(s) into v_new from public.app_settings s where id;

  insert into public.audit_logs (
    user_id, user_role, action_type, old_value, new_value, reason
  ) values (
    auth.uid(),
    'admin',
    'APP_SETTINGS_UPDATED',
    v_old,
    v_new,
    'Mise à jour du paramétrage général (dont nom de la plateforme)'
  );
end;
$$;

revoke all on function public.update_app_settings(jsonb) from public, anon;
grant execute on function public.update_app_settings(jsonb) to authenticated;
