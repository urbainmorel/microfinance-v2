# Amorcer le compte du chef d’agence

## Objectif

Désigner l’unique administrateur de la V1 après application des migrations. Cette opération est réservée à un opérateur Supabase autorisé et ne doit jamais être exposée dans l’application.

## Préconditions

- La migration `20260813090000_two_role_access_model.sql` est appliquée.
- Le chef d’agence possède déjà un compte créé par le parcours d’inscription.
- Son adresse e-mail est vérifiée.
- Aucun administrateur actif n’existe.
- Son UUID a été vérifié directement dans `auth.users` et `public.profiles`.

## Procédure

Dans le SQL Editor du projet Supabase concerné, remplacer les deux occurrences de l’UUID puis exécuter la transaction :

```sql
begin;

lock table public.profiles in share row exclusive mode;

do $$
declare
  v_user constant uuid := '<UUID_DU_CHEF_AGENCE>';
begin
  if exists (
    select 1 from public.profiles where role = 'admin' and is_active
  ) then
    raise exception 'ACTIVE_ADMIN_ALREADY_EXISTS';
  end if;

  perform set_config('app.privileged', 'on', true);

  update public.profiles
  set role = 'admin', is_active = true, updated_at = now()
  where id = v_user and role = 'client';

  if not found then
    raise exception 'TARGET_CLIENT_NOT_FOUND';
  end if;

  delete from auth.sessions where user_id = v_user;
end;
$$;

commit;
```

## Vérifications

```sql
select id, firstname, lastname, role, is_active
from public.profiles
where role = 'admin';
```

Le résultat doit contenir exactement une ligne active. Le chef d’agence doit ensuite se reconnecter pour obtenir un JWT contenant `app_metadata.user_role = admin`.

Le compte promu devient exclusivement administratif : il accède à `/admin/*` et n’utilise plus les parcours `/client/*`.

## Rotation du chef d’agence

La rotation est une opération de maintenance planifiée : désactiver et rétrograder l’ancien administrateur dans une transaction opérateur, révoquer sa session, puis appliquer la procédure d’amorçage au nouveau chef d’agence. Ne jamais maintenir deux administrateurs actifs, même temporairement.
