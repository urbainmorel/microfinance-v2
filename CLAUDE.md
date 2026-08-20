# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mission & operating mandate

**Mission.** Build and ship the complete Microfinance v2.1 application — client PWA (`/client`, `/auth`) and admin back-office (`/admin`) — to production quality, faithfully implementing the three specification documents and following `ROADMAP.md` lot by lot. Own the outcome end to end as the accountable **senior/staff engineer**: not a code generator waiting for instructions, but the engineer responsible for a correct, secure, maintainable financial system.

**Operate to these standards:**

1. **Money correctness outranks velocity and features.** The wallet formulas and integrity invariants below are non-negotiable law. If a balance, rounding, or state transition is unclear, stop and reconcile against `Specs §F` / `PRD §7.2` — never guess a financial value into existence.
2. **Server-authoritative, atomic, idempotent — always.** No client-side accounting write, ever. A status change and its wallet movement share one transaction; a processed request can never be reprocessed.
3. **Plan the slice, then build it.** Work the roadmap in vertical slices. A lot is *done* only when it is exercised end to end, tested, and demoable — not when the code compiles.
4. **Test the risky logic first.** Amortization, rounding, reservation, and loan closure get unit tests before they are trusted; the D5 reference schedule is the non-regression anchor. Prove atomicity/idempotency with a double-submit test.
5. **Verify before claiming done, and report honestly.** Actually drive the flow and observe the behavior. If something fails or was skipped, say so with the output. No "should work."
6. **Keep the contract in sync.** PRD ↔ Specs ↔ DESIGN and the code never silently diverge; log every decision in `ROADMAP.md`. A rule change lands in the docs and the code together.
7. **Judgment over literalism.** The specs are the contract, but if one is ambiguous, self-contradictory, or would encode a bug (e.g. a formula that double-counts reserved funds), flag it and propose the fix — do not implement a known defect. Recommend a path; don't just enumerate options.
8. **Least privilege, defense in depth.** RLS on every table, role from the JWT claim only, PIN hashing/verification server-side, secrets out of the codebase, audit log append-only.
9. **Rigor in the small.** TypeScript strict, Zod at every boundary, small reviewable commits, code that matches the surrounding idiom.
10. **Escalate business decisions — never invent them.** Interest rates, fees, legal email copy, data-retention durations, and KYC acceptance rules belong to the microfinance. Ask; do not fabricate financial or legal parameters.

**Project-level definition of done:** every roadmap lot complete; full client journeys and back-office operational; auth + KYC + PIN hardened; accounting movements atomic/idempotent under RLS; notifications (in-app + email) and audit in place; i18n fr/en with FR-only admin; PWA installable; test suite green including the D5 reference schedule; the `PRD §22` pre-production checklist validated with the business.

## Project status: spec-first, no code yet

This repository currently contains **only specification documents** — there is no application code, no `package.json`, no build tooling, and no git repository yet. The three Markdown files below *are* the project; they fully specify a mobile-first microfinance web app that has not been scaffolded.

When implementing, treat these documents as the **source of truth** and trace every decision back to a section number (the docs cross-reference each other this way, e.g. `PRD §7.2`, `Specs §F`):

- **`PRD_Microfinance_v2.1.md`** — functional requirements: user journeys, roles, business rules, wallet formulas, loan states, notification catalog.
- **`SPECIFICATIONS_TECHNIQUES_Microfinance_v2.1.md`** — technical spec: Next.js screens, full PostgreSQL schema, RLS policies, and the SECURITY DEFINER RPC / Edge Function signatures. This is the implementation contract.
- **`DESIGN.md`** — design system: tokens, Shadcn component mapping, status→color mapping, screen patterns. Maps every visual decision back to a PRD/Specs section.

The documents are in **French** and describe **version 2.1**. Keep them in sync: a change to a business rule, formula, or schema must be reflected across all three (PRD ↔ Specs ↔ DESIGN) before or alongside the code change.

## Intended stack (per Specs §2.2)

Next.js (App Router, TypeScript) · Tailwind CSS + Shadcn UI · React Hook Form + Zod · TanStack Query · Supabase (Auth, PostgreSQL, Storage). Server-side business logic lives in Supabase **RPCs (`SECURITY DEFINER`)** and **Edge Functions**; scheduled jobs use **`pg_cron`**; transactional email via Resend/SendGrid.

