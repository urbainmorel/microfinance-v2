# Stratégie de finalisation

Ce document définit la méthode de livraison utilisée jusqu'à la finalisation complète de l'application.

## Principes

1. Traiter les risques de sécurité et d'intégrité avant les fonctionnalités de confort.
2. Livrer par tranche verticale utilisable, pas par couche technique isolée.
3. Inclure code, migration, tests et documentation dans la même tranche.
4. Créer un commit local atomique après chaque fonctionnalité terminée.
5. Ne jamais déclarer une fonction terminée sans preuve proportionnée à son risque.
6. Exécuter Docker et la stack Supabase locale uniquement dans GitHub Actions.

## Cycle d'une fonctionnalité

```text
Décision → conception → implémentation → tests ciblés → contrôles globaux
→ documentation → commit local → tranche suivante
```

### Entrée

- objectif et critères d'acceptation connus ;
- dépendances satisfaites ;
- impact sécurité et données identifié ;
- règle métier reliée à la documentation canonique.

### Sortie

- comportement nominal implémenté ;
- erreurs et concurrence traitées ;
- tests ciblés verts ;
- lint, format et typecheck verts pour les fichiers concernés ;
- documentation et journal d'avancement mis à jour ;
- aucun secret ou artefact généré dans l'index ;
- commit local au format conventionnel.

## Ordre de priorité

1. baseline Git et toolchain reproductible ;
2. sécurité PIN, OTP, RLS et Storage ;
3. invariants de prêts et mouvements ;
4. Auth et onboarding ;
5. parcours financiers client ;
6. produits versionnés et contrats dynamiques ;
7. back-office ;
8. i18n, PWA, responsive et accessibilité ;
9. tests transversaux et CI/CD ;
10. qualification de release.

## Stratégie de vitesse

- Réutiliser les composants et primitives existants.
- Stabiliser les contrats serveur avant de multiplier les écrans.
- Écrire les tests de régression en même temps que les corrections.
- Grouper les contrôles coûteux : tests ciblés pendant le développement, suite complète avant commit.
- Sérialiser les commandes Next qui écrivent dans `.next`.
- Utiliser GitHub Actions pour les tests Supabase/Docker et les validations multi-services.
- Éviter les refactorings sans impact direct sur une exigence ou un risque.

## Politique de commits

Exemples :

```text
fix(auth): enforce onboarding route guards
fix(security): isolate PIN secrets from Data API
feat(loans): version product terms and enforce cost cap
feat(contracts): generate immutable signed loan documents
docs(progress): record contract engine delivery
```

Une fonctionnalité et sa documentation appartiennent au même commit. Un commit ne mélange pas une nouvelle fonction avec une refonte sans rapport.

## Contrôles

### À chaque fonctionnalité

- tests ciblés ;
- Prettier ;
- ESLint ciblé ;
- TypeScript si le contrat de types change ;
- vérification du diff et des secrets ;
- commit local.

### À chaque jalon

- `pnpm lint` ;
- `pnpm format:check` ;
- `pnpm typecheck` ;
- `pnpm test` ;
- `pnpm build` ;
- pgTAP et Edge dans GitHub Actions ;
- E2E adaptés au jalon.

## Documentation continue

Le journal [`progress.md`](progress.md) est mis à jour après chaque tranche. Les décisions durables utilisent une ADR. Les règles métier restent dans [`business-rules-v1.md`](business-rules-v1.md). Les changements de contrat mettent à jour [`dynamic-loan-contract-v1.md`](contracts/dynamic-loan-contract-v1.md).
