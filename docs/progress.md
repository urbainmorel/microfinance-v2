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

### Routage d'onboarding obligatoire — terminé

- Protection de toutes les routes client contre le contournement direct par URL.
- Ordre imposé : email vérifié, puis création du PIN, puis KYC lorsque son état exige une action.
- Retour post-création du PIN calculé depuis l'état serveur au lieu d'un renvoi prématuré au tableau de bord.
- Échec fermé lorsque l'état d'onboarding ne peut pas être chargé.
- Conservation des cookies Supabase rafraîchis lors des redirections du proxy.
- Ajout de huit cas unitaires couvrant les statuts KYC et la priorité du PIN.

### Plafond de coût effectif et mensualités — terminés

- Calcul du coût effectif annualisé par taux de rendement interne sur les flux réels de remboursement.
- Inclusion des intérêts, frais de dossier, frais de gestion et assurance ; exclusion documentée de la garantie et de l'épargne obligatoire récupérables.
- Blocage en base de tout produit ou demande dépassant le plafond interne validé de 20 %.
- Désactivation conservatoire des anciens produits actifs hors plafond lors de la migration.
- Méthode V1 limitée aux mensualités constantes sur capital restant dû ; la méthode dégressive est désormais refusée.
- Ajout de cinq tests pgTAP couvrant le coût nul, l'annualisation, l'acceptation et les deux blocages métier.

### Intégrité des justificatifs Storage — terminée

- Remplacement de l'écriture directe des métadonnées KYC par une RPC de finalisation serveur.
- Vérification obligatoire de l'existence de l'objet, du propriétaire, du bucket, du préfixe, de la taille et du type MIME.
- Contrôles identiques déclenchés avant chaque rattachement de preuve de dépôt, de remboursement ou de demande de prêt.
- Interdiction aux clients d'insérer ou modifier directement `kyc_documents`.
- Ajout de cinq tests pgTAP prouvant qu'un faux chemin est refusé et qu'un objet réel valide peut seul être finalisé.

### Prêt vivant unique — terminé

- Verrou transactionnel par client avant toute insertion de demande afin de résister aux soumissions concurrentes.
- Refus immédiat d'une demande lorsqu'un prêt `ACTIVE` ou `DEFAULTED` existe déjà.
- Correction de la priorité d'affichage : prêt vivant, puis demande récente, puis ancien prêt clôturé.
- Ajout de tests pgTAP pour le blocage, la réouverture après clôture et la priorité de la nouvelle demande.

### Annulation et clôture financières atomiques — terminées

- Annulation d'un retrait validée uniquement si le montant réservé est libéré dans la même transaction.
- Détection explicite d'une incohérence de réserve avec rollback complet de l'annulation et de son reçu d'idempotence.
- Suppression de la dépendance fragile au dernier état implicite `FOUND` de PL/pgSQL.
- Clôture d'un prêt uniquement lorsque capital, intérêts, frais, pénalités et épargne obligatoire sont intégralement payés.
- Ajout de tests pgTAP de non-régression sur ces deux gardes critiques.

### Récupération du mot de passe — terminée

- Ajout de la route de demande avec réponse non énumérante, lien de retour et état de confirmation.
- Ajout de la route sécurisée de définition du nouveau mot de passe avec échange du code PKCE, détection des liens invalides et déconnexion après succès.
- Politique forte factorisée et identique entre inscription et réinitialisation.
- Ajout de tests unitaires pour l'email, la robustesse du mot de passe et sa confirmation.

### Confirmation automatique de l'email — terminée

- Définition explicite du callback email lors de l'inscription et de chaque renvoi.
- Route serveur échangeant le code PKCE contre une session avant de reprendre le routage PIN/KYC.
- Conservation temporaire de l'adresse uniquement dans `sessionStorage` pour permettre un renvoi lorsque l'inscription n'a pas encore créé de session.
- Détection d'une session déjà confirmée et redirection automatique sans nouvelle connexion manuelle.
- Échec fermé vers la connexion lorsque le code est absent, invalide ou expiré.

