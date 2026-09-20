# Architecture Système — Microfinance v2.1

Ce document décrit l'architecture globale, le modèle de sécurité, le fonctionnement de la comptabilité à double entrée et le cycle de vie des opérations financières de l'application web mobile-first (PWA) de microfinance.

---

## 1. Vue d'ensemble du système

L'application est un **portail de requêtes** et un **outil de suivi** digitalisant les flux financiers de microfinance (dépôts, retraits, prêts) sans manipulation d'argent physique.

```mermaid
flowchart TD
    subgraph ClientLayer["Couche Client (Navigateur / PWA)"]
        ClientApp["Espace Client (/client)\nClient PWA & Web"]
        AdminApp["Espace Admin (/admin)\nBack-office Chef d'Agence"]
    end

    subgraph MiddlewareLayer["Couche Middleware & Sécurité"]
        Proxy["Next.js Middleware (proxy.ts)\nContrôle du JWT app_metadata.user_role"]
    end

    subgraph BackendLayer["BaaS Supabase Cloud (eu-west-3 Paris)"]
        Auth["Supabase Auth\n(Gestion identités & Custom Claims Hook)"]
        Postgres[(PostgreSQL 15+)]
        Storage["Supabase Storage\n(Buckets Privés KYC, Dépôts, Prêts)"]
        EdgeFunctions["Edge Functions Deno\n(set-pin, verify-pin, recover-pin, send-email)"]
    end

    subgraph ExternalLayer["Services Tiers"]
        Resend["Service Email Resend\n(SPF / DKIM / DMARC)"]
    end

    ClientApp --> Proxy
    AdminApp --> Proxy
    Proxy --> Auth
    ClientApp --> EdgeFunctions
    ClientApp --> Storage
    ClientApp --> Postgres
    AdminApp --> Postgres
    EdgeFunctions --> Postgres
    EdgeFunctions --> Resend

    subgraph PostgresDetails["Architecture PostgreSQL"]
        SchemaPublic["Schéma public\n(Tables exposées par Data API via RLS)"]
        SchemaPrivate["Schéma app_private\n(Hashes bcrypt PIN, Secrets HMAC, Clés)"]
        RPCs["RPC SECURITY DEFINER\n(Mouvements comptables & Invariants)"]
    end

    Postgres --- PostgresDetails
```

---

## 2. Modèle de Sécurité et d'Accès

### 2.1 Modèle à deux rôles isolés (ADR 0001)

L'application applique un modèle strict d'accès à **deux rôles uniques** :

1. **`client`** : Accès réservé aux routes `/client/*` et aux opérations sur son propre compte.
2. **`admin`** : Réservé au Chef d'Agence (administrateur unique), donnant accès au back-office `/admin/*`.

L'autorisation repose sur la vérification du claim JWT `app_metadata.user_role` dans `proxy.ts` et dans la fonction SQL `auth_role()` :

```sql
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'user_role', 'client');
$$;
```

### 2.2 Sécurité du Code PIN et Récupération OTP (Isolation `app_private`)

Les données hautement sensibles du Code PIN (hashes BCrypt, compteurs de tentatives, OTP) sont **isolées** hors du schéma `public` dans le schéma `app_private` (inaccessible directement via la Data API Supabase).

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client Browser
    participant EF as Edge Function (verify-pin)
    participant Priv as app_private.user_pin_security
    participant RPC as RPC SECURITY DEFINER

    Client->>EF: POST /functions/v1/verify-pin { pin: "****" } (via HTTPS)
    Note over EF: Vérifie les limites de rate-limiting
    EF->>Priv: Extrait pin_hash & fail_count pour user_id
    Note over EF: Calcule bcrypt.compare(pin, pin_hash)
    alt PIN Valide
        EF->>Priv: Réinitialise fail_count = 0
        EF-->>Client: 200 OK { success: true }
    else PIN Invalide
        EF->>Priv: Incrémente fail_count (+ calcul lockout progressif)
        EF-->>Client: 401 Unauthorized { remaining_attempts }
    end
