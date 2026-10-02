-- Lot Admin : Surveillance de quota et purge de stockage par plage de dates
create or replace function public.admin_get_storage_stats(
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total_bytes bigint := 0;
  v_total_files bigint := 0;
  v_matching_bytes bigint := 0;
  v_matching_files bigint := 0;
  v_buckets jsonb;
begin
  perform app_private.require_active_staff(array['admin']);

  -- Calcul de l'espace total occupé dans storage.objects
  select
    coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0),
    count(*)
  into v_total_bytes, v_total_files
  from storage.objects;

  -- Détail par bucket
  select coalesce(jsonb_agg(jsonb_build_object(
    'bucketId', bucket_id,
    'bytes', b_bytes,
    'files', b_files
  )), '[]'::jsonb)
  into v_buckets
  from (
    select
      bucket_id,
      coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0) as b_bytes,
      count(*) as b_files
    from storage.objects
    group by bucket_id
  ) b;

  -- Calcul de la plage de dates si fournie
  if p_start_date is not null and p_end_date is not null then
    select
      coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0),
      count(*)
    into v_matching_bytes, v_matching_files
    from storage.objects
    where created_at >= p_start_date and created_at <= p_end_date;
  end if;

  return jsonb_build_object(
    'totalBytes', v_total_bytes,
    'totalFiles', v_total_files,
    'quotaBytes', 1073741824, -- 1 Go (1024 * 1024 * 1024)
    'remainingBytes', greatest(0, 1073741824 - v_total_bytes),
    'usedPercentage', round(((v_total_bytes::numeric / 1073741824::numeric) * 100)::numeric, 1),
    'matchingFiles', v_matching_files,
    'matchingBytes', v_matching_bytes,
    'buckets', v_buckets
  );
end;
$$;

revoke all on function public.admin_get_storage_stats(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_get_storage_stats(timestamptz, timestamptz) to authenticated;

create or replace function public.admin_delete_storage_files_in_range(
  p_start_date timestamptz,
  p_end_date timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_role text := public.auth_role();
  v_deleted_count bigint;
  v_deleted_bytes bigint;
  v_total_bytes bigint;
begin
  perform app_private.require_active_staff(array['admin']);

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception using errcode = '22023', message = 'INVALID_DATE_RANGE';
  end if;

  -- Calcul du volume concerné avant suppression
  select
    count(*),
    coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0)
  into v_deleted_count, v_deleted_bytes
  from storage.objects
  where created_at >= p_start_date and created_at <= p_end_date;

  if v_deleted_count > 0 then
    delete from storage.objects
    where created_at >= p_start_date and created_at <= p_end_date;

    -- Traçabilité dans audit_logs
    insert into public.audit_logs (
      user_id,
      user_role,
      action_type,
      reason,
      old_value,
      new_value
    ) values (
      v_user,
      v_role,
      'STORAGE_PURGE',
      format('Purge manuelle de %s fichiers (%s octets) créés entre %s et %s', v_deleted_count, v_deleted_bytes, p_start_date, p_end_date),
      jsonb_build_object('startDate', p_start_date, 'endDate', p_end_date, 'filesCount', v_deleted_count, 'bytesFreed', v_deleted_bytes),
      jsonb_build_object('purged', true)
    );
  end if;

  select coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0)
  into v_total_bytes
  from storage.objects;

  return jsonb_build_object(
    'deletedCount', v_deleted_count,
    'freedBytes', v_deleted_bytes,
    'remainingBytes', greatest(0, 1073741824 - v_total_bytes),
    'usedPercentage', round(((v_total_bytes::numeric / 1073741824::numeric) * 100)::numeric, 1)
  );
end;
$$;

revoke all on function public.admin_delete_storage_files_in_range(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_delete_storage_files_in_range(timestamptz, timestamptz) to authenticated;
