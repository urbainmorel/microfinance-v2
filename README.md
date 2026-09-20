# Azari Microfinance v2.1

Application web mobile-first (PWA) de microfinance : espace **client** (`/client`, `/auth`) et **back-office** d'administration (`/admin`). L'application est un **portail de requêtes** et un **outil de suivi** — elle digitalise les flux (dépôts, retraits, prêts) sans manipuler l'argent physique (PRD §1.2).

---

## Documentation & Architecture (Sources de vérité)

Le projet dispose d'une documentation complète et structurée pour les équipes Produit, Développement et Exploitation :

- **[`docs/index.md`](docs/index.md)** — Portail global et hiérarchie documentaire.
- **[`docs/architecture.md`](docs/architecture.md)** — Architecture système, modèle de sécurité PIN/JWT, vérités comptables et diagrammes Mermaid.
- **[`docs/api-reference.md`](docs/api-reference.md)** — Référence complète des RPC `SECURITY DEFINER`, tables PostgreSQL, Edge Functions et Buckets Storage.
- **[`docs/testing-guide.md`](docs/testing-guide.md)** — Stratégie de tests à 3 niveaux (Vitest, pgTAP, Playwright) et contrôles CI/CD.
- **[`docs/business-rules-v1.md`](docs/business-rules-v1.md)** — Règles métier V1 validées (Cadre UMOA, XOF, Plafond TEG 20 %).
- **[`docs/contracts/dynamic-loan-contract-v1.md`](docs/contracts/dynamic-loan-contract-v1.md)** — Spécification des contrats de prêt dynamiques.
- **[`PRD_Microfinance_v2.1.md`](PRD_Microfinance_v2.1.md)** — Exigences fonctionnelles détaillées.
- **[`SPECIFICATIONS_TECHNIQUES_Microfinance_v2.1.md`](SPECIFICATIONS_TECHNIQUES_Microfinance_v2.1.md)** — Spécifications d'écrans, RLS et schéma de base de données.
- **[`DESIGN.md`](DESIGN.md)** — System Design UI (tokens, thèmes, composants et statuts).
- **[`ROADMAP.md`](ROADMAP.md)** — Plan d'exécution en lots verticaux.
- **[`CLAUDE.md`](CLAUDE.md)** — Règles d'ingénierie et invariants du code.

### Décisions d'Architecture Majeures (ADR)

- **[`ADR 0001 : Modèle d'accès à deux rôles`](docs/adr/0001-modele-acces-deux-roles.md)** — L'application utilise uniquement les rôles `client` et `admin` (réservé au Chef d'Agence).
- **[`ADR 0002 : Cadre métier crédit UMOA`](docs/adr/0002-cadre-metier-credit-v1-umoa.md)** — Cadre réglementaire UMOA (8 pays en XOF), mensualités constantes, plafond de coût effectif à 20 % et signature PIN/OTP.

---

## Tech Stack

| Composant                | Technologie Utilisée                                                         |
| :----------------------- | :--------------------------------------------------------------------------- |
| **Frontend**             | Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v3 + Shadcn UI     |
| **Gestion Formulaires**  | React Hook Form + Zod (Validation stricte client & serveur)                  |
| **Data Fetching**        | TanStack Query v5                                                            |
| **Backend / BaaS**       | Supabase Cloud (Auth, PostgreSQL 15+, Storage, RPCs `SECURITY DEFINER`)      |
| **Serverless Logic**     | Edge Functions Deno (`set-pin`, `verify-pin`, `recover-pin`, `send-email`)   |
| **i18n & Communication** | next-intl (Français / Anglais client) · Resend (Emails transactionnels)      |
| **Quality & Tests**      | Vitest (Calculs financiers) · pgTAP (Base de données/RLS) · Playwright (E2E) |

---

## Démarrage Rapide

### Prérequis

- Node.js 22 ou supérieur
- pnpm 11 (`corepack enable`)

### Installation & Lancement

```bash
# 1. Cloner le dépôt et installer les dépendances
pnpm install --frozen-lockfile

# 2. Configurer les variables d'environnement locales
copy .env.example .env.local

# 3. Lancer le serveur de développement
pnpm dev
```

L'application est accessible sur `http://localhost:3000` et redirige automatiquement vers `/auth/login`.

> **Remarque :** Le poste de développement local n'exécute ni Docker ni `supabase start`. Les appels backend nécessitent les identifiants d'un projet Supabase Cloud (Staging ou Dev).

---

## Variables d'Environnement

| Variable                               | Portée            | Description / Usage                                         |
| :------------------------------------- | :---------------- | :---------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Publique, Next.js | URL du projet Supabase de l'environnement                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publique, Next.js | Clé `sb_publishable_...` pour l'accès Auth & RLS client     |
| `SUPABASE_SERVICE_ROLE_KEY`            | Serveur / Edge    | Administration & Edge Functions (Jamais dans le navigateur) |
| `RESEND_API_KEY`                       | Secret Supabase   | Secret enregistré dans Supabase pour l'envoi d'emails       |

---

## Scripts Disponibles

```bash
# Développement & Build
pnpm dev              # Lance le serveur local avec Fast Refresh
pnpm build            # Génère le build de production Next.js
pnpm start            # Démarre le serveur de production compilé

# Qualité & Validation
pnpm lint             # Vérification ESLint (0 warning toléré)
pnpm lint:fix         # Correction automatique ESLint
pnpm typecheck        # Nettoyage des types Next + validation TypeScript strict
pnpm format           # Formatage complet du projet avec Prettier
pnpm format:check     # Contrôle de conformité du formatage

# Tests
pnpm test             # Exécution des tests unitaires Vitest (Finance & Amortissement)
pnpm test:watch       # Exécution des tests en mode interactif
```

---

## Invariants Non Négociables

1. **Une seule vérité comptable** — Formule de solde unique à 5 composantes, jamais recalculée côté client.
2. **Écritures comptables serveur uniquement** — Le RLS interdit toute écriture directe des portefeuilles. Tout mouvement transite par une RPC `SECURITY DEFINER`.
3. **Atomicité + idempotence** — Changement de statut d'une demande et mouvement de portefeuille associés dans la même transaction SQL.
4. **Rôle via claim JWT** — Autorisation basée sur `app_metadata.user_role`, jamais sur une valeur modifiable par l'utilisateur.
5. **Plafond TEG < 20 %** — Blocage automatique en base de tout produit ou prêt dont le coût effectif dépasse le plafond UMOA.