### Barrière CI Supabase avant déploiement — terminée

- Ajout du linter de schéma après reconstruction de la base dans le runner GitHub.
- Validation Deno séparée : lint et typecheck des six Edge Functions.
- Déploiement automatique déclenché uniquement après succès du workflow Supabase sur `main` et checkout du SHA effectivement contrôlé.
- Déclenchement manuel conservé mais rendu autonome : reconstruction, lint, pgTAP et contrôles Deno précèdent toute mutation distante.
- Docker reste exclusivement exécuté dans GitHub Actions conformément aux instructions du dépôt.
- Imports Deno centralisés et figés dans `supabase/functions/deno.json`, supprimant la résolution flottante de `@supabase/supabase-js@2`.

### Reprise et terminaison des notifications — terminées

- Bail de traitement de 15 minutes avec récupération automatique après interruption d'un worker.
- Maximum de cinq tentatives, backoff borné et état terminal `DEAD_LETTER`.
- Effacement du payload OTP après succès comme après échec terminal.
- Absence de création d'email lorsqu'aucun modèle ne couvre l'événement ; la notification applicative reste disponible.
- Correction des deux modèles KYC dont une variable obligatoire n'était jamais fournie.
- Le worker quotidien exécute désormais réellement la maintenance des prêts via une RPC réservée à `service_role` avant l'envoi des emails.
- Ajout de quatre assertions pgTAP couvrant récupération du bail, terminaison et purge du secret.

### Détail, reçu et annulation des opérations — terminés

- Chaque ligne de l'historique ouvre désormais un reçu appartenant exclusivement au client connecté.
- Affichage du statut, montant, date, canal, référence, motif de rejet et identifiant de corrélation disponibles.
- Annulation des dépôts, retraits et remboursements `PENDING` via la commande Edge sécurisée par PIN et idempotence.
- Retour automatique vers l'historique et invalidation du cache après succès.
- L'annulation d'un retrait rappelle et applique la libération atomique de la somme réservée.

### Formulaires financiers complets — terminés

- Certification obligatoire de l'authenticité du justificatif avant toute demande de dépôt.
- Virement bancaire enrichi avec pays UMOA, code banque, compte, IBAN distinct et motif.
- Validation cohérente dans Zod, l'Edge Function et la fonction SQL de réservation.
- Persistance structurée des nouvelles coordonnées bancaires avec contraintes UMOA côté base.
- Information explicite du délai manuel de 24 à 48 heures ouvrées pour les virements.

### Tests SQL réalignés sur les invariants V1 — terminés

- Fixtures KYC et financières adossées à de vrais objets Storage avec propriétaire, taille et MIME valides.
- Scénario de cycle de vie exclusivement fondé sur les mensualités constantes.
- Conservation des contrôles de coût effectif, d'idempotence, de réservation et de clôture atomique.

### Détail client du prêt — terminé

- Accès direct depuis la carte du prêt actif vers un échéancier protégé par RLS.
- Solde total ventilé à partir du capital, des intérêts, frais, épargne obligatoire et pénalités restant dus.
- Mise en avant de la prochaine échéance et de son montant réellement restant.
- Remboursement anticipé explicitement présenté comme sans frais, avec confirmation manuelle.

### Revue documentaire KYC — terminée

- Recto, verso et selfie accessibles à l'administrateur via des URL signées privées de cinq minutes.
- Documents regroupés avec chaque dossier de la file KYC et ouverts dans un contexte isolé.
- Action de validation désactivée lorsque le dossier ne contient aucune pièce vérifiable.

### Instantané contractuel des produits — terminé

- Copie immuable de tous les taux, frais, plafonds, garanties et pénalités dans chaque demande.
- Identifiant de version contractuelle unique créé à la soumission.
- Devise XOF, plafond de coût effectif à 20 % et remboursement anticipé sans frais inscrits dans l'instantané.
- Protection SQL contre toute modification rétroactive, y compris lors d'un changement de produit.

