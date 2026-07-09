# ROADMAP — Implémentation Microfinance v2.1

Plan de mise en œuvre découpé en **lots verticaux** : chaque lot (sauf le socle) traverse tout le stack — formulaire → Zod → RPC/Edge Function serveur → RLS → base → UI — et se termine par un résultat **démontrable**. Le modèle de sécurité (rôle via JWT, RLS, écritures serveur, audit) est posé **une seule fois** au Lot 1 puis réutilisé à l'identique partout.

Chaque lot référence sa source : `PRD §x`, `Specs §x`, `DESIGN §x`. Ordre = chemin critique : on ne démarre un lot que si ses dépendances sont livrées.

---

## Décisions arrêtées (verrouillées le 2026-07-08)

Ces choix conditionnent le socle et sont désormais fixés. Ils s'appliquent dès la première migration.

| # | Décision | Choix verrouillé | Détail / impact | Réf |
|---|---|---|---|---|
| D1 | Environnement Supabase | **CLI locale + migrations** | Dev local (`supabase start`), schéma versionné dans le dépôt ; projet hébergé réservé à la préprod | Specs §2.2 |
| D2 | Fournisseur email | **Resend** | Envoi derrière une Edge Function | Specs §2.2 |
| D3 | Bibliothèque i18n | **next-intl** | Natif App Router, formatage devise/date par locale | PRD §19 |
| D4 | Stratégie de test | **Vitest + Playwright** | Vitest = comptable/amortissement/arrondi (unitaire) ; Playwright = E2E des parcours | PRD §22 |
| D5 | Échéancier de référence | **Synthétique dès le Lot 6b, validé ensuite** | Ex. 100 000 FCFA / 12 mois / annuités ; à faire valider par le métier puis remplacer par les vrais chiffres produit | PRD §22 |
| D6 | Fuseau plage 8h–19h | **Africa/Abidjan** (UTC+0, XOF canonique) | Aligne `settle_withdrawal` (Specs §D.5) — même décalage que l'ancien `Africa/Porto-Novo`. ✅ Spec corrigée le 2026-07-08 ; reste à appliquer au Lot 5 | PRD §13.6 |
| D7 | Version Tailwind | **Tailwind v3 (épinglé)** | `create-next-app` livre Tailwind v4 (config CSS-first). On épingle **v3** pour réutiliser tel quel le bloc `:root` HSL de DESIGN §4.3 (convention `hsl(var(--x))`) et `tailwind.config.ts`/`theme.extend`. Sert l'invariant « une seule source des tokens » ; chemin Shadcn le plus éprouvé. Stabilité > nouveauté (système financier). Appliqué au Lot 0. | DESIGN §4.3 |
| D8 | Versions socle | **Next.js 16.2 · React 19.2 · Node ≥ 20** | Versions résolues par le scaffold (App Router, RSC). `tsconfig` strict + extras (`noUncheckedIndexedAccess`, `noImplicitOverride`). Appliqué au Lot 0. | Specs §2.2 |
| D9 | Gestionnaire de paquets | **pnpm** (`pnpm-lock.yaml`) | npm bloquait de façon répétée en résolution/reify sur cette machine (réseau ~25 KiB/s instable, cache volumineux, SAT des peers React 19). pnpm — store persistant/reprise, hardlinks, peers permissifs — fiabilise l'install. `.npmrc` : `strict-peer-dependencies=false`, faible `network-concurrency`, timeouts longs. Appliqué au Lot 0. | — |
| D10 | Stack Supabase locale | **Ports 55xxx ; `analytics` désactivé en dev** | Un autre projet Supabase (KWABOR) occupe les ports 54xxx par défaut ⇒ remappage en 55xxx (`config.toml`) pour ne pas le perturber. `analytics` reste désactivé (exige Docker sur `tcp://2375`). `storage`, `edge_runtime` et `inbucket` **réactivés et sains au Lot 2** (upload KYC + Edge Functions PIN + emails) — l'ancien souci de conteneur `storage` unhealthy ne se reproduit plus. | Specs §2.2 |

---

## État d'avancement (journal)