```

---

## 3. Vérité Comptable et Portefeuille

### 3.1 Formule Unique du Solde (Invariant N°1)

Aucun solde n'est recalculé côté client. Le solde du portefeuille est calculé par la RPC `get_wallet_summary()` selon 5 composantes financières :

$$\text{Solde Disponible} = \text{free\_savings} + \text{disbursed\_loan} - \text{reserved\_amount}$$

$$\text{Montant Bloqué} = \text{blocked\_guarantee} + \text{mandatory\_savings}$$

$$\text{Patrimoine Total} = \text{free\_savings} + \text{disbursed\_loan} + \text{blocked\_guarantee} + \text{mandatory\_savings}$$

```mermaid
graph LR
    subgraph SoldeDisponible["Solde Disponible (Retirable / Utilisable)"]
        FS["free_savings\n(Épargne libre)"]
        DL["disbursed_loan\n(Prêt déboursé)"]
        RA["- reserved_amount\n(Réservé en retrait PENDING)"]
    end

    subgraph SoldeBloque["Montant Bloqué"]
        BG["blocked_guarantee\n(Garantie bloquée)"]
        MS["mandatory_savings\n(Épargne obligatoire)"]
    end

    FS --> SoldeDisponible
    DL --> SoldeDisponible
    RA --> SoldeDisponible
    BG --> SoldeBloque
    MS --> SoldeBloque
```

### 3.2 Immutabilité & Écritures Serveur Uniquement

- **RLS Strict** : Les requêtes d'écriture directe (`INSERT`/`UPDATE`/`DELETE`) sur les portefeuilles sont totalement révoquées pour `anon` et `authenticated`.
- **Atomicité Transactionnelle** : Chaque mouvement comptable (crédit, débit, réservation) transite par une fonction `SECURITY DEFINER` s'exécutant dans une transaction SQL atomique (changement de statut + mouvement au sein du même bloc `BEGIN...COMMIT`).

---

## 4. Cycle de Vie du Prêt & Contrat Dynamique

Le processus de demande de crédit respecte un cycle de validation en **10 états stricts** et applique le plafonnement réglementaire du Coût Effectif (TEG < 20% UMOA).

```mermaid
stateDiagram-v2
    [*] --> 1_DEMANDE_INITIALE : Soumission client (Zod + PIN)
    1_DEMANDE_INITIALE --> 10_REJETEE : Rejet par l'Agent
    1_DEMANDE_INITIALE --> 2_ACCEPTEE : Validation conditions Crédit

    2_ACCEPTEE --> 3_GARANTIE_EN_COURS : Début blocage garantie
    3_GARANTIE_EN_COURS --> 4_SIGNATURE_CONTRAT_ATTENTE : Garantie 100% constituée (RPC)

    4_SIGNATURE_CONTRAT_ATTENTE --> 5_CONTRAT_SIGNE : Signature par PIN / OTP (Snapshot immuable)
    5_CONTRAT_SIGNE --> 6_PRETS_DEBOURSE : Déboursement portefeuille par l'Admin

    6_PRETS_DEBOURSE --> 7_REMBOURSEMENT_EN_COURS : Échéances générées

    7_REMBOURSEMENT_EN_COURS --> 8_SOLDE_TOTALEMENT : Remboursement intégral (Clôture)
    7_REMBOURSEMENT_EN_COURS --> 9_CONTENTIEUX_RETARD : Défaut (J+30 / J+45 / J+90)

    8_SOLDE_TOTALEMENT --> [*]
    10_REJETEE --> [*]
```

### Invariants du Contrat Dynamique

1. **Snapshot au moment de la signature** : Les clauses, l'échéancier, le taux effectif annualisé et les informations de l'emprunteur sont figés sous forme d'un document JSON/PDF immuable.
2. **Plafond de coût effectif** : Tout produit ou demande dont le taux effectif global (TEG) dépasse 20 % annualisé est bloqué par la fonction PostgreSQL `enforce_effective_cost_cap()`.
3. **Prêt vivant unique** : Un emprunteur ne peut pas soumettre de nouvelle demande s'il possède déjà un prêt actif non clôturé.
