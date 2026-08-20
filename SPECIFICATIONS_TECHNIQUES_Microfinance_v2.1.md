# SPÉCIFICATIONS TECHNIQUES — APPLICATION MICROFINANCE
**Version 2.1 — Aligné sur le PRD, prêt pour le développement**

---

> **Décision technique V1 du 2026-08-13 — prioritaire :** seuls les rôles `client` et
> `admin` sont actifs. `admin` représente le chef d’agence et autorise toutes les RPC et
> routes internes. Toute ancienne valeur de rôle est refusée comme rôle privilégié. Voir
> `docs/adr/0001-modele-acces-deux-roles.md` et la migration
> `20260813090000_two_role_access_model.sql`.

> **Cadre métier V1 du 2026-08-20 — prioritaire sur les anciens exemples :** les
> invariants de tarification, échéancier, garantie, retard, remboursement anticipé et
> contrat sont définis dans `docs/business-rules-v1.md` et
> `docs/contracts/dynamic-loan-contract-v1.md`. Toute implémentation incompatible est un
> écart à corriger, pas une variante autorisée.

## PRINCIPES D'ARCHITECTURE DIRECTEURS

1. **Une seule vérité comptable.** Le solde disponible est défini par une formule unique (§F) appliquée de façon identique à l'affichage, au contrôle des retraits et à la base de données.
2. **Écritures comptables serveur uniquement.** Aucune table de portefeuille n'est modifiable par écriture directe depuis le client. Tout mouvement transite par une fonction `SECURITY DEFINER` contrôlée.
3. **Atomicité et idempotence.** Le changement de statut d'une demande et le mouvement de portefeuille associé se font dans la même transaction. Une demande déjà traitée ne peut pas l'être une seconde fois.
4. **Le rôle fait autorité via le jeton.** L'autorisation lit le rôle dans un claim du JWT, jamais dans une valeur modifiable par l'utilisateur.

---

## PARTIE A : SPÉCIFICATIONS ÉCRAN PAR ÉCRAN (FRONTEND NEXT.JS)

### Architecture des routes
- **Espace Client** : `/client/*` (layout protégé par `proxy.ts`).
- **Espace Admin** : `/admin/*` (layout protégé, contrôle du rôle via le claim JWT).
- **Auth** : `/auth/*` (non protégé).

Le `proxy.ts` lit le rôle depuis le claim du jeton (`app_metadata.user_role`) sans requête base, et redirige selon les règles du §4.2 du PRD.

---

#### Écran 1 — Inscription (`/auth/register`)
| Élément | Spécification |
| :--- | :--- |
| **Composants** | Shadcn `Input`, `Button`, `Form` |
| **Schéma Zod** | `z.object({ firstname: z.string().min(2), lastname: z.string().min(2), email: z.string().email(), password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/), confirm: z.string() }).refine(d => d.password === d.confirm)` |
| **Mutation** | `supabase.auth.signUp()` + insertion `profiles` (`role='client'`, `kyc_status='NONE'`) réalisée par un trigger `on_auth_user_created`. |
| **Post-action** | Redirection `/auth/verify-email`. |

#### Écran 2 — Création du PIN (`/auth/set-pin`)
| Élément | Spécification |
| :--- | :--- |
| **Contraintes** | 4 à 6 chiffres uniquement. |
| **Schéma Zod** | `z.string().regex(/^\d{4,6}$/)` + confirmation identique. |
| **Mutation** | Appel de l'Edge Function `set-pin` (le PIN en clair transite via HTTPS ; l'Edge Function calcule `await bcrypt.hash(pin, 12)` et écrit `pin_hash`). Aucune primitive bcrypt n'est exécutée côté client. |

#### Écran 3 — Dashboard Client (`/client/dashboard`)
| Élément | Spécification |
| :--- | :--- |
| **Données portefeuille** | RPC `get_wallet_summary(user_id)` → `{ free_savings, disbursed_loan, blocked_guarantee, mandatory_savings, reserved_amount }`. |
| **Calcul affiché** | `solde_disponible = free_savings + disbursed_loan − reserved_amount` ; `montant_bloque = blocked_guarantee + mandatory_savings` ; `patrimoine = free_savings + disbursed_loan + blocked_guarantee + mandatory_savings`. |
| **Query Key** | `useQuery(['wallet', userId], fetchWallet)`. |
| **Revalidation** | Toutes les 10 s (mises à jour agent) + invalidation manuelle après mutation. |
| **Carte « Mon prêt »** | RPC `get_active_loan_status(user_id)` → `{ state: 1-10, data: {...} }` (la RPC applique la correspondance statut → état du §11.5 du PRD). |

