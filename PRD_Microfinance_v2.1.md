# PRD — APPLICATION MOBILE DE MICROFINANCE
**Version 2.1 — Spécifications Fonctionnelles Détaillées**

---

> **Décision V1 du 2026-08-13 — prioritaire sur les anciennes matrices de rôles :**
> la version de lancement comporte uniquement `client` et `admin`. Le rôle `admin` est
> réservé au chef d’agence, qui réalise toutes les opérations internes du back-office.
> Les rôles agent crédit, agent caisse, validateur, super-administrateur et auditeur sont
> retirés du périmètre V1. Voir `docs/adr/0001-modele-acces-deux-roles.md`.

> **Décisions métier V1 du 2026-08-20 — prioritaires :** le périmètre couvre les huit
> pays de l'UMOA en XOF, avec un administrateur global, deux produits paramétrables,
> mensualités constantes sur capital restant dû, coût effectif plafonné à 20 %, un seul
> prêt vivant et contrats dynamiques signés par PIN/OTP. Voir
> `docs/adr/0002-cadre-metier-credit-v1-umoa.md`, `docs/business-rules-v1.md` et
> `docs/contracts/dynamic-loan-contract-v1.md`.

## 1. PRÉSENTATION GÉNÉRALE DU PROJET

### 1.1 Contexte
La microfinance fonctionne aujourd'hui de façon manuelle : les dépôts, retraits et virements sont effectués physiquement en agence ou via virement externe. L'application n'a pas vocation à automatiser ces flux d'argent, mais à les **digitaliser** en apportant de la **traçabilité**, de la **transparence** et une **réduction des erreurs**.

### 1.2 Positionnement
L'application est un **portail de requêtes** et un **outil de suivi**. Elle ne manipule pas directement l'argent physique : elle **enregistre les demandes**, **réserve les montants** (pour éviter les doubles-emplois) et **notifie** le client à chaque étape. La contrepartie physique de chaque opération (encaissement, décaissement) reste gérée par la microfinance ; l'application enregistre la contrepartie comptable une fois l'opération confirmée par un agent.

### 1.3 Valeurs Métier Fondamentales
1. **Séparation stricte** : le client initie (demande + preuve), l'agent valide et exécute (saisie comptable).
2. **Traçabilité absolue** : chaque opération possède une référence unique et un statut visible.
3. **Transparence totale** : distinction claire entre disponible, réservé et bloqué.
4. **Cohérence comptable** : les formules régissant les soldes sont **immuables**, documentées (§7.2) et appliquées de façon identique côté affichage, côté contrôle et côté base de données.

### 1.4 Principes de sécurité directeurs
- Aucune donnée sensible n'est jamais stockée en clair (mot de passe, code PIN).
- Le rôle d'un utilisateur est une donnée d'autorisation : il n'est jamais modifiable par l'utilisateur lui-même et fait autorité via le jeton d'authentification (§4.5).
- Toute écriture comptable (crédit/débit de portefeuille) transite exclusivement par des fonctions serveur contrôlées, jamais par une écriture directe depuis le client.
- Toute action financière est confirmée par un facteur de possession (code PIN) et journalisée.

---

## 2. TYPOLOGIE DE L'APPLICATION & STACK TECHNIQUE

### 2.1 Type d'Application
- **Web App Mobile-First** (responsive, optimisée pour les téléphones).
- Évolutive vers **PWA** (installable) puis application native via wrapper (Capacitor) en phase ultérieure.

### 2.2 Stack Technique

| Composant | Technologie | Usage précis |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | SSR pour l'admin, CSR pour le client mobile |
| **Langage** | TypeScript | Typage strict des modèles financiers |
| **Styling** | Tailwind CSS + Shadcn UI | Composants accessibles et personnalisables |
| **Formulaires** | React Hook Form + Zod | Validation synchronisée client/admin |
| **État Serveur** | TanStack Query | Cache, mutations, revalidation |
| **Backend BaaS** | Supabase | Auth, PostgreSQL, Storage (pièces justificatives) |
| **Sécurité BDD** | Row Level Security (RLS) | Isolation des données par client et par rôle |
| **Logique métier** | Supabase RPC (`SECURITY DEFINER`) / Edge Functions | Écritures comptables, simulations, libération, vérification PIN |
| **Ordonnancement** | `pg_cron` (ou Edge Function planifiée) | Passage des échéances en retard, pénalités, rappels |
| **Emails** | Resend / SendGrid (via Edge Functions) | Envoi transactionnel avec templates dynamiques |

