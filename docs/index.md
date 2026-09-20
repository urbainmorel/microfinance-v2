# Documentation Azari Microfinance v2.1

Ce portail oriente vers les sources de vérité produit, techniques et opérationnelles du projet.

## Lecture rapide

| Besoin                                          | Document                                                                             |
| :---------------------------------------------- | :----------------------------------------------------------------------------------- |
| Comprendre l'architecture système & la sécurité | [`architecture.md`](architecture.md)                                                 |
| Consulter la référence RPC, Supabase & Edge     | [`api-reference.md`](api-reference.md)                                               |
| Connaître la stratégie de test & CI/CD          | [`testing-guide.md`](testing-guide.md)                                               |
| Comprendre les règles métier validées           | [`business-rules-v1.md`](business-rules-v1.md)                                       |
| Comprendre le contrat de prêt dynamique         | [`contracts/dynamic-loan-contract-v1.md`](contracts/dynamic-loan-contract-v1.md)     |
| Suivre le journal de finalisation               | [`progress.md`](progress.md)                                                         |
| Comprendre la méthode de livraison              | [`development-strategy.md`](development-strategy.md)                                 |
| Comprendre le modèle à 2 rôles (Client/Admin)   | [`adr/0001-modele-acces-deux-roles.md`](adr/0001-modele-acces-deux-roles.md)         |
| Comprendre le cadre crédit UMOA                 | [`adr/0002-cadre-metier-credit-v1-umoa.md`](adr/0002-cadre-metier-credit-v1-umoa.md) |
| Amorcer ou remplacer l'administrateur           | [`runbooks/amorcer-chef-agence.md`](runbooks/amorcer-chef-agence.md)                 |
| Vérifier une cible de déploiement               | [`runbooks/cibles-deploiement.md`](runbooks/cibles-deploiement.md)                   |
| Traiter les avertissements Supabase             | [`runbooks/supabase-advisors.md`](runbooks/supabase-advisors.md)                     |
| Exigences fonctionnelles                        | [`PRD_Microfinance_v2.1.md`](../PRD_Microfinance_v2.1.md)                            |
| Suivre les lots d'implémentation                | [`ROADMAP.md`](../ROADMAP.md)                                                        |

---

## Hiérarchie des sources

En cas de contradiction, appliquer cet ordre :

1. ADR acceptées les plus récentes ;
2. règles métier V1 ;
3. spécification du contrat dynamique ;
4. architecture système & modèle de sécurité ;
5. PRD ;
6. spécifications techniques et référence API ;
7. ROADMAP ;
8. commentaires historiques du code.

Les ADR 0001 et 0002 remplacent notamment les anciens passages décrivant sept rôles, des opérateurs internes distincts ou un fuseau unique pour toute l'UMOA.

---

## État documentaire

### Décisions validées

- deux rôles : client et administrateur ;
- un administrateur global actif ;
- huit pays UMOA et XOF ;
- confirmation financière manuelle ;
- deux produits paramétrables ;
- mensualités constantes sur capital restant dû ;
- plafond interne de coût effectif à 20 % ;
- un seul prêt vivant ;
- KYC fondé sur le risque ;
- contrat dynamique signé par PIN/OTP ;
- français/anglais client et français admin.

---

## Parcours conseillé

### Produit ou métier

1. [`ADR 0002 : Cadre métier UMOA`](adr/0002-cadre-metier-credit-v1-umoa.md)
2. [`Règles métier V1`](business-rules-v1.md)
3. [`Contrat dynamique`](contracts/dynamic-loan-contract-v1.md)

### Développement & Technique

1. [`README`](../README.md)
2. [`Architecture système`](architecture.md)
3. [`Référence Technique & API`](api-reference.md)
4. [`Guide de Tests & Assurance Qualité`](testing-guide.md)
5. [`Spécifications techniques`](../SPECIFICATIONS_TECHNIQUES_Microfinance_v2.1.md)
6. [`ROADMAP`](../ROADMAP.md)

### Exploitation & DevOps

1. [`Cibles de déploiement`](runbooks/cibles-deploiement.md)
2. [`Amorçage administrateur`](runbooks/amorcer-chef-agence.md)
3. [`Avertissements Supabase`](runbooks/supabase-advisors.md)

---

## Entretien

Toute modification d'une décision validée doit :

1. créer une nouvelle ADR ou modifier explicitement le statut de l'ADR concernée ;
2. mettre à jour la politique métier ;
3. mettre à jour la spécification contractuelle si le contrat change ;
4. ajouter ou adapter les tests ;
5. enregistrer l'impact de migration et de compatibilité.