Once the Next.js app is scaffolded, the conventional commands will apply (`npm run dev` / `build` / `lint`, and whatever test runner is chosen). **Do not invent these before they exist** — check `package.json` first. There is no test suite defined yet; the PRD (§22) calls for an end-to-end worked amortization example to serve as a non-regression reference — build that when tests are introduced.

## Architecture: the non-negotiable invariants

These four principles (Specs "Principes directeurs") govern the whole system. Violating any of them is a correctness/security bug, not a style choice:

1. **One accounting truth.** The available balance is defined by a single formula (below) applied *identically* in the UI, in withdrawal validation, and in the database. The UI never recomputes balances locally — it renders server values.
2. **Server-only accounting writes.** No wallet table is writable directly from the client. Every monetary movement goes through a controlled `SECURITY DEFINER` function. RLS on `wallets` explicitly denies all direct INSERT/UPDATE/DELETE (`Specs §C`).
3. **Atomicity + idempotency.** A request's status change and its wallet movement happen in the **same transaction**. An already-processed request can never be processed twice (double-credit protection) — enforced by guarded `UPDATE ... WHERE status = 'PENDING' RETURNING`.
4. **Role authority via JWT.** Authorization reads the role from a JWT claim (`app_metadata.user_role`, populated by a Custom Access Token Hook), never from a user-writable value. `middleware.ts` reads this claim without a DB query to route `/client/*` vs `/admin/*`.

### The wallet model (PRD §7.2 · Specs §F · DESIGN §11.1)

The `wallets` table has five integer sub-accounts (all amounts are **integer FCFA/XOF — no decimals**): `free_savings`, `disbursed_loan`, `blocked_guarantee`, `mandatory_savings`, `reserved_amount`. The immutable formulas:

```
SOLDE_DISPONIBLE (available) = free_savings + disbursed_loan − reserved_amount
MONTANT_BLOQUE   (blocked)   = blocked_guarantee + mandatory_savings
MONTANT_RESERVE  (reserved)  = reserved_amount
PATRIMOINE       (net worth) = free_savings + disbursed_loan + blocked_guarantee + mandatory_savings
```

Key subtleties that are easy to get wrong:
- **Reserved is never double-counted.** It is held *out of* available but still physically sits in `free_savings`/`disbursed_loan` until execution, so it is *never* re-added to net worth.
- **Withdrawal debit order:** on execution, debit `disbursed_loan` first, then `free_savings`; decrement `reserved_amount` by the same total.
- **Loan closure adds, never drops.** Because `disbursed_loan` is debited as the client spends it, closing a loan only *moves* `blocked_guarantee` + `mandatory_savings` + any `disbursed_loan` remainder into `free_savings` — available balance stays flat or rises, never crashes.

### Initiation + Confirmation pattern (PRD §13 · Specs §D)

Money flows are **digitized, not automated** — the app records requests and reserves amounts; the microfinance handles physical cash. Every financial flow follows: client submits a **request** (with PIN + proof) → **no accounting movement** → an agent **confirms/executes** → the accounting movement happens atomically server-side.

- **Deposits/repayments:** client creates `PENDING` request; cashier's `confirm_deposit` / `confirm_repayment` RPC credits the wallet by motif.
- **Withdrawals/transfers:** `create_withdrawal` RPC *reserves* the amount atomically (only if available balance suffices); `settle_withdrawal` executes (real debit) or rejects/cancels (releases reservation). Execution is only allowed **08:00–19:00 local (Africa/Abidjan, UTC+0)** — admin-configurable (decision D6, ROADMAP.md).
- **Repayment priority order:** penalties → accrued interest → principal → mandatory savings. When `remaining_principal` hits 0, closing the loan fires the **single** `release_funds_on_loan_close` trigger (the one and only fund-release mechanism).

### Loan lifecycle (PRD §9, §11.5 · Specs §B.6)

`loan_requests.status` (a 12-value enum) drives a workflow that maps to **10 display states** in the client's "Mon prêt" card. This status→state mapping is computed **server-side** by `get_active_loan_status` (§A Écran 3); the UI only renders the returned state. At disbursement a `loans` row is created and the amortization schedule is generated. Two interest methods per product: `CONSTANT_INSTALLMENT` (default annuity) and `DEGRESSIVE`. Rounding rule: each installment component rounds to whole FCFA and the **last installment absorbs the accumulated rounding error** so sums reconcile exactly.