### 2.3 Devise et unités
La devise de référence est le **FCFA (XOF)**, sans sous-unité décimale. Tous les montants sont stockés en **entiers** (le FCFA est l'unité indivisible). Les règles d'arrondi appliquées aux calculs de crédit sont définies en §11.4.

---

## 3. ARCHITECTURE DE DONNÉES (PRINCIPALES TABLES)

- `profiles` — clients, agents, administrateurs (identité + statut KYC + langue).
- `kyc_documents` — pièces d'identité (recto/verso) et selfie de vérification.
- `kyc_financials` — informations financières collectées au KYC (revenus, charges, Mobile Money, banque).
- `wallets` — sous-comptes du portefeuille (épargne libre, prêt décaissé disponible, garantie bloquée, épargne obligatoire, montant réservé).
- `loan_products` — configuration des produits de prêt (montants, durées, taux, frais, garantie, épargne obligatoire, méthode d'intérêt).
- `loan_requests` — demandes de prêt et suivi du workflow d'approbation.
- `loans` — prêts actifs générés après décaissement.
- `amortization_schedules` — échéanciers.
- `deposit_requests` — demandes de dépôt initiées par le client.
- `withdrawal_requests` — demandes de retrait Mobile Money et de virement bancaire.
- `repayment_requests` — demandes de remboursement initiées par le client.
- `notifications` — notifications in-app (cloche).
- `notification_templates` — templates d'emails transactionnels multilingues.
- `audit_logs` — journal des actions sensibles.

---

## 4. SYSTÈME D'AUTHENTIFICATION & SÉCURITÉ

### 4.1 Mécanismes d'Authentification
1. **Inscription** : email + mot de passe (minimum 8 caractères, dont au moins 1 majuscule et 1 chiffre).
2. **Vérification email** : lien envoyé à l'adresse. Le compte reste inactif tant que le lien n'est pas cliqué.
3. **Création du Code PIN** :
   - 4 à 6 chiffres, strictement numériques.
   - Haché en base via `bcrypt` (jamais en clair). Le hachage est réalisé **côté serveur** (Edge Function).
   - Saisie double (confirmation) obligatoire.
4. **Connexion** : email + mot de passe.

### 4.2 Règles de redirection (après connexion)

| Condition | Page de destination |
| :--- | :--- |
| Email non vérifié | Écran `Vérification en attente` (avec bouton renvoyer) |
| Email vérifié mais PIN non créé | Écran `Création du code PIN` |
| PIN créé mais KYC non commencé / incomplet | Écran `Compléter mon profil (KYC)` |
| KYC soumis, en cours de vérification, ou validé | **Dashboard Client** |

### 4.3 Cas d'usage du Code PIN (obligatoire)
L'utilisateur saisit systématiquement son Code PIN avant de valider :
- une demande de prêt ;
- une demande de retrait Mobile Money ;
- une demande de virement bancaire ;
- une demande de dépôt (initiation) ;
- une demande de remboursement (initiation) ;
- le **blocage de la garantie** (passage de l'épargne libre en garantie bloquée) ;
- l'**annulation d'une demande en attente** ;
- la modification de l'adresse email ou du numéro de téléphone.

### 4.4 Protection du Code PIN contre le forçage
Le code PIN protégeant des opérations financières, sa vérification est protégée contre les tentatives répétées :
- La vérification est réalisée **exclusivement côté serveur** (Edge Function) ; le PIN haché n'est jamais exposé au client.
- Un compteur de tentatives échouées est maintenu par compte. Au-delà de **5 tentatives** échouées consécutives, la saisie du PIN est **verrouillée temporairement** (durée croissante).
- Le déverrouillage s'effectue via un OTP email (§4.6, réinitialisation du PIN). Une saisie correcte réinitialise le compteur.

### 4.5 Autorité du rôle utilisateur
Le rôle (`client`, `agent_credit`, etc.) est la donnée d'autorisation centrale du système. Il fait autorité via le **jeton d'authentification** (claim applicatif). Il n'est **jamais modifiable par l'utilisateur** : seul un administrateur habilité peut attribuer ou modifier un rôle, et toute tentative de modification par un non-administrateur est rejetée côté base. Il en va de même pour le statut d'activation du compte et le statut KYC.

### 4.6 OTP Email (cas spécifiques)
Un OTP (mot de passe à usage unique) envoyé par email est utilisé pour :
- la réinitialisation du mot de passe ;
- la réinitialisation ou le déverrouillage du code PIN ;
- la confirmation d'une connexion depuis un nouvel appareil ;
- le changement d'adresse email.

---

## 5. RÔLES & MATRICE DES PERMISSIONS

### 5.1 Définition des 7 rôles

| Rôle | Description fonctionnelle |
| :--- | :--- |
| **Client** | Utilisateur final. Initie des demandes, consulte ses soldes. |
| **Agent de Crédit** | Analyse les dossiers de prêt (accès en lecture à l'épargne du client). Ne touche pas aux flux financiers. |
| **Agent de Caisse** | Gère les flux entrants/sortants. Confirme dépôts, remboursements, retraits, virements. |
| **Validateur** | Approuve les prêts (après analyse) et les décaissements. |
| **Administrateur** | Paramètre les produits, taux, frais, templates d'emails et traductions. |
| **Super Administrateur** | Gère les rôles, bloque/débloque des comptes, consulte l'audit intégral. |
| **Auditeur** | Consultation seule (données, logs, rapports). Aucune modification. |

### 5.2 Matrice des permissions (extraits critiques)

| Action | Client | Agent Crédit | Agent Caisse | Validateur | Admin | Super Admin | Auditeur |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Voir son propre solde | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Initier une demande de prêt | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Consulter le KYC d'un client | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Consulter l'épargne d'un client | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Valider / Rejeter un KYC | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Approuver un prêt | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Confirmer un dépôt client | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Confirmer un remboursement | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Décaisser un prêt | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Modifier un template d'email | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Consulter le journal d'audit | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Attribuer / modifier un rôle | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Bloquer un compte client | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## 6. PARCOURS D'INSCRIPTION & KYC

### 6.1 Étape 1 — Création du compte
**Formulaire :** Prénom (obligatoire), Nom (obligatoire), Adresse email (unique), Mot de passe (avec indicateur de force), Confirmation du mot de passe.

**Post-soumission :**
- Compte créé avec statut KYC `NONE` et email non vérifié.
- Envoi d'un email transactionnel `welcome_verify` (lien de vérification).
- Redirection : *« Un lien de vérification a été envoyé à votre adresse email. Cliquez dessus pour activer votre compte. »*

### 6.2 Étape 2 — Vérification de l'email
Clic sur le lien → email vérifié → redirection automatique vers la création du PIN.

### 6.3 Étape 3 — Création du Code PIN
Saisie du PIN (4 à 6 chiffres) + confirmation. Si correspondance, enregistrement haché côté serveur, puis redirection vers le KYC.

### 6.4 Étape 4 — KYC multi-étapes (avec sauvegarde automatique)
Chaque étape est un formulaire distinct, sauvegardé en base à chaque validation. Le client peut quitter et reprendre plus tard.

- **4.1 Informations personnelles** : date de naissance, pays de résidence.
- **4.2 Adresse et contact** : ville, quartier, adresse précise, numéro de téléphone (format international).
- **4.3 Activité professionnelle** : profession, revenu mensuel estimé.
- **4.4 Pièce d'identité** : type (CNI, Passeport, Permis), numéro, date d'expiration.
- **4.5 Téléchargement recto** : image (JPG, PNG, PDF) – max 5 Mo, stockée dans `kyc_documents`.
- **4.6 Téléchargement verso** (optionnel si passeport) : image, stockée dans `kyc_documents`.
- **4.7 Selfie de vérification** : photo du client tenant sa pièce à côté de son visage, stockée dans `kyc_documents`.
- **4.8 Informations financières** (stockées dans `kyc_financials`) : source principale de revenus, charges mensuelles approximatives, opérateur Mobile Money principal, numéro Mobile Money principal, banque habituelle.
- **4.9 Confirmation et soumission** : récapitulatif, case *« Je certifie l'exactitude des informations fournies »*, bouton **« Soumettre mon dossier KYC »**. Le statut passe à `SOUMIS`.

Les documents d'identité et selfies sont **chiffrés au repos** dans le stockage (cf. §20).

---

## 7. DASHBOARD CLIENT

### 7.1 En-tête
- `Bonjour, [Prénom]`.
- Badge de statut KYC : `À compléter`, `Soumis`, `En vérification`, `Vérifié`, `Complément demandé`, `Rejeté`.
- Icône de notification (ouvre la liste des notifications in-app).

### 7.2 Carte Portefeuille (formules immuables)
La carte affiche les données suivantes, calculées en temps réel à partir des sous-comptes du portefeuille. **Ces formules sont uniques et s'appliquent partout (affichage, contrôle des retraits, base de données) :**

| Libellé | Définition | Exemple |
| :--- | :--- | :--- |
| **Solde disponible** | `Épargne Libre + Prêt Décaissé Disponible − Montant Réservé` | **95 000 FCFA** |
| *Dont Épargne libre* | Fonds propres (dépôts confirmés + libérations) | 25 000 FCFA |
| *Dont Prêt décaissé disponible* | Part du prêt encore disponible dans le portefeuille | 100 000 FCFA |
| **Montant bloqué** | `Garantie + Épargne obligatoire` | 15 000 FCFA |
| **Montant réservé** | Retraits / virements en attente d'exécution | 30 000 FCFA |
| **Solde total (patrimoine)** | `Épargne Libre + Prêt Décaissé Disponible + Montant Bloqué` | 140 000 FCFA |

**Notes fondamentales :**
- Le **montant réservé** correspond à des retraits/virements demandés et pas encore exécutés. Il est **retenu** sur le solde disponible (le client ne peut pas engager deux fois la même somme) mais reste techniquement présent dans l'épargne libre / le prêt décaissé jusqu'à l'exécution effective. Il n'est donc **jamais ajouté** au patrimoine (il y est déjà compté).
- Le **prêt décaissé disponible** représente la part des fonds prêtés encore présente dans le portefeuille. Elle **diminue au fur et à mesure** que le client retire ou utilise ces fonds (§13). Elle est distincte du capital restant dû du prêt, qui suit la dette dans l'échéancier (§11).

**Boutons sous la carte :** `Retirer` (formulaire de retrait) · `Déposer` (formulaire de dépôt).

### 7.3 Actions rapides (contextuelles)
Deux boutons dynamiques changent selon la situation (§8).

### 7.4 Section « Mes moyens de retrait »
- **Mobile Money** (traitement manuel, dans la plage horaire §13.6) : opérateurs supportés.
- **Virement bancaire** (délai 24–48 h) : informations nécessaires.

### 7.5 Carte dynamique « Mon prêt »
Carte unique dont le contenu change selon l'état du prêt (§9).

### 7.6 Navigation inférieure (4 onglets)
1. **Accueil** (Dashboard) · 2. **Mes prêts** · 3. **Mes opérations** · 4. **Profil**.

---

## 8. ACTIONS RAPIDES (MATRICE CONTEXTUELLE)

| Situation du client | Action 1 | Action 2 |
| :--- | :--- | :--- |
| Aucun prêt actif | `Demander un prêt` (simulateur) | `Déposer` |
| Demande de prêt en cours | `Voir ma demande` | `Compléter mon dossier` (si complément demandé) |
| Prêt accepté (État 4) | `Constituer la garantie` | `Voir les conditions` |
| Garantie en attente (État 5) | `Déposer` (complément de garantie) | `Voir ma garantie` |
| Garantie constituée (État 6) | `Voir le contrat` | `Suivre le décaissement` |
| Prêt décaissé / remboursement | `Rembourser` | `Voir l'échéancier` |
| Prêt terminé (État 9) | `Voir mon solde` | `Demander un retrait` |

---

## 9. CARTE DYNAMIQUE « MON PRÊT » — LES 10 ÉTATS

Chaque état affiche un contenu et des boutons spécifiques. La correspondance entre les états d'affichage et les statuts métier est définie en §11.3.

### État 1 — Aucun prêt
Titre *Mon prêt* · Message *Vous n'avez aucun prêt en cours.* · Bouton `Demander un prêt`.

### État 2 — Demande envoyée (en cours d'analyse)
Titre *Demande en cours* · Montant demandé · Statut *En cours d'analyse* · Message *Votre dossier est étudié par nos équipes.* · Bouton `Voir le détail`.

### État 3 — Informations complémentaires demandées
Titre *Complément requis* · Message *Des informations supplémentaires sont nécessaires.* · Bouton `Compléter mon dossier`.

### État 4 — Prêt accepté (en attente de garantie)
Titre *Prêt accepté sous condition* · Montant accordé · Garantie requise · Message *Pour recevoir vos fonds, constituez votre dépôt de garantie.* · Boutons `Constituer la garantie` / `Voir les conditions`.

### État 5 — Garantie en attente (blocage partiel)
Titre *Constitution de la garantie* · Garantie requise · Garantie déjà constituée *(issue de l'épargne libre bloquée)* · Complément à déposer · Message *Un complément est nécessaire. Effectuez un dépôt avec le motif « Garantie ».* · Boutons `Déposer le complément` / `Voir l'état de ma garantie`.

### État 6 — Garantie constituée (en attente de décaissement)
Titre *Garantie constituée* · Montant accordé · Garantie totale (vérifiée) · Message *Votre garantie est complète. En attente de décaissement.* · Bouton `Suivre le décaissement`.

### État 7 — Prêt décaissé
Titre *Prêt actif* · Montant emprunté · Capital restant · Prochaine échéance · Barre de progression · Bouton `Voir l'échéancier`.

### État 8 — Prêt en remboursement
Titre *Remboursement en cours* · Capital restant · Progression · Prochaine échéance · Retard éventuel (`⚠️ N jours de retard`) · Boutons `Rembourser maintenant` / `Voir l'historique`.

### État 9 — Prêt terminé (libération automatique)
Titre *✅ Prêt entièrement remboursé* · Montant total remboursé · Dépôt de garantie libéré (+) · Épargne obligatoire libérée (+) · Total ajouté à l'épargne · Message *Félicitations ! Vos fonds bloqués sont désormais disponibles dans votre solde.* · Bouton `Voir mon solde`.

### État 10 — Prêt rejeté
Titre *Demande non acceptée* · Message *Nous ne pouvons pas donner suite à votre demande pour le moment.* · Bouton `Faire une nouvelle demande`.

---

## 10. COMPTE ÉPARGNE (SOUS-COMPTES)

L'onglet Épargne affiche une répartition claire :
1. **Épargne libre** : montant disponible, retirable à tout moment (sous réserve du montant réservé).
2. **Dépôt de garantie bloqué** : montant nanti pour le prêt actif.
3. **Épargne obligatoire liée au crédit** : montant cumulé, bloqué, attaché au prêt.
4. **Historique des mouvements** : crédits / débits datés.

---

## 11. DEMANDE DE PRÊT

### 11.1 Formulaire de demande
Le client renseigne : produit de prêt (liste dynamique), montant demandé (contraintes min/max du produit), durée souhaitée (contraintes min/max), objet du prêt, activité concernée, revenu estimé, garantie éventuelle, documents justificatifs (upload multiple), mode de réception des fonds (solde interne / Mobile Money / virement).

**Contrainte structurante :** un client ne peut avoir **qu'un seul prêt actif à la fois**. Toute nouvelle demande est refusée tant qu'un prêt est en cours (de la demande soumise jusqu'à la clôture) et cette règle est garantie côté base de données.

### 11.2 Simulation obligatoire (récapitulatif pré-soumission)
Avant validation, le système calcule et affiche : montant demandé ; taux d'intérêt appliqué ; frais de dossier (fixe ou %) ; frais de gestion ; assurance (si applicable) ; pénalité de retard (en %) ; dépôt de garantie requis (en % du montant) ; épargne obligatoire (en % de l'échéance) ; montant de chaque échéance (capital + intérêts + frais + épargne obligatoire) ; coût total du crédit ; total à rembourser ; montant total récupérable (garantie + épargne obligatoire) ; calendrier prévisionnel des échéances.

**Validation finale :** case *« J'ai pris connaissance et j'accepte les conditions générales »* + saisie du **Code PIN**.

### 11.3 Méthode de calcul du crédit (règle métier centrale)
Les intérêts sont calculés **sur le capital restant dû** (méthode dégressive du capital). Chaque produit (§16.7) porte une **méthode d'intérêt** paramétrable :

- **Mensualités constantes (annuités)** — *méthode par défaut.* Le montant total remboursé chaque période est constant. Pour un capital `P`, un taux périodique `r` et `n` échéances :
  `Échéance = P × r / (1 − (1 + r)^(−n))`
  La part d'intérêts de chaque période est `capital_restant_dû × r`, la part de capital est `Échéance − intérêts`. La dernière échéance est ajustée pour solder exactement le capital restant.

- **Capital constant (dégressif)** — *variante activable par produit.* La part de capital est fixe (`P / n`) ; les intérêts, calculés sur le capital restant dû, décroissent ; le montant total de l'échéance décroît donc dans le temps.

Dans les deux cas, les frais et l'épargne obligatoire s'ajoutent à l'échéance selon les paramètres du produit. L'échéancier complet (`amortization_schedules`) est **généré au décaissement** à partir de ces règles.

### 11.4 Règles d'arrondi (immuables)
- Toutes les valeurs monétaires sont exprimées en FCFA **entiers**.
- Les intérêts et frais de chaque échéance sont calculés puis **arrondis à l'unité FCFA** (arrondi arithmétique standard).
- La **dernière échéance** absorbe l'écart d'arrondi cumulé, de sorte que la somme des capitaux remboursés égale exactement le capital emprunté et que la somme des échéances égale exactement le total à rembourser affiché en simulation.

### 11.5 Statuts de la demande de prêt (workflow) et correspondance avec les 10 états

Le workflow de la demande utilise un ensemble unique et normalisé de statuts. La table `loans` prend le relais au décaissement avec ses propres statuts (`ACTIVE`, `CLOSED`, `DEFAULTED`).

| # | Statut `loan_requests` | État d'affichage (§9) |
| :--- | :--- | :--- |
| 1 | `DRAFT` | — (non soumis) |
| 2 | `SUBMITTED` | État 2 |
| 3 | `IN_ANALYSIS` | État 2 |
| 4 | `INFO_REQUESTED` | État 3 |
| 5 | `PRE_APPROVED` | État 2 |
| 6 | `ACCEPTED` (garantie requise) | État 4 |
| 7 | `GUARANTEE_PENDING` | État 5 |
| 8 | `GUARANTEE_COMPLETE` | État 6 |
| 9 | `AWAITING_DISBURSEMENT` | État 6 |
| 10 | `DISBURSED` → crée un `loan` | État 7 / 8 |
| 11 | `REJECTED` | État 10 |
| 12 | `CANCELLED` | État 1 |

| Statut `loans` | État d'affichage (§9) |
| :--- | :--- |
| `ACTIVE`, aucun remboursement enregistré | État 7 |
| `ACTIVE`, au moins un remboursement | État 8 |
| `CLOSED` (fonds bloqués libérés) | État 9 |
| `DEFAULTED` | État 8 (avec alerte de retard) |

L'absence de demande active (ou dernière demande `REJECTED`/`CANCELLED`, ou dernier prêt `CLOSED`) affiche l'**État 1**.

---

## 12. CONSTITUTION DE LA GARANTIE (AVEC PIN)

### 12.1 Scénario A — Épargne libre ≥ garantie requise
1. Le client clique sur `Constituer la garantie`.
2. Le système affiche : *« Votre épargne libre (15 000 FCFA) permet de couvrir la garantie de 10 000 FCFA. »*
3. Récapitulatif : montant à bloquer = 10 000 FCFA ; nouveau solde disponible = ancien − 10 000.
4. **Saisie du Code PIN** obligatoire.
5. PIN validé → le système transfère 10 000 FCFA de l'épargne libre vers la garantie bloquée.
6. Passage automatique à l'**État 6**.

### 12.2 Scénario B — Épargne libre < garantie requise
1. Le client clique sur `Constituer la garantie`.
2. Le système affiche : *« Votre épargne libre est de 4 000 FCFA. La garantie requise est de 10 000 FCFA. Nous allons bloquer les 4 000 FCFA disponibles. Il vous reste 6 000 FCFA à déposer. »*
3. Récapitulatif : blocage immédiat = 4 000 FCFA.
4. **Saisie du Code PIN** obligatoire.
5. PIN validé → blocage des 4 000 FCFA ; passage à l'**État 5**.
6. Le client dépose les 6 000 FCFA restants via le formulaire de **dépôt** avec le motif `Dépôt de garantie`.
7. L'agent confirme le dépôt → le système détecte que le total bloqué (4 000 + 6 000 = 10 000) atteint le requis et passe à l'**État 6**.

---

## 13. OPÉRATIONS FINANCIÈRES — CIRCUIT COMPLET (INITIATION + CONFIRMATION)

**Principe transversal d'intégrité :** toute écriture comptable (crédit d'un dépôt, exécution d'un retrait, application d'un remboursement) est réalisée par une **fonction serveur unique et atomique**. Le changement de statut d'une demande et le mouvement de portefeuille correspondant se produisent dans la **même transaction**, de façon **idempotente** : une demande déjà traitée ne peut jamais être traitée une seconde fois (protection contre le double-crédit).

### 13.1 Demande de dépôt
**Côté client (formulaire) :**
- Montant (numérique).
- Motif : `Épargne libre` / `Dépôt de garantie` / `Remboursement anticipé`.
- Mode de paiement : `Espèce (agence)` / `Mobile Money` / `Virement bancaire`.
- Référence de l'opération : numéro de transaction MM ou de reçu.
- Preuve de paiement : upload (JPG, PNG, PDF – max 10 Mo).
- Validation : case *« Je certifie l'exactitude des informations »* + **Code PIN**.

**Système (post-soumission) :** création d'une demande `PENDING` ; notification à l'agent de caisse ; affichage côté client avec le statut `En attente de confirmation`. **Aucun mouvement comptable à ce stade.**

**Côté agent de caisse :** file d'attente dédiée ; visualisation de la preuve.
- **Confirmer** → le système crédite le compte client selon le motif, atomiquement :
  - `Épargne libre` → ajout à l'épargne libre (donc au solde disponible) ;
  - `Dépôt de garantie` → ajout à la garantie bloquée (déclenche la vérification de complétude de la garantie) ;
  - `Remboursement anticipé` → application selon §13.4.
- **Rejeter** → motif obligatoire ; notification au client ; aucun mouvement comptable.

### 13.2 Demande de retrait Mobile Money
**Côté client :** opérateur, numéro, titulaire, montant. Validation par **Code PIN**.
- À la soumission, le système **réserve** le montant : il l'ajoute au montant réservé **si et seulement si** le solde disponible (`épargne libre + prêt décaissé disponible − montant réservé`) est suffisant. La réservation et la création de la demande sont atomiques.
- Statut : `Demande envoyée`.

**Côté agent :** vérification du solde et du numéro.
- **Exécuter** (saisie de la référence MM) → le système débite réellement le portefeuille (§13.5) et lève la réservation, dans la **plage horaire autorisée** (§13.6).
- **Rejeter** (motif) → le montant réservé est réintégré (la réservation est levée sans débit).

### 13.3 Demande de virement bancaire
Champs : banque, pays, titulaire, numéro de compte, code banque (si nécessaire), IBAN, montant, motif. Même mécanique de réservation, d'exécution et de rejet que le retrait (délai 24–48 h).

### 13.4 Demande de remboursement
**Côté client :** remboursement de tout ou partie du prêt. Formulaire : montant, mode de paiement, référence, preuve. Validation par **Code PIN**. Statut : `En attente de vérification`.

**Côté agent :** file d'attente dédiée ; vérification de la preuve.
- **Confirmer** → le système applique le paiement de façon atomique, dans l'ordre de priorité :
  1. pénalités de retard ;
  2. intérêts échus ;
  3. capital restant dû ;
  4. épargne obligatoire (vers le sous-compte bloqué).
- Si, après application, le **capital restant dû = 0**, la **libération automatique** (§14) est déclenchée dans la même opération.

### 13.5 Débit à l'exécution d'un retrait / virement (règle de portefeuille)
À l'exécution effective d'un retrait ou virement, le système débite le portefeuille dans l'ordre suivant : d'abord le **prêt décaissé disponible** (jusqu'à épuisement), puis l'**épargne libre**. Le **montant réservé** est diminué du même montant. Ainsi, le solde disponible reflète toujours exactement ce que le client peut engager.

### 13.6 Plage horaire de traitement des retraits
Le traitement (exécution) des retraits et virements par les agents n'est possible qu'entre **8h00 et 19h00** (heure locale de la microfinance). Toute tentative d'exécution hors de ce créneau est refusée par le système. Le client peut soumettre une demande à tout moment ; le formulaire l'informe explicitement : *« Votre retrait sera traité entre 8h et 19h. »* La plage horaire est **paramétrable** par l'administrateur (§16.7).

### 13.7 Annulation d'une demande par le client
**Conditions :** la demande (dépôt, retrait, virement, remboursement) doit être au statut `PENDING` / `ENVOYÉE`.
- Un bouton `Annuler ma demande` apparaît dans le détail de la transaction.
- Popup de confirmation + saisie du **Code PIN**.
- **Effets :** la demande passe à `ANNULÉE_PAR_CLIENT` ; s'il s'agit d'un retrait/virement, le montant réservé est réintégré (réservation levée) ; s'il s'agit d'un dépôt/remboursement, la demande est retirée de la file d'attente agent. Aucun mouvement comptable dans tous les cas.

---

## 14. FIN DE PRÊT & LIBÉRATION AUTOMATIQUE DES FONDS

Lorsque le **dernier remboursement** est confirmé et que le **capital restant dû atteint 0**, le prêt est clôturé et le système exécute **automatiquement**, dans une **opération unique** (un seul mécanisme, déclenché par la clôture du prêt), les transferts suivants vers l'épargne libre :

1. la **garantie bloquée** → épargne libre ;
2. l'**épargne obligatoire cumulée** → épargne libre ;
3. tout **reliquat de prêt décaissé disponible** encore présent dans le portefeuille → épargne libre.

Les sous-comptes garantie, épargne obligatoire et prêt décaissé disponible sont alors remis à 0 (le prêt est clos).

**Comportement du solde disponible.** Comme le prêt décaissé a déjà été débité au fur et à mesure de son utilisation par le client (§13.5), la clôture **n'entraîne aucune chute brutale** du solde disponible : elle ne fait qu'**ajouter** les fonds débloqués (et un éventuel reliquat) à l'épargne libre. Le solde disponible reste stable ou augmente.

*Illustration.* Un client dispose de 25 000 FCFA d'épargne libre au moment de la clôture, avec 10 000 FCFA de garantie et 3 000 FCFA d'épargne obligatoire bloqués, et plus aucun reliquat de prêt (déjà retiré et remboursé). Après clôture : épargne libre = 25 000 + 10 000 + 3 000 = 38 000 FCFA ; garantie et épargne obligatoire = 0. Le solde disponible passe de 25 000 à 38 000 FCFA.

**Notifications :** email + in-app — *« Félicitations ! Votre prêt X est terminé. Vos fonds bloqués (Y FCFA) sont désormais disponibles dans votre solde. »*

---

## 15. NOTIFICATIONS & TEMPLATES EMAIL

### 15.1 Notifications in-app
Tous les événements métier génèrent une notification stockée en base et affichée dans la cloche, avec état lu/non-lu et horodatage.

*Événements couverts (liste exhaustive) :* inscription ; vérification email ; KYC à compléter ; KYC soumis ; KYC validé / rejeté / complément demandé ; demande de prêt soumise / acceptée / rejetée ; garantie requise ; garantie constituée ; décaissement ; échéance proche ; échéance en retard ; remboursement reçu ; dépôt en attente / confirmé / rejeté ; retrait exécuté / rejeté ; virement exécuté / rejeté ; libération de fonds.

### 15.2 Emails transactionnels dynamiques (configurables par l'admin)
- Les emails sont gérés par des **templates stockés en base** (non codés en dur), identifiés par un couple **(slug, langue)** unique. Un même événement (ex. `loan_disbursed`) possède donc une version par langue exposée au client.
- **Dashboard admin :** liste des templates avec aperçu ; édition du **sujet** et du **corps** (éditeur HTML / Markdown) ; insertion de **variables dynamiques** balisées ; **aperçu en direct** (données fictives) ; **historique des modifications** (qui, quoi, quand).
- **Variables disponibles :** `{{client_firstname}}`, `{{client_lastname}}`, `{{amount}}`, `{{currency}}`, `{{loan_id}}`, `{{due_date}}`, `{{remaining_balance}}`, `{{guarantee_amount}}`, `{{status}}`, `{{dashboard_link}}`, `{{reference}}`, `{{operator}}`, `{{bank_name}}`.
- **Repli linguistique :** si le template n'existe pas dans la langue du client, la version `fr` (langue par défaut) est utilisée automatiquement.

**Exemple — « Garantie requise » (fr) :**
> *Objet : [Microfinance] – Constitution de votre garantie*
> *Bonjour {{client_firstname}},*
> *Votre prêt de {{amount}} FCFA a été accepté sous condition.*
> *Pour débloquer les fonds, vous devez constituer un dépôt de garantie de {{guarantee_amount}} FCFA.*
> *Connectez-vous à votre espace client : {{dashboard_link}}*

---

## 16. DASHBOARD ADMIN (BACK-OFFICE)

### 16.1 Tableau de bord (indicateurs)
En temps réel : total clients / KYC validés / en attente ; demandes de prêt en attente d'analyse / approuvées / rejetées ; prêts actifs / en retard / montant total décaissé / remboursé ; files d'attente (dépôts, remboursements, retraits, virements) avec compteurs ; revenus (intérêts + frais).

### 16.2 Module KYC
Liste des KYC soumis ; ouverture du dossier (champs, photos, selfie) ; actions `Valider` / `Rejeter` / `Demander un complément` (champ texte).

### 16.3 Module Demandes de prêt
Liste par statut ; fiche avec profil client, historique, épargne disponible ; actions `Analyser`, `Accepter`, `Rejeter`, `Envoyer au validateur`.

### 16.4 Module Dépôts (file d'attente)
Liste des dépôts `PENDING` ; colonnes Client, Montant, Motif, Preuve ; actions `Confirmer` / `Rejeter` (motif obligatoire).

### 16.5 Module Remboursements (file d'attente)
Liste des paiements déclarés ; à la confirmation, le système applique le paiement à l'échéancier selon §13.4.

### 16.6 Module Retraits & Virements
Liste par statut ; actions `Exécuter` (saisie réf, dans la plage horaire §13.6) / `Rejeter`.

### 16.7 Configuration (Admin)
- **Produits de prêt** : nom, montants min/max, durées, taux, méthode d'intérêt, frais (dossier, gestion, assurance), garantie, épargne obligatoire, pénalité de retard.
- **Frais généraux** : frais de retrait MM, frais de virement, pénalités.
- **Plage horaire de traitement des retraits** (§13.6).
- **Templates d'emails** : contenus et variables.
- **Traductions** : surcharge des chaînes pour chaque langue exposée au client.

---

## 17. JOURNAL D'AUDIT

Chaque action sensible génère une ligne d'audit comprenant : l'utilisateur (agent) ayant agi ; son rôle ; le type d'action (ex. `DEPOSIT_CONFIRMED`, `LOAN_APPROVED`, `WITHDRAWAL_EXECUTED`, `RATE_CHANGED`, `AUTO_RELEASE`) ; l'identifiant de l'objet concerné ; l'état avant (JSON) ; l'état après (JSON) ; l'adresse IP ; le motif éventuel (rejet) ; l'horodatage. Le journal est **append-only** : aucune modification ni suppression n'est possible.

---

## 18. RAPPORTS ADMIN

Export en CSV / PDF de : liste des clients ; suivi KYC ; demandes de prêt par produit ; prêts actifs et en retard ; remboursements par agent ; revenus (intérêts, frais) ; activité par période (jour / semaine / mois) ; garanties et épargnes bloquées.

---

## 19. INTERNATIONALISATION (i18n)

### 19.1 Périmètre linguistique
- Les **interfaces client** sont **multilingues dès le lancement** : `fr` (langue par défaut) et `en` au minimum, la structure permettant d'ajouter d'autres langues (ex. `es`) sans redéploiement.
- Le **back-office administrateur** (KYC, prêts, files d'attente, configuration) est en **français uniquement**.

### 19.2 Architecture
- Fichiers `locales/{lang}/common.json`, `auth.json`, `dashboard.json` pour le socle.
- Détection via l'en-tête `Accept-Language` du navigateur ; valeur par défaut `fr`. L'utilisateur peut changer sa langue dans son profil (sauvegardée en base).
- Un écran d'administration permet de surcharger n'importe quelle clé de traduction exposée au client, et d'ajouter une nouvelle langue. Les fichiers JSON statiques servent de repli.

---

## 20. PROTECTION DES DONNÉES & CONSERVATION (OBLIGATOIRE)

La protection des données personnelles est une exigence du projet, intégrée dès le lancement :

1. **Durées de conservation** définies par type de donnée : données KYC et pièces justificatives conservées le temps requis par la relation puis purgées ; journaux d'audit conservés selon l'obligation légale de conservation (durée généralement plus longue), conciliée avec le droit à l'effacement.
2. **Suppression / anonymisation** des données personnelles à la demande du client, hors données soumises à une obligation légale de conservation.
3. **Consentement explicite** recueilli à l'inscription, avec une politique de confidentialité accessible.
4. **Chiffrement au repos** des documents sensibles (pièces d'identité, selfies) dans le stockage.

---

## 21. PÉRIMÈTRE FONCTIONNEL

### 21.1 Inclus dans le lancement
- Tous les parcours client (inscription, KYC, dashboard, prêt, dépôt, retrait, remboursement) avec le workflow **Initiation + Confirmation agent**.
- Dashboard admin complet (clients, KYC, prêts, files d'attente, configuration).
- Notifications in-app et emails (templates dynamiques multilingues).
- Journal d'audit complet.
- Interfaces client multilingues (fr, en) ; back-office FR.
- Protection des données et politique de conservation (§20).
- Contrainte d'un seul prêt actif par client.
- Plage horaire de traitement des retraits (8h–19h).

### 21.2 Hors périmètre applicatif (processus internes de la microfinance)
Les contrôles suivants relèvent du fonctionnement interne de l'institution et **ne sont pas modélisés dans l'application** :
- **Classification des créances en souffrance et provisionnement** : suivi prudentiel géré en interne.
- **Contrôle de double validation des décaissements de montant élevé** : validation organisationnelle réalisée en interne avant décaissement.

### 21.3 Évolutions ultérieures
- Application native iOS / Android (au-delà de la PWA).
- Intégration automatique avec les API Mobile Money pour l'exécution en temps réel.
- Scoring automatique du crédit.
- Signature électronique avancée.
- Rééchelonnement / restructuration de prêt.
- Gestion multi-agences (dimension agence, réconciliation de caisse par agent) : l'architecture cible un déploiement mono-agence ; l'ajout de la dimension agence sera traité avant tout passage multi-agences.
- OTP par SMS ; connexion biométrique.
- Relevé de compte client téléchargeable.
- Chatbot de support.

---

## 22. LISTE DE CONTRÔLE PRÉ-MISE EN PRODUCTION

Avant le lancement, la microfinance valide avec le chef de projet :
- les taux d'intérêt, la méthode d'intérêt et les frais de chaque produit ;
- les textes des templates d'emails (langage juridique) dans les langues exposées ;
- les règles de validation des pièces justificatives KYC ;
- les durées de conservation des données par type et la procédure d'effacement (§20) ;
- la plage horaire de traitement des retraits ;
- les scénarios de test de bout en bout, y compris un exemple chiffré complet d'échéancier servant de référence de non-régression.

---

**Fin du PRD — Version 2.1**
