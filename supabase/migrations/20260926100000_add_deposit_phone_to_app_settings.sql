-- Ajout du numéro Mobile Money de dépôt dans les paramètres de la plateforme
alter table public.app_settings
  add column if not exists deposit_phone text default null;

-- Mise à jour de la fonction update_app_settings pour gérer le nouveau champ
create or replace function public.update_app_settings(p_values jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old jsonb; v_new jsonb;
begin
  perform app_private.require_active_staff(array['admin']);
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  select to_jsonb(s) into v_old from public.app_settings s where id for update;
  update public.app_settings set
    withdrawal_window_start = coalesce((p_values ->> 'withdrawalWindowStart')::int, withdrawal_window_start),
    withdrawal_window_end   = coalesce((p_values ->> 'withdrawalWindowEnd')::int, withdrawal_window_end),
    default_after_days      = coalesce((p_values ->> 'defaultAfterDays')::int, default_after_days),
    withdrawal_fee          = coalesce((p_values ->> 'withdrawalFee')::bigint, withdrawal_fee),
    transfer_fee            = coalesce((p_values ->> 'transferFee')::bigint, transfer_fee),
    kyc_retention_days      = coalesce((p_values ->> 'kycRetentionDays')::int, kyc_retention_days),
    audit_retention_days    = coalesce((p_values ->> 'auditRetentionDays')::int, audit_retention_days),
    deposit_phone           = coalesce(nullif(trim(p_values ->> 'depositPhone'), ''), deposit_phone),
    updated_at              = now()
  where id;
  select to_jsonb(s) into v_new from public.app_settings s where id;
  insert into public.audit_logs (
    user_id, user_role, action_type, old_value, new_value, reason
  ) values (auth.uid(), 'admin', 'APP_SETTINGS_UPDATED', v_old, v_new, 'Mise à jour du paramétrage général');
end;
$$;

revoke all on function public.update_app_settings(jsonb) from public, anon;
grant execute on function public.update_app_settings(jsonb) to authenticated;