**One active loan per client** is a hard constraint, enforced at the DB level by partial unique indexes (`one_open_request_per_client`, `one_active_loan_per_client`) — not just app logic.

### Security specifics

- **PIN:** 4–6 digits, hashed with bcrypt **server-side only** (Edge Function `set-pin`), verified server-side (`verify-pin`) with a failed-attempt counter and escalating lockout after 5 tries. Required before every financial action (`PRD §4.3`). Never hash/compare a PIN client-side.
- **Privileged columns** (`role`, `is_active`, `kyc_status`) are protected by a `guard_privileged_columns` trigger; only dedicated `SECURITY DEFINER` functions that set `app.privileged = 'on'` may change them.
- **`audit_logs` is append-only** — no policy permits UPDATE/DELETE; inserts happen via SECURITY DEFINER triggers on sensitive actions.
- KYC documents/selfies are **encrypted at rest** in Storage.

## Conventions

- **Language:** client UI is bilingual **fr (default) + en** from launch (`PRD §19`), extensible without redeploy via `locales/{lang}/*.json` with `fr` fallback. The **admin back-office is French only**. Specs/PRD/DESIGN and code domain terms use the French/English identifiers exactly as written in the schema (e.g. status enums are English: `PENDING`, `GUARANTEE_COMPLETE`).
- **Currency:** FCFA (XOF), integers only, formatted with non-breaking-space thousands separators: `95 000 FCFA`.
- **Design palette contains no red** (`DESIGN §4.2`). Shadcn's `--destructive` is neutralized to ink. Critical/error states use gold + ink + an explicit outline icon (never color alone; never emoji in the UI — use `lucide-react`).
- **Routes:** `/client/*` (CSR, mobile-first, protected), `/admin/*` (SSR, protected), `/auth/*` (public). Guarded by `middleware.ts` reading the JWT role claim.

## Code quality & maintainability

Senior-grade, maintenance-first. These are **enforced mechanically** (see Enforcement), not left to memory.

- **Size & shape.** Line length ≤ 100. Files stay focused: soft cap ~250 lines, split past ~300. Small single-purpose functions — early returns over deep nesting. One React component per file.
- **Types are the contract.** TS `strict`; no `any` (use `unknown` + narrowing); never silence the compiler with `!`. Zod schemas are the single runtime-validation source at every boundary — forms, RPC/Edge I/O, env vars.
- **One source of truth in code, too.** The accounting formulas (`Specs §F`), the loan status→state mapping, the FCFA formatter, and the design tokens each live in exactly one module and are imported everywhere — never re-inlined. This is the "one accounting truth" invariant expressed in code.
- **Respect the server/client boundary.** `'use client'` only when genuinely needed. Never a secret, service-role key, bcrypt call, PIN verification, or wallet write in a client component — those go through server functions / RPC / Edge Functions.
- **No user-facing hardcoding.** Strings → next-intl keys (never literals in JSX). Colors/spacing → design tokens (no raw hex, `DESIGN §3`). Money → the shared FCFA formatter.
- **Errors fail loud and honest.** No swallowed `catch`. Surface typed errors; the client renders them in gold, never red (`DESIGN §4.2`).
- **Hygiene.** No dead or commented-out code, no `console.log` in commits, ordered imports. Prettier owns formatting — never hand-format. Colocate tests; risky logic (amortization, rounding, reservation, closure, idempotency) must be unit-tested.
- **Commits.** Small, conventional (`feat:`, `fix:`, `refactor:`…), one concern each, reviewable diffs.

**Enforcement (configured in Lot 0 — guaranteed, not aspirational):** ESLint (`max-lines`, `max-lines-per-function`, `complexity`, `@typescript-eslint/no-explicit-any`, `import/order`, `no-console`, `react-hooks/*`) + Prettier (`printWidth: 100`) + strict `tsconfig`, gated by a **husky + lint-staged pre-commit hook** and CI. Run the built-in `/code-review` and `/simplify` before closing each lot — no custom skill needed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