**Socle comptable vérifié — 47 tests pgTAP verts** contre une base Supabase locale
(`supabase test db`), migrations rejouables de zéro (`supabase db reset`) :

- **Lot 1** — 14 tables + `app_settings`, RLS partout, garde des colonnes privilégiées,
  audit append-only, `on_auth_user_created` (profiles + wallet), Custom Access Token Hook.
  7 tests sécurité : un client ne peut ni écrire un wallet, ni changer son rôle, ni lire autrui.
- **Lot 3 (socle)** — `credit_wallet` (brique unique de crédit, liste blanche), `get_wallet_summary`,
  `get_available_balance` (formule unique). 5 tests.
- **Lot 5** — `create_withdrawal` (réservation atomique si disponible ≥ montant),
  `settle_withdrawal` (EXECUTE : débit prêt→épargne + plage horaire via `app_settings` ; REJECT/CANCEL :
  restitution). Idempotent (garde `PENDING`). 15 tests (dont anti double-engagement + débit ordonné).
- **Lot 6b** — `amortization_rows` (annuités/dégressif ; dernière échéance absorbe l'arrondi ;
  Σ capital = P). 9 tests — **ancre de non-régression D5**.
- **Edge Functions** `set-pin` / `verify-pin` (bcrypt serveur, anti-forçage) — **vérifiées e2e**
  sur `edge_runtime` : PIN posé, bon PIN accepté, verrouillage (HTTP 423) après 5 échecs.

**Lot 0 — VÉRIFIÉ + commité** : `tsc` / `eslint` / `prettier` / `vitest` verts, `next build` OK,
`/auth/login` rendu conforme au design, hook pre-commit rejette un commit fautif. Install pnpm
débloquée (réseau local contourné via `vendor/` + overrides `pnpm-workspace.yaml` — à régénérer
sur réseau correct ; voir mémoire `local-dev-setup`).

**Lot 2 — TERMINÉ + vérifié e2e.** Parcours d'entrée complet inscription → PIN → KYC → dashboard.
- Pages auth (inscription, connexion, vérification email, création PIN) via RHF + Zod ; routage
  post-auth §4.2 (`get_onboarding_state`, sans exposer le pin_hash).
- **Wizard KYC 9 sous-étapes** (PRD §6.4, 4.1→4.9) : saisie + **upload recto/verso/selfie**
  (verso facultatif si passeport), sauvegarde auto par étape, reprise (rechargement champs + pièces),
  case de certification. UI découpée (hook + sous-composants) sous les seuils ESLint.
- **Storage** : bucket privé `kyc-documents` (5 Mo, jpg/png/pdf), RLS « chacun son dossier »
  (chemin `<uid>/<docType>`) + lecture personnel ; migration **gardée** (`to_regclass`) donc
  rejouable même storage désactivé. `submit_kyc` durci : recto + selfie obligatoires, verso sauf
  passeport, `id_type` requis — le wizard ne peut être court-circuité (invariant serveur-autoritatif).
- **Vérifié e2e** (12 checks, API locale) : upload dans son dossier OK / dossier d'autrui refusé (RLS,
  HTTP 400) ; upsert `kyc_documents` idempotent (1 ligne au ré-upload) ; `submit_kyc` refusé si
  incomplet ; PIN posé/accepté puis **verrouillé (423) après 5 échecs**. + 47 tests pgTAP verts.

**Lot 3 — TERMINÉ + vérifié au navigateur.** Portefeuille en lecture (la vérité comptable), PWA client.
- **Dashboard** : carte héros portefeuille rendant les **4 formules uniques** via `get_wallet_summary`
  → `computeWalletSummary` (aucun calcul local) ; header (bonjour + badge KYC + cloche compteur non-lu) ;
  carte « Mon prêt » **État 1** ; boutons Retirer/Déposer ; états skeleton/erreur (DESIGN §15).
- **Écrans** : épargne (sous-comptes), notifications (liste lu/non-lu + « tout marquer lu », `read_at`),
  opérations & prêts & profil (déconnexion) ; **nav basse 4 onglets** (masquée pendant le KYC).
- **TanStack Query** : `queryKey ['wallet', uid]`, revalidation **10 s** (Specs §A Écran 3). Hooks
  sans `any` ni `!`. UI en tokens (héros `hero-green`, doré = bloqué/réservé, jamais de rouge).
