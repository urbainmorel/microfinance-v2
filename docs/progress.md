# Journal de finalisation

Ce journal suit les livraisons réalisées sur la branche `codex/finalisation-complete-v1`.

## 2026-08-20

### Décisions métier documentées

- Commit : `10f1e16 docs: formalize validated V1 business decisions`.
- Création de l'ADR 0002, de la politique métier V1 et de la spécification des contrats dynamiques.
- Ajout d'un portail documentaire et mise en cohérence du README, du PRD, des spécifications et de la ROADMAP.
- Validation Prettier et `git diff --check` réussie.

### Baseline de finalisation — terminée

- Branche créée : `codex/finalisation-complete-v1`.
- Génération propre des types Next réussie.
- Typecheck réussi après déplacement du cache corrompu hors du dépôt.
- Vitest : 19 tests sur 19 réussis.
- ESLint global réussi.
- Build Next de production réussi sur 32 routes.
- Correction du seul fichier TypeScript non conforme à Prettier.
- Ajout d'une génération de types Next déterministe avant TypeScript.
- Ajout d'un nettoyage multiplateforme ciblé des types Next générés avant `typecheck` et `build`; Next 16.3 maintient `.next/dev/types` dans `tsconfig`, le nettoyage préalable évite qu'une route supprimée reste dans le contrôle suivant.
- Mise à niveau de sécurité Next.js 16.3.1 préparée afin de corriger Next et ses dépendances de production vulnérables.
- Audit de production ramené de neuf vulnérabilités élevées à une vulnérabilité faible transitive `@babel/core`; la version corrigée 7.29.1 indiquée par l'avis n'est pas publiée dans le registre utilisé et le passage forcé à Babel 8 est écarté pour incompatibilité potentielle.
- Installation `pnpm install --frozen-lockfile` réussie avec pnpm 11.0.0.
- Deux exécutions consécutives du typecheck réussies.
- Audit production final : 0 critique, 0 élevée, 0 modérée, 1 faible.
- Format, Vitest et build Next.js 16.3.1 réussis.
- ESLint global a identifié uniquement le journal console du script de nettoyage ; le script a été corrigé et son lint ciblé est vert.
- Le snapshot applicatif local antérieur est intégré comme baseline contrôlée afin que les développements suivants puissent être livrés par commits fonctionnels atomiques.

### Sécurité du PIN — terminée

- Déplacement des hashes bcrypt et des compteurs de verrouillage de `public.profiles` vers `app_private.user_pin_security`, hors des schémas exposés par la Data API.
- Migration automatique des hashes existants puis suppression des trois colonnes publiques sensibles.
- RPC sensibles explicitement révoquées à `public`, `anon` et `authenticated`, et accordées uniquement à `service_role`.
- Création initiale et remplacement du hash effectués atomiquement en base.
- Incrément des échecs et calcul du verrouillage progressif effectués dans une unique instruction SQL atomique.
- Adaptation des Edge Functions de création, vérification et récupération du PIN.
- Conservation d'un état d'onboarding minimal : le client reçoit uniquement `pin_set` et le statut KYC.
- Extension du test pgTAP de sécurité de 7 à 14 assertions ; son exécution avec Docker reste déléguée à GitHub Actions conformément aux règles du projet.

### Protection de la récupération PIN — terminée

- Remplacement du hash SHA-256 déterministe des OTP à six chiffres par HMAC-SHA-256 avec un secret serveur d'au moins 32 octets.
- Chiffrement AES-256-GCM de l'OTP lors de son passage temporaire dans l'outbox ; seul le worker d'envoi le déchiffre en mémoire.
- Suppression de la lecture de l'outbox par les rôles administratifs applicatifs et restriction des RPC de réservation/complétion à `service_role`.
- Ajout de `PIN_RECOVERY_SECRET` au contrat de configuration, sans valeur réelle dans le dépôt.
- Extension de la suite pgTAP à 16 assertions de sécurité.

### Moindre privilège des fonctions SQL — terminé

- Révocation globale du droit `EXECUTE` que PostgreSQL attribue implicitement à `PUBLIC` sur les fonctions des schémas `public` et `app_private`.
- Interdiction de l'accès direct des rôles applicatifs aux fonctions privées ; les droits fonctionnels déjà accordés explicitement restent inchangés.
- Durcissement des privilèges par défaut afin que les futures migrations ne réintroduisent pas silencieusement ce droit.
- Réaffirmation explicite des seuls accès techniques nécessaires à Auth et aux Edge Functions utilisant `service_role`.
- Extension de la suite pgTAP à 20 assertions, dont la preuve qu'une RPC client autorisée reste accessible.

### Stockage documentaire privé — terminé

- Pièces KYC modifiables uniquement par leur propriétaire actif tant que le dossier est `NONE` ou `INFO_REQUESTED`, puis immuables après soumission.
- Noms d'objets KYC limités aux trois pièces attendues : `ID_FRONT`, `ID_BACK` et `SELFIE`.
- Lecture agent unifiée sur l'unique rôle V1 `admin` pour les quatre buckets privés.
- Téléversement des justificatifs financiers réservé aux comptes actifs et à leur propre dossier Storage.
- Suppression client limitée aux fichiers financiers orphelins, afin que le nettoyage après échec d'une commande fonctionne sans permettre d'effacer une preuve déjà rattachée à une opération.

### Invariants serveur du KYC — terminés

- Sauvegarde KYC réservée au propriétaire authentifié, actif, et uniquement aux états `NONE` ou `INFO_REQUESTED`.
- Liste blanche stricte des champs acceptés ; toute tentative d'injecter un rôle ou un statut est rejetée avant écriture.
- Validation serveur du pays UMOA, des dates, téléphones, types de pièce et bornes financières.
- Soumission refusée tant que le profil, la source de revenus ou les pièces obligatoires ne sont pas complets.
- Fonctions `SECURITY DEFINER` recréées avec un `search_path` vide et droits explicites.
- Ajout de cinq tests pgTAP dédiés aux invariants et à l'immutabilité post-soumission.
