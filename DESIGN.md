# DESIGN.md — Application Microfinance

Système de design de l'application de microfinance, aligné sur le **PRD v2.1** et les **Spécifications techniques v2.1**. Il couvre l'**espace client** (mobile-first, PWA) et donne la **direction visuelle du back-office admin** (desktop-first, FR).

> **Rôle de ce document.** Il définit le langage visuel *et* sa traduction technique (tokens, composants Shadcn, états de données). Chaque décision est traçable vers une section du PRD ou des Specs (références `PRD §x` / `Specs §x`). Les fichiers `.dc.html` du projet sont des prototypes haute-fidélité **statiques** ; ce document décrit ce qu'ils encodent et comble les écrans/états qu'ils n'illustrent pas encore.

---

## 0. Portée & correspondance produit

| Surface | Public | Rendu | Langues | Densité |
|---|---|---|---|---|
| **Espace client** `/client/*` | Client final | CSR mobile-first (`Specs §A`) | fr (défaut) + en (`PRD §19`) | Calme, une carte = une idée |
| **Auth** `/auth/*` | Prospect / client | CSR | fr + en | Calme, focalisée |
| **Back-office admin** `/admin/*` | Agents, validateur, admin, super-admin, auditeur | SSR (`Specs §A`) | FR uniquement (`PRD §19.1`) | Dense assumée (tables, files d'attente) |

Le design **partage la même palette et les mêmes tokens** entre les trois surfaces ; seules la **densité** et la **navigation** diffèrent (voir §14 back-office).

---

## 1. Vision produit

Application client d'un établissement de microfinance : consultation des soldes, dépôt/retrait (Mobile Money, virement bancaire), demande et suivi de prêt, épargne (libre / garantie bloquée / obligatoire), historique, KYC, notifications, profil.

L'application est un **portail de requêtes et un outil de suivi** : elle **n'exécute pas** les flux d'argent, elle **enregistre des demandes, réserve des montants et notifie** (`PRD §1.2`). Le design doit donc rendre lisibles trois choses en permanence : **ce que le client a**, **ce qu'il a demandé** (en attente), et **ce qui est bloqué**.

Ton : sobre, rassurant, « premium accessible ». Pas de jargon bancaire froid ; chiffres et statuts toujours mis en avant clairement (FCFA, échéances, statuts KYC/transactions).

Devise : **FCFA (XOF)**, sans décimale, montants **entiers** (`PRD §2.3`), formatés en groupes de milliers séparés par une espace insécable : `210 000 FCFA`.

---

## 2. Principes de design (adossés aux valeurs métier du PRD §1.3)

1. **Les montants dominent** — solde et valeurs chiffrées toujours en `Sora` bold, jamais concurrencés visuellement.
2. **Une carte, une idée** — chaque bloc (solde, prêt en cours, transaction) est une carte autonome, jamais un tableau dense. *(Exception assumée : le back-office admin, §14.)*
3. **Transparence disponible / réservé / bloqué** (`PRD §1.3.3`) — la distinction entre les trois est un **invariant visuel** : trois traitements distincts, jamais confondus (voir §10 et §11.1).
4. **Statuts explicites** — badge pastel + **icône** + **libellé**, jamais la couleur seule (accessibilité, scannabilité). Chaque statut de donnée a un token dédié (§9).
5. **Traçabilité rassurante** (`PRD §1.3.2`) — toute demande affiche une **référence unique** et un **statut visible** ; l'état d'une opération n'est jamais ambigu.
6. **Calme visuel** — fond ivoire chaud, blanc cassé pour les cartes, un accent vert profond + un accent doré secondaire pour l'attention. **Jamais plus de 2 accents actifs par écran.**
7. **Mobile-first strict, desktop = confort de lecture** — le desktop ne réinvente pas les écrans, il recentre et ajoute de la respiration (§13).

---

## 3. Fondations d'implémentation (design ↔ stack)

Le design est pensé pour la stack imposée (`PRD §2.2`) : **Next.js (App Router)** · **TypeScript** · **Tailwind CSS + Shadcn UI** · **React Hook Form + Zod** · **TanStack Query** · **Supabase**.

- **Tokens → Tailwind.** Toutes les valeurs de couleur/rayon/espacement ci-dessous sont exposées en variables CSS (`:root`) puis référencées via `tailwind.config.ts` (`theme.extend`). On n'utilise pas de hex « en dur » dans les composants.
- **Composants → Shadcn.** Chaque composant du §8 est mappé à sa primitive Shadcn. **Le rouge par défaut de Shadcn (`--destructive`) est neutralisé** (§4) car la palette proscrit le rouge (`PRD §3`).
- **Polices → `next/font/google`** (self-hosting), pas de `<link>` Google Fonts distant : meilleure performance et compatibilité **offline PWA** (les polices sont mises en cache par le service worker, §16).
- **Formulaires → RHF + Zod.** Chaque champ du design a un schéma Zod de référence (§8, §11) ; les messages d'erreur suivent le traitement « erreur sans rouge » (§4, §15).
- **Données live → TanStack Query.** Les écrans à données sensibles (portefeuille, prêt) prévoient des états **skeleton / vide / erreur / offline** natifs (§15), avec revalidation 10 s côté dashboard (`Specs §A, Écran 3`).

---

## 4. Couleurs

### 4.1 Palette de base

| Rôle | Valeur | Usage |
|---|---|---|
| Fond app | `#E9E6DF` | Fond derrière la page / `background_color` PWA |
| Fond radial | `radial-gradient(1200px 600px at 50% -10%, #F2EFE8 0%, #E9E6DF 60%)` | Toile de fond des écrans |
| Fond surface app | `#F6F4EF` | Fond de l'app (viewport) |
| Carte / surface | `#FFFFFF` | Cartes, inputs, bottom nav, sidebar |
| Bordure surface | `#ECE8DF` | Bordure 1px des cartes et inputs |
| Séparateur | `#F0EDE4` | Lignes de séparation internes (listes) |
| Texte principal | `#16211B` | Titres, valeurs, texte fort |
| Texte secondaire | `#6C7A70` | Libellés, sous-titres |
| Texte tertiaire / discret | `#9AA69C` | Métadonnées, dates, placeholders |
| **Accent vert** (marque) | `#1F8A5B` | Icônes positives, liens, succès, CTA secondaires |
| Vert fond pastel | `#EEF5EA` | Fond d'icône / badge vert, item nav actif (desktop) |
| Vert bordure pastel | `#D8E5D4` | Bordure badge « Vérifié » |
| Vert profond (héros) | `#0B2B1E` → `#175C3B` | Dégradé carte solde, boutons foncés secondaires |
| **Accent doré** (attention) | `#D9A441` | Garantie, en attente, alertes douces, retard |
| Doré fond pastel | `#FBF3E2` / `#F3F0E6` | Fond icône doré / beige neutre |
| Doré texte | `#B08A3E` / `#8A6A1F` / `#8A7B4F` | Libellés sur fond doré pastel |
| Bleu (virement bancaire) | `#4A6580` sur `#EDF1F5` | Icône/fond dédiés au virement |
| Encre (CTA principal / texte inversé) | `#16211B` sur `#F6F4EF` | Boutons pleins principaux |
| Accent produit (tweak) | `#C9F455` / `#8FE3B0` / `#E8C46A` | Détail lumineux sur la carte héros (progression, glow), personnalisable |

### 4.2 Sémantique d'état (sans rouge — `PRD §3`)

La palette **ne contient aucun rouge**. Les états critiques réutilisent **doré + encre + icône explicite**, jamais un rouge inventé. Les montants négatifs restent en texte principal `#16211B` ; seuls les montants **entrants** sont verts `#1F8A5B`.

| Intention | Couleur texte/icône | Fond pastel | Icône outline (lucide) | Emplois |
|---|---|---|---|---|
| **Succès / positif** | `#1F8A5B` | `#EEF5EA` / bordure `#D8E5D4` | `check`, `check-circle` | KYC vérifié, dépôt confirmé, prêt soldé, montant entrant |
| **Attention / en cours** | `#B08A3E` | `#FBF3E2` | `clock`, `hourglass` | En attente, en analyse, garantie à constituer, réservé |
| **Info / bancaire** | `#4A6580` | `#EDF1F5` | `info`, `building-2` | Virement, notes informatives, plage horaire |
| **Retard (danger doux)** | `#8A6A1F` | `#FBF3E2` | `alert-triangle` | Échéance en retard, prêt `DEFAULTED` |
| **Rejet / refus (danger doux)** | `#16211B` | `#F3F0E6` | `x-circle` | KYC/dépôt/retrait/prêt rejeté, demande annulée |
| **Neutre / terminé / inactif** | `#6C7A70` | `#F3F0E6` | `minus-circle`, `archive` | Clôturé, brouillon, désactivé |

> Le PRD affiche parfois des emojis (`⚠️`, `✅`) à titre indicatif (`PRD §9`). En implémentation ils sont **remplacés par les icônes outline** correspondantes (§6) — **jamais d'emoji dans l'UI** (§6).

### 4.3 Mapping Shadcn (variables CSS)

```css
:root {
  /* Surfaces */
  --background: 44 25% 95%;      /* #F6F4EF */
  --foreground: 150 20% 11%;     /* #16211B */
  --card: 0 0% 100%;             /* #FFFFFF */
  --card-foreground: 150 20% 11%;
  --muted: 45 30% 92%;           /* #F0EDE4 */
  --muted-foreground: 140 7% 45%;/* #6C7A70 */
  --border: 43 26% 90%;          /* #ECE8DF */
  --input: 43 26% 90%;
  --ring: 152 63% 33%;           /* #1F8A5B (focus) */
  /* Actions */
  --primary: 150 20% 11%;        /* #16211B — CTA encre */
  --primary-foreground: 44 25% 95%;
  --secondary: 108 34% 94%;      /* #EEF5EA — vert pastel */
  --secondary-foreground: 150 20% 11%;
  --accent: 152 63% 33%;         /* #1F8A5B — vert marque */
  --accent-foreground: 0 0% 100%;
  /* Statuts sémantiques (ajoutés au thème) */
  --success: 152 63% 33%;
  --warning: 38 62% 46%;         /* doré */
  --info: 210 27% 40%;           /* bleu virement */
  /* Rouge neutralisé : PAS de rouge Shadcn par défaut */
  --destructive: 150 20% 11%;    /* encre, pas rouge */
  --destructive-foreground: 44 25% 95%;
  --radius: 0.875rem;            /* 14px base (inputs) */
}
```

**Règle d'or.** Jamais plus de **2 accents actifs** par écran (vert = positif/action, doré = attention/en cours). Le bleu virement est un accent **contextuel** (écran de virement) et ne compte pas comme troisième accent global.

---

## 5. Typographie

Deux familles, chargées via **`next/font/google`** (self-hosting, `display: swap`) :

- **Sora** (600/700/800) — titres, montants, valeurs chiffrées, labels de navigation active. Letter-spacing légèrement négatif sur les grands titres (`-0.2px` à `-1.2px`).
- **Instrument Sans** (400/500/600/700) — tout le texte courant : paragraphes, libellés de champs, boutons, nav.

Échelle (mobile) :

| Usage | Taille | Poids | Famille |
|---|---|---|---|
| Solde héros | 40px | 800 | Sora |
| Titre d'écran / montant carte | 26–34px | 700–800 | Sora |
| Titre de section | 15.5–19px | 700 | Sora |
| Valeur en ligne (montant liste) | 13.5–14px | 700 | Sora |
| Corps / libellés | 13–14.5px | 400–600 | Instrument Sans |
| Métadonnées / dates | 11–12px | 400–600 | Instrument Sans |
| Uppercase labels (section, badge) | 10.5–11.5px | 600–700, letter-spacing 0.4–1.6px | Instrument Sans |

- Sur desktop, augmenter l'échelle d'un cran pour les titres de page (§13) — ne jamais descendre sous **13px** pour du texte lu, ni sous **16px** pour les inputs (anti-zoom iOS, §16).
- **i18n / text expansion** (`PRD §19`) : la traduction `en` peut rallonger les libellés de ~30 %. Les boutons et badges ne fixent **jamais** de largeur ; ils s'étendent ou passent en 2 lignes sans troncature du montant.

---

## 6. Iconographie

- **Bibliothèque : `lucide-react`** (fournie avec Shadcn), style outline cohérent partout.
- Traits fins (`stroke-width` 1.4–1.8), jamais de remplissage plein sauf la pastille du bottom-nav actif.
- `viewBox` 14–22px, `stroke-linecap="round"`, `stroke-linejoin="round"`.
- Icône toujours dans un conteneur carré arrondi (12px radius, 34–36px) ou rond (badge/avatar), fond pastel assorti (vert → `#EEF5EA`, doré → `#FBF3E2`/`#F3F0E6`, bleu → `#EDF1F5`).
- **Jamais d'emoji** ni d'icône remplie type Material. Les `⚠️`/`✅` du PRD deviennent `alert-triangle` / `check-circle`.

---

## 7. Espacement, rayons, élévation

- **Grille d'espacement** : multiples de 2px — 4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 22 / 26px (exposés en échelle Tailwind).
- **Rayons** :
  - `999px` — pills (boutons, badges, chips, avatar, pastilles de statut)
  - `24–28px` — cartes majeures (héros solde, prêt en cours)
  - `18–20px` — cartes standard (actions rapides, répartition, transactions)
  - `12–16px` — inputs, conteneurs d'icône, petits blocs
- **Ombres** : très discrètes, jamais de halo dur.
  - Carte héros : `0 18px 40px -18px rgba(11,43,30,0.55)`
  - Cartes blanches : `0 1px 2px rgba(20,30,25,0.03)`
- **Bordures** : 1px `#ECE8DF` sur toute surface blanche posée sur `#F6F4EF` — c'est la séparation par défaut, **pas** l'ombre.

---

## 8. Composants clés (mappés à Shadcn)

| Composant design | Primitive Shadcn | Spécification visuelle |
|---|---|---|
| **Bouton principal** | `Button` (variant `default`) | Pill, hauteur 54px, fond `#16211B`, texte `#F6F4EF` 700/15px. |
| **Bouton secondaire (sur héros)** | `Button` (`secondary`/`ghost`) | Pill blanche 48px texte encre, ou pill translucide `rgba(255,255,255,0.10)` bordée. |
| **Champ de saisie** | `Input` + `Form*` | Hauteur 50–52px, radius 14px, fond blanc, bordure `#ECE8DF`, libellé au-dessus 12px/600/`#6C7A70`, `min 16px` texte. |
| **Champ montant (FCFA)** | `Input` custom | Aligné à droite, `Sora` 700, suffixe ` FCFA`, séparateur de milliers auto, `inputMode="numeric"`, entiers uniquement. |
| **Chip / segmented** | `Tabs` ou `ToggleGroup` | Pill 38–46px ; actif = fond `#16211B` texte clair ; inactif = blanc bordé `#6C7A70`. |
| **Badge de statut** | `Badge` custom | Pill pastel, **icône + texte** 10–11px/600–700 ; couleur = token §9. |
| **Carte** | `Card` | Surface blanche, bordure `#ECE8DF`, rayons §7. |
| **Carte de liste (transaction/notif)** | composé | Icône ronde 36px + titre 700/13.5px + métadonnée 11–12px + valeur à droite ; séparateur 1px `#F0EDE4`, retrait `margin-left: 48px`. |
| **Barre de progression** | `Progress` | Piste 5–8px `#EEEBE2`, remplissage vert→accent. Emplois : progression prêt (§11.2, État 7/8), force du mot de passe (`PRD §6.1`). |
| **Stepper (KYC / multi-étapes)** | composé | Segments 5px pill ; actif `#16211B`, inactif `#E5E1D5`. Sauvegarde auto par étape (`PRD §6.4`). |
| **Pavé PIN** | `Dialog`/`Drawer` + custom | Voir §8.1 — composant récurrent central. |
| **Feuille de confirmation** | `Sheet` (mobile) / `Dialog` (desktop) | Récapitulatif + PIN + CTA ; utilisée avant toute action financière (§8.1). |
| **Sélecteur** | `Select` | Opérateur MM, banque, langue, produit de prêt. |
| **Zone d'upload / preuve** | custom (`Input file`) | Voir §8.2. |
| **Bannière (info / offline)** | `Alert` | Info : bleu `#EDF1F5`. Offline / obsolète : doré (§15). |
| **Notification (toast)** | `Sonner` / `Toast` | Succès vert, attention doré, jamais rouge. |
| **Skeleton** | `Skeleton` | États de chargement des données sensibles (§15). |
| **État vide** | composé | Icône outline + phrase courte + CTA (ex. État 1 « Aucun prêt »). |
| **Dialogue destructif** | `AlertDialog` | Annulation d'une demande, blocage garantie : **encre**, pas rouge, + PIN. |
| **Navigation basse** | composé | Voir §12 — **4 onglets**. |
| **Navigation latérale (desktop/admin)** | composé | Voir §13, §14. |

Tous les états de survol restent subtils : léger assombrissement de bordure ou `translateY(-1px)`, jamais de changement de couleur brutal. **Focus clavier** : anneau 2px `#1F8A5B` offset 2px (§17).

### 8.1 Pavé PIN & feuille de confirmation (composant transversal)

Le Code PIN (`PRD §4.3`) est saisi **avant chaque action financière** : demande de prêt, retrait MM, virement, dépôt, remboursement, **blocage de garantie**, **annulation d'une demande en attente**, modification email/téléphone.

- **Création du PIN** (`/auth/set-pin`) : 4 à 6 chiffres, pavé numérique custom, points de progression, **double saisie** (confirmation). Schéma `z.string().regex(/^\d{4,6}$/)`. Le hachage est **serveur** (Edge Function `set-pin`, `Specs §D.1`) — aucune primitive côté client.
- **Feuille « Confirmer avec votre PIN »** : `Sheet` remontant du bas (mobile) contenant un **récapitulatif** (montant, destinataire, motif) puis le pavé PIN. Validée via `verify-pin` (`Specs §D.1`) avant toute insertion/RPC.
- **États d'erreur PIN** (§15) : « PIN incorrect » (doré, pas rouge) avec compteur discret ; au-delà de **5 tentatives**, écran **« Saisie verrouillée »** (durée croissante) + CTA « Réinitialiser par email » (OTP, `PRD §4.4/§4.6`).
- Accessibilité : cibles ≥ 44px, ordre clavier logique, aria-label sur chaque touche, saisie masquée par points.

### 8.2 Zone d'upload / preuve

Utilisée pour les pièces KYC (`PRD §6.4`) et les **preuves de paiement** (dépôt/remboursement, `PRD §13.1/§13.4`).

- Cadre pointillé `#ECE8DF`, icône `upload` + libellé, formats et taille max explicites : KYC **max 5 Mo**, preuve de paiement **max 10 Mo** (JPG, PNG, PDF).
- Aperçu miniature après sélection + bouton « Remplacer / Retirer ».
- Upload vers Supabase Storage (`deposit_proofs`, `kyc_documents`) — documents **chiffrés au repos** (`PRD §20.4`), jamais affichés en clair côté client hors propriétaire.
- États : idle → sélection → upload (progress) → succès / erreur (doré).

---

## 9. Système de statuts (design ↔ enums techniques)

**Principe** : chaque statut de la base a **un seul** token visuel, réutilisé partout (badge, carte, liste). Les libellés FR sont ceux du PRD ; les valeurs techniques sont celles des Specs.

### 9.1 Statut KYC (`profiles.kyc_status`, `Specs §B.1` · libellés `PRD §7.1`)

| Enum | Libellé FR | Token (§4.2) |
|---|---|---|
| `NONE` | À compléter | Neutre |
| `PENDING` | Soumis | Attention |
| `IN_REVIEW` | En vérification | Attention |
| `COMPLETED` | Vérifié | Succès |
| `INFO_REQUESTED` | Complément demandé | Attention |
| `REJECTED` | Rejeté | Rejet |

### 9.2 Demande de prêt (`loan_requests.status`) → état d'affichage (`PRD §9/§11.5`)

La correspondance statut → état est **calculée côté serveur** (`RPC get_active_loan_status`, `Specs §A Écran 3`). La carte « Mon prêt » (§11.2) ne fait que rendre l'état renvoyé.

| Enum `loan_status_enum` | Libellé FR | État (§11.2) | Token |
|---|---|---|---|
| `DRAFT` | Brouillon | — (non soumis) | Neutre |
| `SUBMITTED` | Demande envoyée | 2 | Attention |
| `IN_ANALYSIS` | En cours d'analyse | 2 | Attention |
| `PRE_APPROVED` | En analyse (pré-accord) | 2 | Attention |
| `INFO_REQUESTED` | Complément requis | 3 | Attention |
| `ACCEPTED` | Accepté sous condition | 4 | Succès (doux) |
| `GUARANTEE_PENDING` | Garantie en attente | 5 | Attention |
| `GUARANTEE_COMPLETE` | Garantie constituée | 6 | Succès |
| `AWAITING_DISBURSEMENT` | En attente de décaissement | 6 | Succès |
| `DISBURSED` | Décaissé → crée un `loan` | 7 / 8 | Succès |
| `REJECTED` | Demande non acceptée | 10 | Rejet |
| `CANCELLED` | Annulée | 1 | Neutre |

### 9.3 Prêt actif (`loans.status`) → état d'affichage

| Condition | Libellé FR | État | Token |
|---|---|---|---|
| `ACTIVE`, aucun remboursement | Prêt actif | 7 | Succès |
| `ACTIVE`, ≥ 1 remboursement | Remboursement en cours | 8 | Attention |
| `DEFAULTED` | En retard | 8 + alerte | Retard |
| `CLOSED` | Prêt soldé | 9 | Succès |

### 9.4 Demandes financières

| Table | Enum | Libellé FR | Token |
|---|---|---|---|
| `deposit_requests` / `repayment_requests` | `PENDING` | En attente de confirmation | Attention |
| | `CONFIRMED` | Confirmé | Succès |
| | `REJECTED` | Rejeté | Rejet |
| | `CANCELLED` | Annulé | Neutre |
| `withdrawal_requests` | `PENDING` | Demande envoyée | Attention |
| | `PROCESSING` | En traitement | Attention |
| | `COMPLETED` | Exécuté | Succès |
| | `REJECTED` | Rejeté | Rejet |
| | `CANCELLED` | Annulé | Neutre |
| `amortization_schedules` | `PENDING` | À venir | Neutre |
| | `PARTIAL` | Partiellement payée | Attention |
| | `PAID` | Payée | Succès |
| | `LATE` | En retard | Retard |

---

## 10. Formatage & représentation des montants

- **Entiers FCFA** (`PRD §2.3`), séparateur de milliers = espace insécable, suffixe ` FCFA` : `95 000 FCFA`.
- **Signe** : montant **entrant** en vert `#1F8A5B` (préfixe `+`) ; montant **sortant/négatif** en texte principal `#16211B` (jamais rouge).
- **Trois natures de fonds** rendues visuellement distinctes en permanence (`PRD §1.3.3`, formules §11.1) :
  - **Disponible** — dominant, `Sora` 800, encre `#16211B`.
  - **Bloqué** (garantie + épargne obligatoire) — doré, icône `lock`.
  - **Réservé** (retraits/virements en attente) — doré atténué, icône `clock`, mention « retenu sur le disponible ».
- Les arrondis d'échéance suivent la **règle unique** (`PRD §11.4`, `Specs §F`) : chaque composante arrondie à l'unité, la **dernière échéance** absorbe l'écart. L'affichage de la simulation (§11.3) ne recalcule jamais localement : il rend les valeurs serveur.

---

## 11. Écrans client — gabarit & patterns

Chaque écran suit le même gabarit, encapsulé dans le bezel `IOSDevice` (402×874) **pour le prototypage uniquement** (le frame ne doit jamais apparaître en production, §13) :

```
[Header : retour/avatar + titre + action (cloche/notif)]
[Zone scrollable : contenu en cartes empilées, padding horizontal 20px]
[Zone fixe basse : CTA pleine largeur OU bottom nav 4 onglets]
```

**Inventaire des écrans (aligné PRD)** — Auth : Connexion, Inscription (`/auth/register`), Vérification email, Création PIN (`/auth/set-pin`). KYC multi-étapes (9 sous-étapes, `PRD §6.4`). Client : Dashboard (`/client/dashboard`), Simulation de prêt, Demande de prêt, Suivi de prêt (carte 10 états), **Constitution de la garantie**, **Demande de dépôt** (`/client/deposit/request`), Retrait Mobile Money (`/client/withdraw/momo`), Virement bancaire, **Demande de remboursement** (`/client/repay/request`), **Compte épargne (sous-comptes)**, Historique des transactions, Reçu de transaction, Notifications, Profil (+ **sélecteur de langue**).

### 11.1 Carte Portefeuille (formules immuables — `PRD §7.2`, `Specs §F`)

Carte héros dégradé vert profond. Données via `RPC get_wallet_summary` (`Specs §A Écran 3`). **L'UI n'invente aucun calcul** : elle applique les formules de référence.

- **Solde disponible** (dominant, 40px) = `free_savings + disbursed_loan − reserved_amount`.
  - sous-lignes discrètes : *Dont épargne libre*, *Dont prêt décaissé disponible*.
- **Montant bloqué** = `blocked_guarantee + mandatory_savings` (doré, `lock`).
- **Retrait en attente** (libellé client de `reserved_amount`, doré atténué, `clock`). Invariant dev, non affiché dans l'UI : retenu sur le disponible, jamais compté deux fois dans le patrimoine.
- **Solde total / patrimoine** = `free_savings + disbursed_loan + blocked_guarantee + mandatory_savings` (le réservé n'est **jamais** ré-additionné).
- **Boutons sous la carte** : `Retirer` · `Déposer` (`PRD §7.2`).

Le prêt décaissé disponible **diminue au fil des retraits** (`PRD §7.2`) et la **clôture n'entraîne aucune chute** du disponible (`PRD §14`) : les animations de mise à jour restent douces (pas de « saut » visuel anxiogène).

### 11.2 Carte dynamique « Mon prêt » — 10 états (`PRD §9`)

Carte unique dont le **contenu et les boutons changent selon l'état** renvoyé par `get_active_loan_status` (1–10). Chaque état = un token (§9.2/9.3) + les CTA d'actions rapides contextuelles (`PRD §8`).

| État | Titre | Éléments clés | CTA |
|---|---|---|---|
| 1 | Mon prêt | « Vous n'avez aucun prêt en cours. » | `Demander un prêt` |
| 2 | Demande en cours | Montant demandé · *En cours d'analyse* | `Voir le détail` |
| 3 | Complément requis | Message d'action | `Compléter mon dossier` |
| 4 | Prêt accepté sous condition | Montant accordé · garantie requise | `Constituer la garantie` / `Voir les conditions` |
| 5 | Constitution de la garantie | Requise · déjà constituée · complément à déposer | `Déposer le complément` / `Voir l'état` |
| 6 | Garantie constituée | Montant accordé · garantie vérifiée | `Suivre le décaissement` |
| 7 | Prêt actif | Montant emprunté · capital restant · prochaine échéance · **barre de progression** | `Voir l'échéancier` |
| 8 | Remboursement en cours | Capital restant · progression · prochaine échéance · **retard éventuel** (`alert-triangle`, token Retard) | `Rembourser` / `Voir l'historique` |
| 9 | Prêt soldé | Total remboursé · **fonds débloqués** (garantie + épargne oblig. libérées) · total ajouté à l'épargne | `Voir mon solde` |
| 10 | Demande non acceptée | Message + réorientation | `Faire une nouvelle demande` |

Les **actions rapides** du dashboard (`PRD §8`) sont deux boutons dynamiques dérivés du même état — la matrice contextuelle est la source unique.

### 11.3 Simulation de prêt (`PRD §11.2`) — densité maîtrisée

La simulation affiche **beaucoup** de valeurs (taux, frais de dossier, frais de gestion, assurance, pénalité, garantie, épargne obligatoire, montant d'échéance, coût total, total à rembourser, montant récupérable, **calendrier prévisionnel**). Pour rester dans « une carte, une idée » :

- **Groupement en sections repliables** (`Accordion` Shadcn) : *Ce que je reçois* / *Ce que je paie* / *Ce que je récupère* / *Calendrier*.
- Les valeurs sont des **lignes label→valeur** (label secondaire à gauche, valeur `Sora` 700 à droite), pas un tableau de bord.
- Le **calendrier des échéances** est une liste de cartes compactes (échéance n°, date, montant), pas une grille dense.
- Toutes les valeurs viennent du **calcul serveur** (mêmes règles que `generate_amortization_schedule`, `Specs §D.8`) — jamais recalculées côté client.
- **Validation finale** : case « J'ai pris connaissance et j'accepte les conditions générales » + **feuille PIN** (§8.1).

### 11.4 Constitution de la garantie (`PRD §12`, `Specs §A Écran 7`)

Deux scénarios, un même composant récapitulatif + PIN :

- **Scénario A** (épargne libre ≥ requis) : « Votre épargne libre (X) couvre la garantie (Y). » → récap montant à bloquer + nouveau disponible → **PIN** → passage État 6.
- **Scénario B** (épargne libre < requis) : « Nous bloquons X ; il reste Y à déposer. » → **PIN** → blocage partiel, État 5 → le client dépose le complément (motif `Dépôt de garantie`) → l'agent confirme → complétude détectée → État 6.
- Aucune écriture côté client : tout passe par `process_guarantee_blocking` (`Specs §A Écran 7`).

### 11.5 Flux dépôt / retrait / virement / remboursement

Chaque flux = formulaire → **certification + PIN** → création d'une **demande** (aucun mouvement comptable côté client) → suivi par statut (§9.4).

- **Dépôt** (`PRD §13.1`) : montant, motif (`Épargne libre` / `Dépôt de garantie` / `Remboursement anticipé`), mode de paiement, référence, **preuve** (§8.2). Statut initial `En attente de confirmation`.
- **Retrait Mobile Money** (`PRD §13.2`) : opérateur, numéro, titulaire, montant → `create_withdrawal` **réserve** le montant atomiquement si le disponible suffit (`Specs §A Écran 5`). **Bannière info obligatoire** : « Votre retrait sera traité entre 8h et 19h. » (`PRD §13.6`).
- **Virement bancaire** (`PRD §13.3`) : banque, pays, titulaire, compte, code banque/IBAN, montant, motif ; accent **bleu** ; délai 24–48 h.
- **Remboursement** (`PRD §13.4`) : préchargement du prêt actif + échéances dues + pénalités ; borne max = total dû + pénalités ; preuve + PIN.
- **Annulation d'une demande** (`PRD §13.7`) : possible tant que `PENDING`/`ENVOYÉE` ; `AlertDialog` (encre) + PIN ; réintègre le réservé le cas échéant.
- **Reçu de transaction** : carte récapitulative avec **référence unique** (traçabilité, `PRD §1.3.2`), statut, horodatage, montant ; partageable/imprimable.

### 11.6 Compte épargne — sous-comptes (`PRD §10`)

Répartition claire en cartes : **Épargne libre** (retirable, sous réserve du réservé), **Dépôt de garantie bloqué**, **Épargne obligatoire liée au crédit**, **Historique des mouvements** (crédits/débits datés). Réutilise les tokens Disponible/Bloqué (§10).

### 11.7 Notifications (`PRD §15.1`)

Liste de cartes (icône ronde + titre 700 + corps court + horodatage), **état lu / non-lu** : non-lu = pastille accent + fond très légèrement teinté ; lu = neutre. La cloche du header porte un compteur non-lu. Les notifications push PWA reprennent visuellement ces cartes (§16).

---

## 12. Navigation basse — **4 onglets** (`PRD §7.6`)

La navigation client compte **4 onglets** (et non 5) :

1. **Accueil** (Dashboard) · 2. **Mes prêts** · 3. **Mes opérations** · 4. **Profil**.

- Barre blanche translucide `rgba(255,255,255,0.94)` + `backdrop-filter: blur(14px)`, bordure haute `#ECE8DF`, icône + label 10px, **pastille 4px** sous l'item actif dans la couleur d'accent.
- Cibles ≥ 44px, `safe-area-inset-bottom` respecté (§16).
- La **cloche de notifications** vit dans le header (pas dans la nav) pour préserver les 4 onglets.

---

## 13. Responsive : du mobile au desktop

Prototypé en mobile pur (frame iOS 402px). Implémentation web = **mobile-first progressive**.

**Breakpoints**
- `< 640px` — mobile (design de référence, inchangé).
- `640–1023px` — tablette : colonne unique, largeur de contenu plafonnée (~560px), centrée.
- `≥ 1024px` — desktop : layout à 2 zones.

**Adaptation desktop (client)**
- Bottom nav → **nav latérale fixe** (sidebar gauche ~240px, fond blanc, mêmes icônes/labels, item actif = fond vert pastel `#EEF5EA` + texte `#16211B`) — jamais de mega-menu.
- Colonne de contenu centrale plafonnée à **480–560px** pour les flux transactionnels (formulaires, wizard KYC, feuille PIN en `Dialog`).
- **Dashboard** en grille 2 colonnes ≥1024px : principale (solde héros + actions rapides + carte prêt) / secondaire (répartition + transactions récentes).
- Aucun changement d'échelle < 1024px ; au-delà, +2px sur les titres de section uniquement.
- Cibles tactiles ≥ 44px conservées ; le frame téléphone **n'apparaît jamais** en production.

---

## 14. Back-office admin — direction visuelle (`PRD §16`)

Le back-office (`/admin/*`, SSR, **FR uniquement**) sert des agents qui traitent des **files** et des **dossiers** : la densité y est **assumée** — c'est l'**exception** au principe « une carte, une idée » (§2). Il **réutilise la même palette et les mêmes tokens** (§4) pour la cohérence de marque, mais adopte des patterns desktop-first.

**Layout**
- Sidebar gauche fixe (~240px) : Tableau de bord, KYC, Demandes de prêt, Dépôts, Remboursements, Retraits & Virements, Configuration, Audit, Rapports (`PRD §16`).
- Contenu large (pas de plafond 560px) : les tables ont besoin de place.

**Composants**
- **Tableau de données** (`Table` Shadcn) : lignes denses, en-têtes triables, statut via badge (§9), pagination. Files d'attente = tables filtrées par statut (`PENDING`), avec compteurs (`PRD §16.1`).
- **Fiche dossier** (KYC / prêt) : panneau latéral ou page — champs, **aperçu des pièces** (photos, selfie), historique, épargne disponible (lecture seule pour l'agent de crédit).
- **Actions** = boutons explicites (`Valider`, `Rejeter` + motif obligatoire, `Demander un complément`, `Analyser`, `Accepter`, `Décaisser`, `Confirmer`, `Exécuter`). Toute action passe par une **RPC serveur** (`Specs §D`) ; l'UI ne modifie jamais un portefeuille directement.
- **KPI dashboard** (`PRD §16.1`) : cartes chiffrées (clients, KYC, prêts actifs/en retard, files, revenus) — ici les « cartes chiffres » restent aérées.
- **Éditeur de templates email** (`PRD §15.2`) : liste (slug, langue), édition sujet + corps (HTML/Markdown), **insertion de variables** balisées, **aperçu en direct**, **historique des modifications**. Repli linguistique `fr` par défaut.
- **Configuration produits** (`PRD §16.7`) : formulaires (montants, durées, taux, **méthode d'intérêt** `CONSTANT_INSTALLMENT`/`DEGRESSIVE`, frais, garantie, épargne obligatoire, pénalité), **plage horaire de traitement des retraits**, frais généraux, traductions.
- **Journal d'audit** (`PRD §17`) : table **append-only** en lecture seule (auteur, rôle, action, avant/après JSON, IP, horodatage) — aucune action de modification/suppression exposée.
- **Rapports** (`PRD §18`) : boutons d'export **CSV / PDF**.

**Contrainte de rôle visuelle** : l'UI n'affiche que les modules autorisés par le rôle porté dans le jeton (`Specs §A middleware`, matrice `PRD §5.2`). L'**auditeur** ne voit aucune action mutative (consultation seule).

---

## 15. États système (data-driven)

Chaque écran à données prévoit explicitement (TanStack Query, `Specs §A`) :

- **Chargement** : `Skeleton` aux dimensions du contenu réel (carte solde, listes) — pas de spinner générique.
- **Vide** : composant état vide (§8) — ex. État 1 « Aucun prêt », historique sans mouvement.
- **Erreur** : `Alert` doré + phrase claire + `Réessayer`. **Jamais de rouge.** Les erreurs de validation Zod s'affichent sous le champ (`FormMessage`) en **doré/encre + icône**, jamais couleur seule (§17).
- **Offline / obsolète** (PWA, §16) : bannière discrète « Dernière mise à jour à HH:MM » pour le solde/historique/statut de prêt (données sensibles, jamais servies « fraîches » depuis un cache obsolète sans indicateur, `PRD` cohérence). Les actions indisponibles hors-ligne (retrait, virement, demande de prêt) → **CTA grisé + message court**, jamais masqué.
- **Verrouillage PIN** (§8.1) : écran dédié après 5 échecs, CTA réinitialisation OTP.
- **Hors plage horaire** (retrait) : la demande reste possible ; l'exécution est côté agent (8h–19h). Le formulaire l'indique via la bannière info (§11.5).

---

## 16. PWA

L'application doit s'installer et fonctionner comme une app native légère (`PRD §2.1`).

**Manifest (`manifest.json`)**
```json
{
  "name": "Microfinance — Espace client",
  "short_name": "Microfinance",
  "start_url": "/client/dashboard",
  "display": "standalone",
  "background_color": "#E9E6DF",
  "theme_color": "#0B2B1E",
  "lang": "fr",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
- Icône source : pastille dégradé vert profond (`#175C3B` → `#0B2B1E`) + glyphe carte/coche, cohérent avec le logo Connexion/Inscription.
- `theme-color` meta = `#0B2B1E` ; fond de démarrage = `#E9E6DF`.

**Service worker / offline**
- *Stale-while-revalidate* pour les shells d'écran (HTML/JS/**polices `next/font`**) — l'app s'ouvre hors-ligne.
- **Solde, historique, statuts de prêt** = données sensibles : jamais servies depuis un cache obsolète sans **indicateur** (bannière §15).
- Actions non disponibles hors-ligne : CTA grisé + message (§15).

**Comportements natifs attendus**
- `env(safe-area-inset-*)` respectés (padding-top ~62–66px, padding-bottom ~28–30px anticipent encoche/home-indicator).
- Pas de zoom intempestif : `viewport initial-scale=1`, inputs ≥ 16px (iOS).
- Splash : fond `#E9E6DF`, logo centré, pas de spinner générique.
- **Notifications push** (statuts de transaction, échéances) reprennent visuellement les cartes de Notifications (§11.7).

---

## 17. Accessibilité

- Contraste texte principal `#16211B` sur `#F6F4EF`/`#FFFFFF` : conforme **AA**.
- Texte secondaire `#6C7A70` réservé aux libellés non critiques ; jamais seul pour une info d'action requise.
- **Statuts et erreurs toujours doublés icône + texte** — jamais couleur seule (essentiel puisque la sémantique repose sur vert/doré, sans rouge).
- Cibles tactiles ≥ 44×44px partout, y compris desktop et pavé PIN.
- Focus clavier : anneau 2px `#1F8A5B` offset 2px sur tout élément interactif (à implémenter explicitement — invisible dans les prototypes statiques).
- Formulaires (RHF) : `FormLabel` toujours présent, `FormMessage` lié via `aria-describedby`, erreurs annoncées aux lecteurs d'écran.
- i18n : contenu lisible en fr et en sans troncature ni chevauchement (§5, §18).

---

## 18. Internationalisation (design) (`PRD §19`)

- **Client multilingue dès le lancement** : `fr` (défaut) + `en`, structure extensible (ex. `es`) sans redéploiement.
- **Sélecteur de langue dans le Profil** (`Select`), valeur sauvegardée en base (`profiles.preferred_language`, `Specs §B.1`) ; détection initiale via `Accept-Language`.
- Clés dans `locales/{lang}/common.json`, `auth.json`, `dashboard.json` ; repli `fr`.
- **Back-office admin en FR uniquement** (`PRD §19.1`) — pas de sélecteur côté admin.
- Conséquences design : pas de largeur figée sur boutons/badges ; nombres/dates/devise formatés selon la locale (le FCFA reste sans décimale).

---

## 19. Ce que ce document est / n'est pas — traçabilité

Les fichiers `.dc.html` sont des **prototypes haute-fidélité statiques** (contenu figé, pas de logique métier). Ce DESIGN.md décrit le langage visuel qu'ils encodent **et** le complète pour couvrir l'intégralité du PRD/Specs : les 10 états du prêt, la carte portefeuille à formule unique, les statuts de toutes les demandes, le pavé PIN, les uploads, la simulation, les flux dépôt/retrait/virement/remboursement/garantie, l'i18n, la PWA, et la direction du back-office.

**À respecter dans l'implémentation front-end réelle** : formulaires fonctionnels (RHF + Zod), appels serveur (RPC/Edge Functions — **jamais d'écriture comptable côté client**, `Specs §D.2`), gestion d'état (TanStack Query), breakpoints desktop, manifeste PWA et service worker, tokens Tailwind/Shadcn avec **rouge neutralisé**.

**Correspondances rapides**

| Thème | PRD | Specs |
|---|---|---|
| Formules portefeuille | §7.2 | §F, §B.4 |
| Statuts prêt / 10 états | §9, §11.5 | §B.6, §A Écran 3 |
| PIN & anti-forçage | §4.3, §4.4 | §D.1 |
| Dépôt / retrait / remboursement | §13 | §A Écrans 4–6, §D.3–6 |
| Garantie | §12 | §A Écran 7 |
| Plage horaire 8h–19h | §13.6 | §D.5 |
| Clôture / libération | §14 | §D.9, §F |
| Notifications / emails | §15 | §B.12–13 |
| Back-office | §16–18 | §A, §C |
| i18n | §19 | §B.1 |
| PWA | §2.1 | — |
| Protection des données | §20 | §B, §C (RLS) |