- **Vérifié navigateur** (wallet semé PRD §7.2) : dashboard affiche exactement **95 000 / 15 000 /
  30 000 / 140 000 FCFA** ; notifications lu/non-lu + mutation persistée (unread 0) ; épargne
  25 000 / 10 000 / 5 000. + data-path RLS vérifié e2e (6 checks) ; `next build` 16 routes.

---

## Lot 0 — Socle projet
**Objectif :** un dépôt vivant qui démarre, sans logique métier.

- `git init` + commit initial des specs existantes (PRD, Specs, DESIGN, CLAUDE.md).
- Scaffold Next.js (App Router, TypeScript strict), structure `/client`, `/admin`, `/auth`.
- Tailwind + Shadcn ; **tokens `DESIGN.md` §4.3** en variables CSS + `tailwind.config.ts` ; **rouge Shadcn neutralisé** (`--destructive` → encre).
- Polices `next/font` (Sora, Instrument Sans) ; `lucide-react`.
- Providers : TanStack Query, RHF ; conventions Zod.
- `middleware.ts` (squelette de protection de routes, lecture du claim JWT — stub).
- Supabase CLI + dossier `supabase/migrations` (D1).
- **Qualité mécanisée** (cf. CLAUDE.md § Code quality) : ESLint (`max-lines`, `max-lines-per-function`, `complexity`, `no-explicit-any`, `import/order`, `no-console`) + Prettier (`printWidth: 100`) + tsconfig strict ; **hook pre-commit** husky + lint-staged qui **bloque** tout commit non conforme ; check CI équivalent.

**Fait quand :** l'app démarre, une page `/auth/login` s'affiche aux couleurs du design ; `lint`, `format:check` et `typecheck` passent ; un commit volontairement fautif (ligne >100, `any`, fichier trop long) est **refusé** par le hook.

---

## Lot 1 — Modèle de données & sécurité (colonne vertébrale)
**Objectif :** poser le socle backend dont **tout** dépend. Aucune UI.