### Contrats de prêt dynamiques et signature — terminés

- Contrat individuel généré à l'acceptation avec emprunteur, capital, durée, taux, frais, garantie et clauses V1.
- Empreinte SHA-256, numéro unique, version des conditions et horodatages conservés en base.
- Lecture strictement limitée au client concerné et à l'administrateur actif par RLS.
- Consentement explicite et signature par PIN via Edge Function ; rejeu rendu idempotent.
- Garantie et décaissement techniquement impossibles tant que le contrat n'est pas signé.

### Versionnement du catalogue de prêts — terminé

- Toute modification métier crée une nouvelle révision et archive atomiquement la précédente.
- Historique relié par identifiant logique, numéro de révision et référence de remplacement.
- Mutation directe des conditions financières interdite au niveau SQL.
- Méthode dégressive retirée du back-office : seules les mensualités constantes sont proposées.

### Application web installable (PWA) — terminée

- Manifest autonome, identité visuelle, icône standard et icône adaptative.
- Service Worker enregistré uniquement en production avec repli explicite hors connexion.
- Cache limité à la coque hors-ligne et aux ressources statiques publiques.
- Routes client/admin, réponses Supabase, documents et données financières toujours servis par le réseau.

### Fondation bilingue client FR/EN — terminée

- Dictionnaires typés et fournisseur de langue limité à l'espace client.
- Préférence persistée un an par cookie, changement instantané et attribut `lang` synchronisé.
- Sélecteur accessible dans le profil ; navigation, salutation et profil traduits.
- Administration laissée exclusivement en français conformément à la décision métier.

### Coque client responsive — terminée

- Largeur de travail étendue sur tablette et ordinateur au lieu du conteneur mobile de 560 px.
- Navigation basse conservée sur mobile et transformée en navigation latérale fixe sur grand écran.
- Zone métier plafonnée pour garder des formulaires lisibles, avec espace disponible pour les tableaux et échéanciers.

### Paramétrage général administrateur — terminé

- Écran de gestion des horaires de retrait, frais fixes, délai de défaut et rétentions KYC/audit.
- Validations cohérentes dans le formulaire et via les contraintes SQL existantes.
- Commande réservée à l'administrateur actif et chaque modification inscrite dans le journal d'audit.

### Modèles de notification administrables — terminés

- Liste et édition des modèles français et anglais avec objet, HTML et variables déclarées.
- Validation SQL des slugs, langues, tailles, variables et correspondance des placeholders.
- Rejet des scripts, gestionnaires d'événements et URL HTML actives.
- Aperçu rendu dans une iframe sans permissions et attribution automatique de l'administrateur auteur.

### Rapports financiers administrateur — terminés

- Synthèse filtrable des dépôts, retraits, remboursements, décaissements et encours.
- Nombre de prêts actifs et en défaut, avec ventilation des flux par pays client.
- Période contrôlée côté SQL, limitée à 366 jours et accessible au seul administrateur actif.
- Export CSV UTF-8 compatible tableur, couvert par un test unitaire d'échappement.

### Fiabilisation PWA et E2E public — terminée

- Ajout d'icônes PNG 192 px, 512 px et maskable pour une installation PWA fiable.
- Smoke tests synchronisés avec les libellés réels de connexion et de mode hors ligne.
- Vérification automatisée du manifeste, de ses icônes et de la page hors ligne.
- Serveur E2E isolé sur le port 3100 et réutilisation silencieuse d'un autre projet interdite.
- Parcours publics validés sur Chromium desktop et mobile : 8 scénarios réussis.

### Fonctions Edge distantes — déploiement validé

- Déploiement des six fonctions : `client-command`, `daily-jobs`, `pin-recovery`,
  `send-notification-email`, `set-pin` et `verify-pin`.
- Secrets internes de récupération PIN et de distribution d'outbox générés de manière
  cryptographiquement sûre, configurés à distance et jamais stockés dans Git.
