# Microfinance v2.1

Application web mobile-first (PWA) de microfinance : espace **client** (`/client`, `/auth`)
et **back-office** d'administration (`/admin`). L'application est un **portail de requêtes**
et un **outil de suivi** — elle digitalise les flux (dépôts, retraits, prêts) sans manipuler
l'argent physique (PRD §1.2).

## Contrat (source de vérité)

- `PRD_Microfinance_v2.1.md` — exigences fonctionnelles.
- `SPECIFICATIONS_TECHNIQUES_Microfinance_v2.1.md` — schéma, RLS, RPC/Edge Functions.
- `DESIGN.md` — système de design (tokens, composants, statuts).
- `ROADMAP.md` — plan d'exécution en lots verticaux + décisions.
- `CLAUDE.md` — règles d'ingénierie et invariants.

## Stack

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v3 + Shadcn UI (rouge neutralisé) ·
React Hook Form + Zod · TanStack Query · Supabase (Auth, PostgreSQL, Storage, RPC
`SECURITY DEFINER`, Edge Functions) · next-intl (i18n) · Resend (emails).

## Démarrage

```bash
pnpm install
supabase start          # base locale (Lot 1) — reporter les clés dans .env.local
pnpm dev                # http://localhost:3000 → redirige vers /auth/login
```

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