- Les 14 tables (`Specs §B`) : `profiles`, `kyc_documents`, `kyc_financials`, `wallets`, `loan_products`, `loan_requests`, `loans`, `amortization_schedules`, `deposit_requests`, `withdrawal_requests`, `repayment_requests`, `notifications`, `notification_templates`, `audit_logs`.
- Contraintes structurantes : index uniques partiels **un seul prêt actif** (`one_open_request_per_client`, `one_active_loan_per_client`) ; `CHECK reserved_within_available` sur `wallets`.
- Sécurité (`Specs §C`) : `auth_role()`, **Custom Access Token Hook** (recopie `profiles.role` → `app_metadata.user_role`), RLS activée sur toutes les tables, policies « pas d'écriture directe » sur `wallets`/demandes.
- Garde-fous : trigger `guard_privileged_columns` (role/is_active/kyc_status), infrastructure `audit_logs` append-only + trigger d'audit générique (`Specs §D.10`).
- Trigger `on_auth_user_created` (création `profiles` à l'inscription).

**Fait quand :** migrations rejouables de zéro ; tests SQL prouvant qu'un client ne peut ni écrire un wallet, ni changer son rôle, ni relire les données d'autrui.

---

## Lot 2 — Auth & onboarding (première tranche verticale complète)
**Objectif :** valider le stack de bout en bout sur le parcours d'entrée. `PRD §4, §6` · `Specs §A Écrans 1-2, §D.1`.

- Inscription (`/auth/register`) : `signUp` + trigger profiles.
- Vérification email → écran d'attente + renvoi.
- Création PIN (`/auth/set-pin`) : Edge Function **`set-pin`** (bcrypt **serveur**, jamais client).
- Edge Function **`verify-pin`** : anti-forçage (compteur, verrouillage croissant après 5 échecs).
- **Redirections `middleware.ts`** selon l'état (`PRD §4.2`).
- KYC multi-étapes (`PRD §6.4`) : wizard 9 sous-étapes, **sauvegarde auto par étape**, upload pièces (Storage `kyc_documents`, chiffré au repos), soumission → `kyc_status = PENDING`.

**Fait quand :** un nouvel utilisateur va de l'inscription au dashboard (vide) ; le PIN se verrouille après 5 essais ; un KYC repris conserve ses étapes.

---

## Lot 3 — Portefeuille en lecture (la vérité comptable)
**Objectif :** afficher les soldes selon les **formules uniques**, sans jamais recalculer côté client. `PRD §7.2, §10` · `Specs §F` · `DESIGN §11.1`.

- `get_available_balance`, `get_wallet_summary` (RPC lecture).
- `credit_wallet` (RPC socle de tous les mouvements — testée isolément).
- Dashboard client : carte portefeuille (disponible / bloqué / réservé / patrimoine), carte « Mon prêt » **État 1**.
- Écran épargne (sous-comptes), historique (vide pour l'instant), cloche + liste notifications in-app.
- Revalidation TanStack Query 10 s (`Specs §A Écran 3`).

**Fait quand :** un wallet ensemencé en SQL s'affiche avec les 4 formules exactes ; états skeleton/vide présents (`DESIGN §15`).

---

## Lot 4 — Dépôts (initiation + confirmation caisse)
**Objectif :** premier vrai mouvement d'argent, atomique et idempotent. `PRD §13.1` · `Specs §A Écrans 4 & 8, §D.3`.

- Client : formulaire dépôt (montant, motif, mode, référence, **preuve** Storage `deposit_proofs`) + **PIN** → `deposit_requests` `PENDING`. **Aucun mouvement.**
- Caisse (`/admin/cashier/deposits`) : file d'attente, visualisation preuve, `confirm_deposit` / `reject_deposit` (atomiques, idempotentes).
- Crédit selon motif (`FREE_SAVINGS` / `GUARANTEE` / `REPAYMENT`) dans la même transaction.

**Fait quand :** un dépôt confirmé crédite le wallet une seule fois ; double-clic de confirmation = un seul crédit ; le disponible bouge selon la formule.

---

## Lot 5 — Retraits & virements (réservation + exécution)
**Objectif :** la mécanique de réservation et la plage horaire. `PRD §13.2, §13.3, §13.5-7` · `Specs §D.4-5`.

- `create_withdrawal` : **réserve** le montant atomiquement si disponible ≥ montant ; sinon échoue.
- Client : formulaires MM (`/client/withdraw/momo`) + virement bancaire (accent bleu) + **bannière 8h–19h**.
- Agent : file ; `settle_withdrawal` — **EXECUTE** (débit `disbursed_loan` puis `free_savings`, lève la réservation, contrôle plage horaire) / **REJECT** / **CANCEL** (réintègre le réservé).
- Annulation client d'une demande `PENDING` (`PRD §13.7`) + PIN.

**Fait quand :** on ne peut pas engager deux fois la même somme ; une exécution hors 8h–19h est refusée ; un rejet restitue exactement le réservé.

---

## Lot 6 — Prêts (le grand domaine)
Le plus gros lot ; découpé en sous-tranches livrables. `PRD §8-14` · `Specs §B.5-8, §D.6-9`.

- **6a — Produits (config admin).** CRUD `loan_products` (montants, durées, taux, méthode d'intérêt, frais, garantie, épargne obligatoire, pénalité). `PRD §16.7`.
- **6b — Simulation & demande.** `generate_amortization_schedule` (calcul serveur, `CONSTANT_INSTALLMENT` / `DEGRESSIVE`, **arrondi : dernière échéance absorbe l'écart**). Simulation pré-soumission + `loan_requests` + PIN. **Livrer ici l'échéancier de référence (D5).** `PRD §11`.
- **6c — Workflow d'approbation admin.** Revue KYC (`Valider`/`Rejeter`/`Complément`) + analyse prêt (`Analyser`→`Accepté`/`Rejeté`→validateur). Mapping statut→**10 états** via `get_active_loan_status`. `PRD §16.2-3, §9`.
- **6d — Constitution de garantie.** `process_guarantee_blocking` + `check_guarantee_completion` ; scénarios A (couvert) et B (blocage partiel → dépôt complément motif `GUARANTEE` → complétude). `PRD §12`.
- **6e — Décaissement.** `disburse_loan` : crée `loans`, génère l'échéancier définitif, crédite `disbursed_loan` si réception `INTERNAL`. États 7/8. `Specs §D.7`.
- **6f — Remboursement & clôture.** `repayment_requests` + `confirm_repayment` (**priorités : pénalités → intérêts → capital → épargne obligatoire**) ; à `remaining_principal = 0` → `release_funds_on_loan_close` (**mécanisme unique** de libération). État 9. `PRD §13.4, §14`.

**Fait quand :** un prêt parcourt demande → accord → garantie → décaissement → remboursement complet → libération, avec le disponible qui **ne chute jamais** à la clôture ; l'échéancier correspond au chiffré de référence.

---

## Lot 7 — Ordonnanceur & emails transactionnels
**Objectif :** l'automatisation temporelle et la communication. `PRD §15` · `Specs §E`.

- `pg_cron` quotidien : échéances en retard (`LATE`), accumulation des pénalités, prêts `DEFAULTED`, notifications « échéance proche J-3 » / « en retard ».
- `notification_templates` + envoi email via Edge Function (D2), variables dynamiques, **repli `fr`**.
- Émission des notifications in-app + emails sur tous les événements métier (`PRD §15.1`) — câblage transversal.

**Fait quand :** une échéance dépassée passe en retard et notifie ; un événement (ex. `loan_disbursed`) envoie l'email dans la langue du client.

---

## Lot 8 — Back-office : complétion
**Objectif :** finir les surfaces admin non couvertes par les lots verticaux. `PRD §16-18` · `DESIGN §14`.

- Dashboard KPIs temps réel (clients, KYC, prêts actifs/en retard, files, revenus).
- Éditeur de templates email (aperçu direct, variables, historique).
- Configuration : frais généraux, **plage horaire**, traductions (surcharge des clés client).
- Visualiseur du journal d'audit (lecture seule, append-only).
- Rapports : exports CSV / PDF.
- Application stricte de la **matrice de permissions** par rôle dans l'UI (l'auditeur ne voit aucune action mutative).

**Fait quand :** chaque rôle (`PRD §5`) ne voit et n'exécute que ses actions autorisées ; l'audit trace toute action sensible.

---

## Lot 9 — i18n, PWA, protection des données, durcissement
**Objectif :** conformité et qualité de lancement. `PRD §19-20` · `DESIGN §16-18`.

- i18n complète fr/en (`locales/{lang}/common|auth|dashboard.json`), sélecteur profil, détection `Accept-Language`, back-office FR only.
- PWA : `manifest.json`, service worker (stale-while-revalidate ; données sensibles jamais servies d'un cache obsolète sans **bannière**), états offline (`DESIGN §15`).
- Protection des données (`PRD §20`) : durées de conservation par type, suppression/anonymisation, consentement, chiffrement au repos vérifié.
- Accessibilité (`DESIGN §17`) : statuts doublés icône+texte, focus 2px, cibles ≥44px.
- Suite E2E Playwright des parcours critiques + non-régression amortissement (D5).

**Fait quand :** installable en PWA, bilingue sans troncature, parcours critiques couverts par les tests, checklist pré-prod (`PRD §22`) validée.

---

## Chemin critique & parallélisation

```
Lot 0 → Lot 1 → Lot 2 ─┬→ Lot 3 → Lot 4 → Lot 5
                       │                     │
                       └→ Lot 6 (a→b→c→d→e→f)┘  (6d dépend du dépôt = Lot 4)
                                     │
                                     └→ Lot 7 → Lot 8 → Lot 9
```

- **Séquentiel obligatoire :** 0 → 1 → 2 (socle + sécurité + auth).
- **6d (garantie)** dépend du **Lot 4 (dépôt)** pour le complément.
- **Parallélisable** une fois le Lot 3 acquis : la config produits (6a) et les files caisse (4/5) peuvent avancer en parallèle du reste.
- **Risque le plus élevé :** la logique d'amortissement/arrondi (6b) et l'atomicité des mouvements (4, 5, 6f). D'où D4/D5 : tests unitaires et échéancier de référence dès que possible.
