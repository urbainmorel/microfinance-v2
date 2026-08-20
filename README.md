# Microfinance v2.1

Application web mobile-first (PWA) de microfinance : espace **client** (`/client`, `/auth`)
et **back-office** d'administration (`/admin`). L'application est un **portail de requêtes**
et un **outil de suivi** — elle digitalise les flux (dépôts, retraits, prêts) sans manipuler
l'argent physique (PRD §1.2).

## Contrat (source de vérité)

- `docs/index.md` — portail et hiérarchie de la documentation.
- `docs/business-rules-v1.md` — règles métier V1 validées à 100 %.
- `docs/contracts/dynamic-loan-contract-v1.md` — modèle, variables, clauses et cycle du contrat de prêt dynamique.
- `PRD_Microfinance_v2.1.md` — exigences fonctionnelles.
- `SPECIFICATIONS_TECHNIQUES_Microfinance_v2.1.md` — schéma, RLS, RPC/Edge Functions.
- `DESIGN.md` — système de design (tokens, composants, statuts).
- `ROADMAP.md` — plan d'exécution en lots verticaux + décisions.
- `CLAUDE.md` — règles d'ingénierie et invariants.
- `docs/adr/0001-modele-acces-deux-roles.md` — modèle d’accès V1 : client et chef d’agence administrateur.
- `docs/adr/0002-cadre-metier-credit-v1-umoa.md` — cadre UMOA, tarification, risque et décisions contractuelles.
- `docs/runbooks/amorcer-chef-agence.md` — procédure contrôlée de désignation de l’unique administrateur.
- `docs/runbooks/cibles-deploiement.md` — vérification des comptes et projets autorisés avant déploiement.

> **Décision V1 prioritaire :** l’application utilise uniquement les rôles `client` et `admin`.
> Le rôle `admin` est réservé au chef d’agence, seul opérateur du back-office.

> **Cadre métier validé le 20 août 2026 :** la V1 interne couvre les huit États de l'UMOA en
> XOF, avec un administrateur global, deux produits paramétrables, des mensualités constantes sur
> capital restant dû, un plafond interne de coût effectif à 20 % et des contrats dynamiques signés
> par PIN/OTP. Les règles détaillées sont dans `docs/business-rules-v1.md`.

## Stack

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v3 + Shadcn UI (rouge neutralisé) ·
React Hook Form + Zod · TanStack Query · Supabase (Auth, PostgreSQL, Storage, RPC
`SECURITY DEFINER`, Edge Functions) · next-intl (i18n) · Resend (emails).

## Démarrage

Prérequis : Node.js 22 ou supérieur et pnpm 11 (déclarés dans `package.json`).

```bash
corepack enable
pnpm install --frozen-lockfile
copy .env.example .env.local  # puis renseigner les variables Supabase quand le Cloud sera choisi
pnpm dev                     # http://localhost:3000 → redirige vers /auth/login
```

Le poste développeur n'exécute ni Docker ni `supabase start`. Tant que Supabase Cloud n'est pas
choisi, l'application peut être compilée avec les valeurs d'exemple, mais ses appels backend ne
seront pas fonctionnels.

## Variables d'environnement

| Variable                               | Portée             | Usage                                                    |
| -------------------------------------- | ------------------ | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Publique, Next.js  | URL du projet Supabase de l'environnement                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publique, Next.js  | Clé `sb_publishable_...`; accès contrôlé par Auth et RLS |
| `SUPABASE_SERVICE_ROLE_KEY`            | Serveur uniquement | Administration/Edge Functions; jamais côté navigateur    |
| `RESEND_API_KEY`                       | Secret Supabase    | Envoi transactionnel depuis les Edge Functions           |

Ne jamais commiter de valeur réelle. Les variables `NEXT_PUBLIC_*` sont configurées dans Netlify
par contexte; `RESEND_API_KEY` et toute clé privilégiée restent dans les secrets Supabase.

## Environnements Supabase et Netlify

- Créer deux projets Supabase Cloud distincts en région Paris `eu-west-3` : staging et production.
- Affecter les URL et publishable keys de staging aux contextes Netlify `deploy-preview` et
  `branch-deploy`, puis celles de production au contexte `production`.
- Connecter le dépôt GitHub à Netlify. `netlify.toml` impose `pnpm build`, Node 22, pnpm 11,
  active la skew protection et interdit le cache partagé sur `/client/*` et `/admin/*`.
- Ne pas installer ni épingler manuellement l'adaptateur Next.js : Netlify détecte l'App Router
  et fournit automatiquement son runtime OpenNext.
- Configurer le domaine d'envoi Resend (SPF, DKIM et DMARC), puis enregistrer `RESEND_API_KEY`
  comme secret dans chaque projet Supabase, jamais dans `netlify.toml`.

## Déploiement Supabase Cloud sans Docker local

Les déploiements sont exécutés uniquement dans des jobs GitHub Actions protégés. Prévoir les
secrets GitHub `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` et la variable
`SUPABASE_PROJECT_REF`, avec des valeurs distinctes pour staging et production. Le runner exécute :

```bash
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push --dry-run
supabase db push
supabase functions deploy --project-ref "$SUPABASE_PROJECT_REF" --use-api
```

`db push` applique les migrations directement au projet distant et `functions deploy --use-api`
fait réaliser le bundling côté Supabase : aucun daemon Docker local n'est requis. Le pipeline
déploie staging, exécute ses contrôles, demande une approbation GitHub Environment, puis répète les
mêmes commandes avec les identifiants de production. Les secrets Resend se configurent dans le
Dashboard Supabase ou dans un job protégé avec `supabase secrets set`; ils ne sont ni affichés ni
stockés dans le dépôt.

## CI GitHub

Le dépôt est prévu pour le compte GitHub `urbainmorel`, mais aucun remote GitHub n'est encore
configuré dans ce checkout. Les contrôles frontend sont exécutés par `.github/workflows/ci.yml`.

Les migrations et tests pgTAP sont exécutés par `.github/workflows/supabase-tests.yml` dans un
runner GitHub Ubuntu. Cette stack Supabase locale et son Docker restent confinés au runner GitHub;
aucun secret Supabase Cloud n'est requis pour les tests. Le workflow frontend utilise toujours
`pnpm install --frozen-lockfile`; toute modification de dépendance doit donc inclure le lockfile.

## Scripts

- `pnpm dev` · `pnpm build` · `pnpm start`
- `pnpm lint` · `pnpm typecheck` · `pnpm format:check`
- `pnpm test` — Vitest (logique comptable, amortissement, arrondi)

## Qualité (imposée mécaniquement)

ESLint (`max-lines`, `max-lines-per-function`, `complexity`, `no-explicit-any`, `import/order`,
`no-console`) + Prettier (`printWidth: 100`) + `tsconfig` strict, via un hook **pre-commit**
husky + lint-staged qui **bloque** tout commit non conforme.

## Invariants non négociables (Specs « Principes directeurs »)

1. **Une seule vérité comptable** — formule de solde unique, jamais recalculée côté client.
2. **Écritures comptables serveur uniquement** — RLS interdit toute écriture directe des wallets.
3. **Atomicité + idempotence** — changement de statut et mouvement dans la même transaction.
4. **Rôle via claim JWT** — `app_metadata.user_role`, jamais une valeur modifiable par l'utilisateur.
