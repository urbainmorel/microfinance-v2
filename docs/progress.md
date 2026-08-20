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
