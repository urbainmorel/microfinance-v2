# Traitement des avertissements Supabase

## Objectif

Maintenir un inventaire explicite des alertes du Security Advisor, corriger celles qui révèlent
un défaut réel et documenter les exceptions assumées sans affaiblir l'application.

## Corrections automatisées

La migration `20260825184650_harden_advisor_findings.sql` :

- fixe un `search_path` vide sur les six anciennes fonctions concernées ;
- remplace les appels RLS répétés à `auth.uid()` par une initialisation unique ;
- fusionne les politiques permissives de lecture client et administrateur ;
- sépare les droits d'écriture administrateur lorsque la politique `ALL` chevauchait `SELECT`.

Le test `advisor_hardening.sql` empêche le retour de ces trois familles d'alertes. Il s'exécute
dans la stack Supabase éphémère de GitHub Actions ; aucune base locale ni donnée distante n'est
nécessaire.

## Alertes conservées intentionnellement

Les fonctions `SECURITY DEFINER` exécutables par `authenticated` sont des commandes applicatives
publiques nécessaires au client ou à l'administrateur. Leur suppression casserait les parcours.
Elles sont acceptables uniquement si les quatre conditions suivantes restent vraies :

1. `search_path` est fixé explicitement ;
2. les fonctions administratives rechargent le rôle actif depuis `profiles` ;
3. les fonctions client vérifient le propriétaire ou reçoivent l'identité depuis une Edge
   Function authentifiée ;
4. aucun droit `EXECUTE` privilégié n'est accordé à `anon` ou `public`.

L'avertissement générique ne doit donc pas être « corrigé » en convertissant ces fonctions en
`SECURITY INVOKER` sans revue fonctionnelle et revue RLS complètes.

## Paramètres Auth à traiter avant ouverture publique

- **Protection contre les mots de passe compromis** : l'activer dans Supabase Auth dès que le
  forfait et l'environnement cible le permettent, puis tester inscription, connexion et
  changement de mot de passe.
- **Options MFA insuffisantes** : ne pas rendre la MFA obligatoire dans la V1 interne tant que le
  parcours d'enrôlement et de récupération n'existe pas. Avant ouverture publique, choisir le
  facteur, implémenter l'enrôlement et valider les scénarios de perte du facteur.

Ces deux alertes sont des paramètres de projet, pas des défauts corrigibles par migration SQL.

## Contrôle de cible obligatoire

Avant toute lecture d'advisor, migration ou changement Auth, vérifier ensemble :

1. le nom du projet attendu ;
2. sa référence Supabase ;
3. l'hôte de `NEXT_PUBLIC_SUPABASE_URL` ;
4. la référence liée dans `supabase/.temp/project-ref` ;
5. l'identité remontée par `supabase projects list` ou le connecteur utilisé.

L'opération distante doit être interrompue dès qu'une de ces valeurs diverge. La migration locale
reste la source de vérité et ne doit être appliquée à la cible correcte qu'après ce contrôle.