- État `ACTIVE` vérifié pour les six fonctions dans le projet Supabase configuré.
- Invocation réelle de `verify-pin` validée avec le compte client de test.
- Rejet HTTP 400 d'une commande client inconnue vérifié sans écriture financière.
- L'envoi d'e-mails réel reste conditionné à la configuration opérateur de `RESEND_API_KEY` et
  `EMAIL_FROM`.

### Dépendances — audit sans vulnérabilité connue

- Remplacement forcé de la dépendance transitive `@babel/core` 7.29.0 par la version corrigée
  7.29.7 via la configuration racine pnpm.
- `pnpm audit --prod --audit-level=low` ne remonte désormais aucune vulnérabilité connue.
- Installation figée, 35 tests unitaires et lint global validés après mise à jour du lockfile.

### Catalogue initial V1 — deux produits actifs

- Amorçage idempotent de « Prêt Essentiel » et « Prêt Croissance » avec les montants, durées et
  taux recommandés dans les décisions métier validées.
- Garantie initiale à 10 %, épargne obligatoire à 5 % et pénalité journalière à 0,03 %.
- Coûts effectifs annualisés vérifiés à 12,678291 % et 16,077845 %, sous le plafond interne de 20 %.
- Invariant SQL empêchant la création d'une troisième famille de produits en V1.
- Action « Nouveau produit » masquée lorsque les deux familles sont présentes ; les révisions des
  produits existants restent autorisées.
- Migration appliquée au projet distant et test pgTAP ajouté.

### E2E authentifiés — couverture client et administrateur

- Compte client pilote amené à l'état KYC approuvé pour tester les routes post-onboarding.
- Navigation validée sur 11 pages client et 13 pages administrateur, en desktop et mobile.
- Budget global des scénarios porté à 180 secondes tout en conservant les attentes élémentaires
  strictes, afin de couvrir les appels au projet distant sans faux échec.
- Terminologie E2E alignée sur le rôle unique `admin`, avec compatibilité temporaire des anciennes
  variables `E2E_STAFF_*`.
- Job GitHub Actions dédié sur les pushes `main`, avec échec explicite si un secret manque.
- Six secrets E2E configurés dans GitHub ; aucun identifiant n'est versionné dans le dépôt.

### Déploiement Supabase — configuration GitHub complétée

- Secret `SUPABASE_ACCESS_TOKEN` configuré dans GitHub.
- Référence, nom exact et organisation du projet ajoutés comme variables GitHub contrôlées.
- Suppression de la dépendance inutile à un mot de passe PostgreSQL absent : la CLI utilise la
  liaison API temporaire, validée avec le même jeton opérateur.
- Le workflow vérifie toujours l'identité exacte du projet avant le dry-run, les migrations et le
  déploiement parallèle des fonctions Edge.
- Configuration déplacée du dépôt vers l'environnement GitHub `staging` uniquement.
- Environnement `production` créé mais laissé sans cible ni secret, afin qu'un déploiement
  accidentel échoue avant toute connexion.

### Contrôle humain des pièces KYC — terminé

- Validation administrative renforcée dans la base : un dossier ne peut atteindre `COMPLETED`
  que si le recto, le selfie et, hors passeport, le verso ont chacun été contrôlés.
- Commande dédiée de confirmation d'une pièce, réservée à l'administrateur actif et interdite
  dès que le dossier n'est plus révisable.
- Chaque décision documentaire conserve l'agent, le client, le type de pièce, l'ancien état, le
  nouvel état, la date et le motif éventuel dans le journal d'audit append-only.
- Back-office enrichi avec l'état « À contrôler »/« Contrôlée » et une action explicite par pièce ;
  la décision KYC globale reste désactivée jusqu'à la fin du contrôle obligatoire.
- Test pgTAP de non-régression ajouté ; son exécution reste confiée à GitHub Actions conformément
  à la règle du projet qui réserve Docker à la CI.