#### Écran 4 — Demande de dépôt (`/client/deposit/request`)
| Élément | Spécification |
| :--- | :--- |
| **Schéma Zod** | `{ amount: z.number().int().positive(), motif: z.enum(['FREE_SAVINGS','GUARANTEE','REPAYMENT']), payment_method: z.enum(['CASH','MOBILE_MONEY','BANK_TRANSFER']), reference: z.string().optional(), proof_url: z.string().url() }` |
| **Upload** | `supabase.storage.from('deposit_proofs').upload(file)`. |
| **Validation** | Case de certification + **PIN** (vérifié par `verify-pin` avant l'insertion). |
| **Mutation** | Insertion `deposit_requests` (`status='PENDING'`). **Aucun mouvement comptable.** |
| **Notification** | Notification in-app à l'agent de caisse. |

#### Écran 5 — Demande de retrait Mobile Money (`/client/withdraw/momo`)
| Élément | Spécification |
| :--- | :--- |
| **Schéma Zod** | `{ operator: z.string(), phone: z.string().regex(/^\+?[0-9]{8,15}$/), holder: z.string().min(2), amount: z.number().int().positive() }` |
| **Validation** | **PIN** vérifié par `verify-pin`. |
| **Création + réservation** | Appel unique et atomique de la RPC `create_withdrawal(...)` : elle réserve le montant **si** `free_savings + disbursed_loan − reserved_amount ≥ amount`, puis insère la demande (`status='PENDING'`). Sinon elle échoue (solde disponible insuffisant). |
| **Info client** | Le formulaire affiche : *« Votre retrait sera traité entre 8h et 19h. »* |

#### Écran 6 — Demande de remboursement (`/client/repay/request`)
| Élément | Spécification |
| :--- | :--- |
| **Préchargement** | `loan_id` actif + échéances dues + pénalités courantes. |
| **Schéma Zod** | `{ amount: z.number().int().positive(), payment_method: z.enum([...]), reference: z.string().optional(), proof_url: z.string().url() }` (borne max = total dû + pénalités). |
| **Validation** | **PIN** vérifié par `verify-pin`. |
| **Mutation** | Insertion `repayment_requests` (`status='PENDING'`). |

#### Écran 7 — Constitution de la garantie
| Élément | Spécification |
| :--- | :--- |
| **Logique** | **PIN** vérifié, puis RPC `process_guarantee_blocking(user_id)` : lit le `loan_request` en état `ACCEPTED` ; calcule `required = approved_amount × guarantee_rate` ; si `free_savings ≥ required`, bloque le requis et passe le prêt en `GUARANTEE_COMPLETE` ; sinon bloque tout le `free_savings`, met à jour `guarantee_blocked_partial` et passe en `GUARANTEE_PENDING`. |

#### Écran 8 — File d'attente des dépôts (`/admin/cashier/deposits`)
| Élément | Spécification |
| :--- | :--- |
| **Requête** | `deposit_requests` `status='PENDING'` jointe à `profiles(firstname,lastname)`. |
| **Confirmer** | RPC `confirm_deposit(request_id, agent_id)` — atomique et idempotente : crédite le portefeuille selon le motif, passe la demande à `CONFIRMED`, vérifie la complétude de la garantie si motif `GUARANTEE`. |
| **Rejeter** | RPC `reject_deposit(request_id, agent_id, reason)` — passe à `REJECTED`, journalise, aucun mouvement comptable. |

---

## PARTIE B : SCHÉMA POSTGRESQL

### Fonction utilitaire — rôle depuis le jeton
```sql
-- Le rôle est injecté dans le JWT (app_metadata.user_role) par un
-- Custom Access Token Hook qui recopie profiles.role à l'émission du jeton.
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'user_role', 'client');
$$;
```

### 1. `profiles`
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  profession TEXT,
  birth_date DATE,
  monthly_income_estimate BIGINT,
  id_type TEXT,
  id_number TEXT,
  id_expiry DATE,
  kyc_status TEXT DEFAULT 'NONE'
    CHECK (kyc_status IN ('NONE','PENDING','IN_REVIEW','COMPLETED','REJECTED','INFO_REQUESTED')),
  pin_hash TEXT,                       -- haché par l'Edge Function (bcrypt)
  pin_attempts INT DEFAULT 0,          -- tentatives PIN échouées consécutives
  pin_locked_until TIMESTAMPTZ,        -- verrouillage temporaire de la saisie PIN
  preferred_language TEXT DEFAULT 'fr',
  role TEXT DEFAULT 'client'
    CHECK (role IN ('client','agent_credit','agent_caisse','validator','admin','super_admin','auditor')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. `kyc_documents`
```sql
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  doc_type TEXT CHECK (doc_type IN ('ID_FRONT','ID_BACK','SELFIE')) NOT NULL,
  url TEXT NOT NULL,                   -- objet chiffré au repos dans Storage
  verified BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. `kyc_financials`
```sql
CREATE TABLE public.kyc_financials (
  client_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  income_source TEXT,
  monthly_charges BIGINT,
  momo_operator TEXT,
  momo_number TEXT,
  usual_bank TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4. `wallets` (1 ligne par client)
```sql
CREATE TABLE public.wallets (
  client_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  free_savings BIGINT DEFAULT 0 CHECK (free_savings >= 0),        -- épargne libre disponible
  disbursed_loan BIGINT DEFAULT 0 CHECK (disbursed_loan >= 0),    -- part du prêt décaissé encore disponible dans le portefeuille
  blocked_guarantee BIGINT DEFAULT 0 CHECK (blocked_guarantee >= 0),
  mandatory_savings BIGINT DEFAULT 0 CHECK (mandatory_savings >= 0),
  reserved_amount BIGINT DEFAULT 0 CHECK (reserved_amount >= 0),  -- retraits/virements en attente
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- le réservé ne peut jamais dépasser ce qui est réellement mobilisable
  CONSTRAINT reserved_within_available CHECK (reserved_amount <= free_savings + disbursed_loan)
);

-- Solde disponible : formule unique de référence
CREATE OR REPLACE FUNCTION get_available_balance(p_client UUID)
RETURNS BIGINT LANGUAGE sql STABLE AS $$
  SELECT free_savings + disbursed_loan - reserved_amount
  FROM wallets WHERE client_id = p_client;
$$;
```

### 5. `loan_products`
```sql
CREATE TABLE public.loan_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  min_amount BIGINT NOT NULL,
  max_amount BIGINT NOT NULL,
  min_duration_months INT NOT NULL,
  max_duration_months INT NOT NULL,
  interest_rate DECIMAL(6,3) NOT NULL,                 -- taux périodique (mensuel), en %
  interest_method TEXT NOT NULL DEFAULT 'CONSTANT_INSTALLMENT'
    CHECK (interest_method IN ('CONSTANT_INSTALLMENT','DEGRESSIVE')),
  processing_fee_percent DECIMAL(6,3) DEFAULT 0,       -- frais de dossier en %
  processing_fee_flat BIGINT DEFAULT 0,                -- frais de dossier fixe (FCFA)
  management_fee_percent DECIMAL(6,3) DEFAULT 0,       -- frais de gestion en %
  management_fee_flat BIGINT DEFAULT 0,                -- frais de gestion fixe (FCFA)
  insurance_rate DECIMAL(6,3) DEFAULT 0,               -- assurance en %
  guarantee_rate DECIMAL(6,3) DEFAULT 0,               -- garantie en % du montant
  mandatory_savings_rate DECIMAL(6,3) DEFAULT 0,       -- épargne obligatoire en % de l'échéance
  late_penalty_rate DECIMAL(6,3) DEFAULT 0,            -- pénalité en % par jour de retard
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
*Note : les frais fixes sont des montants FCFA (`BIGINT`) distincts des taux (`%`). Un produit peut combiner un pourcentage et un forfait.*

### 6. `loan_requests`
```sql
CREATE TYPE loan_status_enum AS ENUM (
  'DRAFT','SUBMITTED','IN_ANALYSIS','INFO_REQUESTED','PRE_APPROVED',
  'ACCEPTED','GUARANTEE_PENDING','GUARANTEE_COMPLETE','AWAITING_DISBURSEMENT',
  'DISBURSED','REJECTED','CANCELLED'
);

CREATE TABLE public.loan_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) NOT NULL,
  product_id UUID REFERENCES loan_products(id) NOT NULL,
  amount BIGINT NOT NULL,
  duration_months INT NOT NULL,
  purpose TEXT,
  monthly_income_estimate BIGINT,
  requested_disbursement_method TEXT
    CHECK (requested_disbursement_method IN ('INTERNAL','MOBILE_MONEY','BANK_TRANSFER')),
  status loan_status_enum DEFAULT 'DRAFT',
  approved_amount BIGINT,
  guarantee_required BIGINT,
  guarantee_blocked_partial BIGINT DEFAULT 0,
  admin_comment TEXT,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Un seul prêt "en cours" par client : les statuts non terminaux sont uniques par client.
CREATE UNIQUE INDEX one_open_request_per_client
  ON loan_requests (client_id)
  WHERE status NOT IN ('DISBURSED','REJECTED','CANCELLED');
```

### 7. `loans`
```sql
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES loan_requests(id) UNIQUE NOT NULL,
  client_id UUID REFERENCES profiles(id) NOT NULL,
  total_amount BIGINT NOT NULL,          -- capital emprunté
  remaining_principal BIGINT NOT NULL,   -- capital restant dû (la dette)
  interest_rate DECIMAL(6,3) NOT NULL,
  interest_method TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT CHECK (status IN ('ACTIVE','CLOSED','DEFAULTED')) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Un seul prêt ACTIVE par client.
CREATE UNIQUE INDEX one_active_loan_per_client
  ON loans (client_id) WHERE status = 'ACTIVE';
```

### 8. `amortization_schedules`
```sql
CREATE TABLE public.amortization_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  installment_no INT NOT NULL,
  due_date DATE NOT NULL,
  due_principal BIGINT NOT NULL,
  due_interest BIGINT NOT NULL,
  due_fees BIGINT DEFAULT 0,
  due_mandatory_savings BIGINT DEFAULT 0,
  total_due BIGINT GENERATED ALWAYS AS
    (due_principal + due_interest + due_fees + due_mandatory_savings) STORED,
  paid_principal BIGINT DEFAULT 0,
  paid_interest BIGINT DEFAULT 0,
  paid_fees BIGINT DEFAULT 0,
  paid_mandatory_savings BIGINT DEFAULT 0,
  penalty_accrued BIGINT DEFAULT 0,       -- pénalités de retard cumulées sur l'échéance
  status TEXT CHECK (status IN ('PENDING','PARTIAL','PAID','LATE')) DEFAULT 'PENDING',
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 9. `deposit_requests`
```sql
CREATE TABLE public.deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  motif TEXT CHECK (motif IN ('FREE_SAVINGS','GUARANTEE','REPAYMENT')) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('CASH','MOBILE_MONEY','BANK_TRANSFER')) NOT NULL,
  reference TEXT,
  proof_url TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','REJECTED','CANCELLED')),
  confirmed_by UUID REFERENCES profiles(id),
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
```

### 10. `withdrawal_requests`
```sql
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT CHECK (type IN ('MOBILE_MONEY','BANK_TRANSFER')) NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  recipient_operator TEXT,
  recipient_phone TEXT,
  recipient_bank TEXT,
  recipient_account TEXT,
  recipient_name TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PROCESSING','COMPLETED','REJECTED','CANCELLED')),
  processed_by UUID REFERENCES profiles(id),
  external_reference TEXT,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 11. `repayment_requests`
```sql
CREATE TABLE public.repayment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) NOT NULL,
  client_id UUID REFERENCES profiles(id) NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  payment_method TEXT CHECK (payment_method IN ('CASH','MOBILE_MONEY','BANK_TRANSFER')) NOT NULL,
  reference TEXT,
  proof_url TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','REJECTED','CANCELLED')),
  confirmed_by UUID REFERENCES profiles(id),
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
```

### 12. `notifications` (in-app)
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,                    -- ex: LOAN_DISBURSED, DEPOSIT_CONFIRMED
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX notifications_user_unread ON notifications (user_id) WHERE read_at IS NULL;
```

### 13. `notification_templates` (emails)
```sql
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,                    -- ex: loan_disbursed
  language TEXT NOT NULL DEFAULT 'fr',
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (slug, language)               -- une version par langue et par slug
);
```

### 14. `audit_logs` (append-only)
```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  user_role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## PARTIE C : POLITIQUES RLS

`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` sur toutes les tables.

### `profiles` — protection contre l'élévation de privilèges
```sql
-- Le client ne peut modifier QUE des colonnes non sensibles de sa propre ligne.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT  UPDATE (firstname, lastname, phone, city, address, preferred_language)
  ON public.profiles TO authenticated;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_staff_read"
  ON profiles FOR SELECT USING (auth_role() IN ('agent_credit','agent_caisse','validator','admin','super_admin','auditor'));

-- role, is_active et kyc_status ne sont modifiables que par des fonctions
-- SECURITY DEFINER dédiées (attribution de rôle, blocage de compte, validation KYC).
-- Filet de sécurité : rejeter toute modification directe de ces colonnes.
CREATE OR REPLACE FUNCTION guard_privileged_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status)
     AND current_setting('app.privileged', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Modification de colonne privilégiée interdite';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_guard_privileged
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION guard_privileged_columns();
-- Les fonctions autorisées posent `SET LOCAL app.privileged = 'on'` avant l'écriture.
```

### `wallets` — aucune écriture directe
```sql
CREATE POLICY "wallets_select_own"
  ON wallets FOR SELECT USING (auth.uid() = client_id);

-- Agents (dont agent_credit, requis pour l'analyse de prêt) : lecture seule.
CREATE POLICY "wallets_staff_read"
  ON wallets FOR SELECT USING (auth_role() IN ('agent_credit','agent_caisse','validator','admin','super_admin','auditor'));

-- Aucune écriture directe : tout passe par des fonctions SECURITY DEFINER.
CREATE POLICY "wallets_no_direct_write_upd" ON wallets FOR UPDATE USING (false);
CREATE POLICY "wallets_no_direct_write_ins" ON wallets FOR INSERT WITH CHECK (false);
CREATE POLICY "wallets_no_direct_write_del" ON wallets FOR DELETE USING (false);
```

### `loan_requests`
```sql
CREATE POLICY "lr_client_select" ON loan_requests FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "lr_client_insert" ON loan_requests FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "lr_staff_select" ON loan_requests FOR SELECT
  USING (auth_role() IN ('agent_credit','validator','admin','super_admin','auditor'));

-- Les transitions de statut passent par des fonctions dédiées (analyse, validation,
-- décaissement). Les écritures d'agents hors fonction sont bloquées.
CREATE POLICY "lr_no_direct_update" ON loan_requests FOR UPDATE USING (false);
```

### `deposit_requests`
```sql
CREATE POLICY "dep_client_insert" ON deposit_requests FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "dep_client_select" ON deposit_requests FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "dep_cashier_select" ON deposit_requests FOR SELECT
  USING (auth_role() IN ('agent_caisse','admin','super_admin','auditor'));

-- Confirmation/rejet uniquement via RPC SECURITY DEFINER (crédit + statut atomiques).
CREATE POLICY "dep_no_direct_update" ON deposit_requests FOR UPDATE USING (false);
```

### `withdrawal_requests`
```sql
-- Création via RPC create_withdrawal (réservation atomique) ; pas d'INSERT direct client.
CREATE POLICY "wd_client_select" ON withdrawal_requests FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "wd_staff_select" ON withdrawal_requests FOR SELECT
  USING (auth_role() IN ('agent_caisse','admin','super_admin','auditor'));
CREATE POLICY "wd_no_direct_write_ins" ON withdrawal_requests FOR INSERT WITH CHECK (false);
CREATE POLICY "wd_no_direct_write_upd" ON withdrawal_requests FOR UPDATE USING (false);
```

### `repayment_requests` — client : création + lecture uniquement
```sql
CREATE POLICY "rep_client_insert" ON repayment_requests FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "rep_client_select" ON repayment_requests FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "rep_cashier_select" ON repayment_requests FOR SELECT
  USING (auth_role() IN ('agent_caisse','admin','super_admin','auditor'));
-- Ni UPDATE ni DELETE côté client ; confirmation/annulation via fonctions dédiées.
CREATE POLICY "rep_no_direct_update" ON repayment_requests FOR UPDATE USING (false);
```

### `notifications`
```sql
CREATE POLICY "notif_select_own" ON notifications FOR SELECT USING (auth.uid() = user_id);
-- Le client ne peut que marquer ses notifications comme lues.
CREATE POLICY "notif_mark_read" ON notifications FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
```

### `audit_logs`, `notification_templates`, `loan_products`
```sql
CREATE POLICY "audit_staff_read" ON audit_logs FOR SELECT
  USING (auth_role() IN ('admin','super_admin','auditor'));
-- Insertion via trigger SECURITY DEFINER ; aucune modification/suppression (append-only).

CREATE POLICY "tpl_admin_all" ON notification_templates FOR ALL
  USING (auth_role() IN ('admin','super_admin'))
  WITH CHECK (auth_role() IN ('admin','super_admin'));
CREATE POLICY "tpl_service_read" ON notification_templates FOR SELECT USING (true);

CREATE POLICY "prod_read_all" ON loan_products FOR SELECT USING (true);
CREATE POLICY "prod_admin_write" ON loan_products FOR ALL
  USING (auth_role() IN ('admin','super_admin'))
  WITH CHECK (auth_role() IN ('admin','super_admin'));
```

De la même façon, `kyc_documents` et `kyc_financials` : lecture par le client propriétaire et par le personnel habilité ; écriture client limitée à l'insertion de ses propres pièces ; validation via fonctions dédiées.

---

## PARTIE D : FONCTIONS SERVEUR (RPC & EDGE FUNCTIONS)

Toutes les fonctions modifiant le portefeuille sont `SECURITY DEFINER SET search_path = public`. Elles posent `SET LOCAL app.privileged = 'on'` lorsqu'elles doivent écrire des colonnes protégées.

### 1. `set-pin` / `verify-pin` (Edge Functions)
```typescript
// set-pin : création du PIN
const hash = await bcrypt.hash(pin, 12);                       // async, côté serveur
await supabase.from('profiles').update({ pin_hash: hash }).eq('id', userId);

// verify-pin : vérification avec anti-forçage
const p = await getProfile(userId);
if (p.pin_locked_until && p.pin_locked_until > now()) throw new Error('PIN verrouillé');
const ok = await bcrypt.compare(candidate, p.pin_hash);        // compare, pas hash
if (!ok) {
  const attempts = p.pin_attempts + 1;
  const lockUntil = attempts >= 5 ? addMinutes(now(), 15 * (attempts - 4)) : null; // durée croissante
  await supabase.from('profiles').update({ pin_attempts: attempts, pin_locked_until: lockUntil }).eq('id', userId);
  throw new Error('PIN incorrect');
}
await supabase.from('profiles').update({ pin_attempts: 0, pin_locked_until: null }).eq('id', userId);
```

### 2. `credit_wallet` (RPC, SECURITY DEFINER)
```sql
CREATE OR REPLACE FUNCTION credit_wallet(p_client UUID, p_field TEXT, p_amount BIGINT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_field NOT IN ('free_savings','blocked_guarantee','mandatory_savings','disbursed_loan') THEN
    RAISE EXCEPTION 'Champ non autorisé';
  END IF;
  EXECUTE format('UPDATE wallets SET %I = %I + $1, updated_at = now() WHERE client_id = $2', p_field, p_field)
  USING p_amount, p_client;
END; $$;
```

### 3. `confirm_deposit` (RPC, SECURITY DEFINER, atomique & idempotente)
```sql
CREATE OR REPLACE FUNCTION confirm_deposit(p_request UUID, p_agent UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r deposit_requests;
BEGIN
  -- Verrou + garde d'idempotence : une seule confirmation possible.
  UPDATE deposit_requests
     SET status = 'CONFIRMED', confirmed_by = p_agent, confirmed_at = now()
   WHERE id = p_request AND status = 'PENDING'
  RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande déjà traitée ou introuvable'; END IF;

  -- Crédit selon le motif, dans la même transaction.
  IF r.motif = 'FREE_SAVINGS' THEN
    PERFORM credit_wallet(r.client_id, 'free_savings', r.amount);
  ELSIF r.motif = 'GUARANTEE' THEN
    PERFORM credit_wallet(r.client_id, 'blocked_guarantee', r.amount);
    PERFORM check_guarantee_completion(r.client_id);  -- passe le prêt en GUARANTEE_COMPLETE si atteint
  ELSIF r.motif = 'REPAYMENT' THEN
    PERFORM apply_early_repayment(r.client_id, r.amount);
  END IF;
END; $$;
```

### 4. `create_withdrawal` (RPC, SECURITY DEFINER, réservation atomique)
```sql
CREATE OR REPLACE FUNCTION create_withdrawal(p_client UUID, p_type TEXT, p_amount BIGINT, p_recipient JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  -- Réserve SEULEMENT si le disponible (net du réservé) est suffisant.
  UPDATE wallets SET reserved_amount = reserved_amount + p_amount, updated_at = now()
   WHERE client_id = p_client
     AND (free_savings + disbursed_loan - reserved_amount) >= p_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solde disponible insuffisant'; END IF;

  INSERT INTO withdrawal_requests (client_id, type, amount, recipient_operator, recipient_phone,
                                   recipient_bank, recipient_account, recipient_name, status)
  VALUES (p_client, p_type, p_amount, p_recipient->>'operator', p_recipient->>'phone',
          p_recipient->>'bank', p_recipient->>'account', p_recipient->>'name', 'PENDING')
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
```

### 5. `settle_withdrawal` (RPC, SECURITY DEFINER) — exécution / rejet / annulation
```sql
CREATE OR REPLACE FUNCTION settle_withdrawal(p_request UUID, p_action TEXT, p_agent UUID, p_ref TEXT DEFAULT NULL, p_reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r withdrawal_requests; v_from_loan BIGINT; v_hour INT;
BEGIN
  UPDATE withdrawal_requests SET status = 'PROCESSING'
   WHERE id = p_request AND status = 'PENDING' RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande déjà traitée ou introuvable'; END IF;

  IF p_action = 'EXECUTE' THEN
    -- Plage horaire autorisée : 8h–19h, heure locale (Africa/Abidjan, UTC+0, zone XOF canonique).
    v_hour := EXTRACT(HOUR FROM now() AT TIME ZONE 'Africa/Abidjan');
    IF v_hour < 8 OR v_hour >= 19 THEN
      UPDATE withdrawal_requests SET status = 'PENDING' WHERE id = p_request; -- remis en file
      RAISE EXCEPTION 'Traitement des retraits autorisé uniquement entre 8h et 19h';
    END IF;

    -- Débit : d'abord le prêt décaissé disponible, puis l'épargne libre ; on lève la réservation.
    SELECT LEAST(r.amount, disbursed_loan) INTO v_from_loan FROM wallets WHERE client_id = r.client_id;
    UPDATE wallets SET
      disbursed_loan  = disbursed_loan  - v_from_loan,
      free_savings    = free_savings    - (r.amount - v_from_loan),
      reserved_amount = reserved_amount - r.amount,
      updated_at = now()
    WHERE client_id = r.client_id;

    UPDATE withdrawal_requests SET status = 'COMPLETED', processed_by = p_agent, external_reference = p_ref WHERE id = p_request;

  ELSE  -- REJECT ou CANCEL : on lève la réservation sans débit.
    UPDATE wallets SET reserved_amount = reserved_amount - r.amount, updated_at = now() WHERE client_id = r.client_id;
    UPDATE withdrawal_requests
       SET status = CASE WHEN p_action = 'CANCEL' THEN 'CANCELLED' ELSE 'REJECTED' END,
           processed_by = p_agent, rejected_reason = p_reason
     WHERE id = p_request;
  END IF;
END; $$;
```

### 6. `confirm_repayment` (RPC, SECURITY DEFINER) — priorités + clôture
```sql
-- Applique le montant dans l'ordre : pénalités → intérêts → capital → épargne obligatoire,
-- sur les échéances par ancienneté. Met à jour les paid_* et penalty, puis loans.remaining_principal.
-- La part "épargne obligatoire" est créditée au sous-compte bloqué (mandatory_savings).
-- IDEMPOTENT via garde de statut PENDING → CONFIRMED.
-- Lorsque remaining_principal atteint 0 :
--     UPDATE loans SET status = 'CLOSED' WHERE id = v_loan_id;
--   → ceci déclenche le trigger release_funds_on_loan_close (mécanisme UNIQUE de libération).
```

### 7. `disburse_loan` (RPC, SECURITY DEFINER)
```sql
-- 1. Crée la ligne loans (remaining_principal = total_amount, status='ACTIVE').
-- 2. Génère l'échéancier via generate_amortization_schedule(loan_id).
-- 3. Si réception 'INTERNAL' : PERFORM credit_wallet(client, 'disbursed_loan', montant).
--    Sinon (MOBILE_MONEY/BANK_TRANSFER) : la remise physique est faite par la microfinance,
--    aucun crédit de portefeuille (les fonds ne transitent pas par le solde interne).
-- 4. loan_requests.status := 'DISBURSED'.
```

### 8. `generate_amortization_schedule` (fonction)
```sql
-- Construit les lignes d'échéancier selon interest_method du produit :
--   CONSTANT_INSTALLMENT : Échéance = P·r / (1 − (1+r)^(−n)) ; intérêt = capital_restant·r ;
--                          capital = Échéance − intérêt.
--   DEGRESSIVE           : capital = P/n (constant) ; intérêt = capital_restant·r.
-- Ajoute frais et épargne obligatoire selon les paramètres du produit.
-- Arrondit chaque composante à l'unité FCFA ; la DERNIÈRE échéance absorbe l'écart d'arrondi
-- pour que Σ capital = P et Σ échéances = total à rembourser.
```

### 9. `release_funds_on_loan_close` (trigger — mécanisme UNIQUE de libération)
```sql
CREATE OR REPLACE FUNCTION release_funds_on_loan_close()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_g BIGINT; v_s BIGINT; v_l BIGINT;
BEGIN
  IF NEW.status = 'CLOSED' AND OLD.status = 'ACTIVE' THEN
    SELECT blocked_guarantee, mandatory_savings, disbursed_loan
      INTO v_g, v_s, v_l FROM wallets WHERE client_id = NEW.client_id;

    -- Garantie + épargne obligatoire + éventuel reliquat de prêt → épargne libre.
    UPDATE wallets SET
      free_savings      = free_savings + v_g + v_s + v_l,
      blocked_guarantee = 0,
      mandatory_savings = 0,
      disbursed_loan    = 0,
      updated_at = now()
    WHERE client_id = NEW.client_id;

    INSERT INTO audit_logs (user_id, user_role, action_type, target_id, new_value)
    VALUES (NEW.client_id, 'system', 'AUTO_RELEASE', NEW.id,
            jsonb_build_object('released', v_g + v_s + v_l));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_release_on_close
  AFTER UPDATE OF status ON loans
  FOR EACH ROW EXECUTE FUNCTION release_funds_on_loan_close();
```

### 10. Trigger d'audit
```sql
-- Sur chaque changement de status des tables de demande et sur les modifications de configuration,
-- écriture automatique dans audit_logs (fonction SECURITY DEFINER, donc l'INSERT réussit
-- malgré l'absence de policy INSERT — la table reste append-only pour les utilisateurs).
```

---

## PARTIE E : ORDONNANCEUR (TÂCHES PLANIFIÉES)

Une tâche quotidienne (`pg_cron`, ou Edge Function planifiée) exécute :
```sql
-- 1. Marquer en retard les échéances dues et non soldées.
UPDATE amortization_schedules
   SET status = 'LATE'
 WHERE due_date < current_date
   AND status IN ('PENDING','PARTIAL');

-- 2. Accumuler les pénalités de retard (late_penalty_rate % par jour) sur les échéances LATE.
--    penalty_accrued += reste_dû × late_penalty_rate/100 (par jour de retard).

-- 3. Marquer DEFAULTED les prêts dont le retard dépasse le seuil défini.

-- 4. Générer les notifications :
--    - "échéance proche" (J-3 avant due_date) ;
--    - "échéance en retard" (dès le passage en LATE).
```

---

## PARTIE F : FORMULES & ARRONDI (RÉFÉRENCE UNIQUE)

**Portefeuille (montants entiers FCFA) :**
- `SOLDE_DISPONIBLE = free_savings + disbursed_loan − reserved_amount`
- `MONTANT_BLOQUE  = blocked_guarantee + mandatory_savings`
- `MONTANT_RESERVE = reserved_amount`
- `PATRIMOINE      = free_savings + disbursed_loan + blocked_guarantee + mandatory_savings`
  *(le réservé n'est jamais ré-additionné : il est déjà compté dans `free_savings`/`disbursed_loan`).*

**Débit à l'exécution d'un retrait :** prêt décaissé disponible d'abord, puis épargne libre ; `reserved_amount` diminué du même montant.

**Crédit d'un dépôt :** selon le motif (`free_savings`, `blocked_guarantee`, ou application de remboursement).

**Clôture de prêt :** `garantie + épargne obligatoire + reliquat de prêt → épargne libre` ; sous-comptes bloqués et prêt décaissé remis à 0. Aucune chute du solde disponible.

**Crédit — arrondi :** chaque composante d'échéance est arrondie à l'unité FCFA ; la dernière échéance absorbe l'écart cumulé, garantissant `Σ capital = capital emprunté` et `Σ échéances = total à rembourser`.

---

## CONCLUSION

Cette spécification est prête à être implémentée. Elle garantit :
- une **définition unique du solde** appliquée partout, sans double comptage ni sur-réservation ;
- des **écritures comptables serveur** atomiques et idempotentes (protection contre le double-crédit) ;
- une **libération de fin de prêt par un mécanisme unique**, sans chute brutale du solde ;
- une **autorisation par le rôle porté dans le jeton**, les colonnes sensibles étant inaccessibles en écriture directe ;
- une **protection du PIN** contre le forçage ;
- une **méthode d'amortissement** et des **règles d'arrondi** explicites et testables ;
- un **modèle de données complet** couvrant KYC (documents et données financières), notifications in-app, emails multilingues et audit append-only ;
- un **ordonnanceur** assurant les passages en retard, les pénalités et les rappels.
