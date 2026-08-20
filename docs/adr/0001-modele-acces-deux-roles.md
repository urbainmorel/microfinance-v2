# ADR 0001 — Modèle d’accès V1 à deux rôles

- **Statut :** accepté
- **Date :** 2026-08-13
- **Portée :** première version de production

## Décision

La V1 utilise exactement deux rôles applicatifs :

| Rôle technique | Personne concernée        | Accès                                                     |
| -------------- | ------------------------- | --------------------------------------------------------- |
| `client`       | Client de la microfinance | Espace client, uniquement ses propres données et demandes |
| `admin`        | Chef d’agence             | Intégralité du back-office et de ses opérations internes  |

Le chef d’agence est l’unique opérateur interne de l’application. Les autres membres de l’équipe travaillent selon les procédures internes de l’agence, mais ne disposent pas d’un rôle staff distinct dans cette version.

## Responsabilités de l’administrateur

Le rôle `admin` cumule les responsabilités auparavant séparées :

- validation et demande de complément KYC ;
- confirmation ou rejet des dépôts ;
- exécution ou rejet des retraits et virements ;
- analyse, validation et rejet des demandes de prêt ;
- constitution de la garantie et décaissement ;
- confirmation ou rejet des remboursements ;
- gestion des produits de prêt ;
- consultation du dashboard, des indicateurs et de l’audit ;
- activation des comptes et attribution des deux rôles ;
- traitement des demandes d’effacement et anonymisation.

## Règles de sécurité

- Une route `/admin/*` exige strictement le claim `user_role=admin`.
- Un administrateur est redirigé hors des routes `/client/*` et ne peut pas initier d’opération financière comme client.
- Les RPC privilégiées et `auth_role()` pour la RLS relisent `profiles.role` et `is_active` en base ; le JWT seul ne suffit pas.
- Tout ancien claim (`agent_credit`, `agent_caisse`, `validator`, `super_admin`, `auditor`) est normalisé comme `client` par le proxy et ne confère aucun privilège ; la RLS décide exclusivement depuis le profil actif en base.
- Le Custom Access Token Hook n’émet `admin` que pour l’unique profil administrateur actif.
- Une modification de rôle ou de statut révoque les sessions de la cible.
- Un compte `is_active=false` est refusé par les commandes PIN et par la récupération du PIN, même si son ancien JWT n’est pas encore expiré.
- L’administrateur ne peut ni se rétrograder ni se désactiver lui-même.
- Un index unique garantit qu’il n’existe jamais plus d’un administrateur actif.
- L’attribution du rôle `admin` n’est pas exposée au navigateur.
- Les actions du chef d’agence restent inscrites dans le journal d’audit.

## Migration

La migration `20260813090000_two_role_access_model.sql` :

1. révoque toutes les sessions de préproduction afin de renouveler les claims ;
2. convertit tous les comptes internes existants, y compris les anciens administrateurs, en clients désactivés, sans promotion implicite ;
3. limite la contrainte `profiles.role` à `client|admin` ;
4. remplace les contrôles privilégiés pour n’accepter que l’administrateur actif ;
5. conserve les anciennes valeurs déjà écrites dans `audit_logs` comme historique immuable.

La migration révoque en pratique toutes les sessions de préproduction une fois, afin que chaque compte obtienne les nouveaux claims `user_role` et `account_active` à sa prochaine connexion.

Après migration, le chef d’agence est désigné par un opérateur depuis le SQL Editor Supabase, jamais depuis l’inscription publique ni le back-office. La transaction contrôlée et les vérifications sont définies dans `docs/runbooks/amorcer-chef-agence.md`.

## Conséquences

- La matrice RBAC à sept rôles est retirée du périmètre V1.
- La gestion des rôles est retirée de l’interface ; le back-office gère uniquement l’activation des comptes.
- Il n’existe plus de vue auditeur en lecture seule ni de séparation applicative caisse/crédit/validation.
- Le risque de concentration des pouvoirs est compensé en V1 par l’audit append-only, l’idempotence, les gardes d’état et la traçabilité obligatoire des motifs.
- Une réintroduction de rôles spécialisés nécessitera une nouvelle ADR, une migration additive et une nouvelle matrice RLS/RPC testée.
