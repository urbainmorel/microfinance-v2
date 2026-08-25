begin;
select plan(4);

select is(
  (
    select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array[
        'withdrawal_hour_open', 'amortization_rows', 'set_updated_at',
        'get_available_balance', 'guard_privileged_columns', 'get_wallet_summary'
      ])
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as config(value)
        where config.value like 'search_path=%'
      )
  ),
  0,
  'les fonctions historiques ont un search_path vide'
);

select is(
  (
    select count(*)::int from (
      select tablename
      from pg_policies
      where schemaname = 'public' and cmd in ('SELECT', 'ALL') and permissive = 'PERMISSIVE'
      group by tablename
      having count(*) > 1
    ) duplicated
  ),
  0,
  'une seule politique permissive participe a SELECT par table'
);

select ok(
  (select qual like '%( SELECT auth.uid()%' from pg_policies
   where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_read'),
  'auth.uid est initialise une seule fois dans la politique proprietaire'
);

select ok(
  (select qual like '%auth_role()%' from pg_policies
   where schemaname = 'public' and tablename = 'loan_requests'
     and policyname = 'loan_requests_read'),
  'la politique consolidee conserve la lecture administrateur'
);

select * from finish();
rollback;
