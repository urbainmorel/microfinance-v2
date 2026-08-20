# ADR 0002 — Cadre métier et crédit V1 UMOA

Ce document enregistre les décisions métier validées pour la V1 interne. Il fait autorité lorsqu'une ancienne section du PRD, des spécifications ou de la ROADMAP présente un choix différent.

| Élément         | Valeur                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------- |
| Statut          | Accepté à 100 % par le porteur produit                                                   |
| Date            | 2026-08-20                                                                               |
| Portée          | V1 interne, non accessible au grand public                                               |
| Zone            | Huit États de l'UMOA                                                                     |
| Devise          | XOF, montants entiers en FCFA                                                            |
| Détail normatif | [`docs/business-rules-v1.md`](../business-rules-v1.md)                                   |
| Contrats        | [`docs/contracts/dynamic-loan-contract-v1.md`](../contracts/dynamic-loan-contract-v1.md) |

> [!IMPORTANT]
> « Validé » signifie que la règle produit est arrêtée. Cela ne signifie pas qu'elle est déjà implémentée, testée ou déployée. Les écarts entre ces décisions et le code doivent être traités comme du travail restant.

## Contexte

La V1 sert à valider en interne le cycle complet de microfinance avant une ouverture au grand public. Le produit doit rester simple, démontrable et gouverné par un nombre réduit de règles stables. Les opérations financières restent confirmées manuellement. Les contrats sont générés à partir de paramètres versionnés, sans modifier rétroactivement les prêts existants.

La V1 vise les huit États de l'UMOA : Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal et Togo. Elle utilise uniquement le XOF.

## Décisions

### Périmètre et exploitation

1. La V1 couvre tous les pays de l'UMOA.
2. Tous les montants sont exprimés et stockés en XOF entiers.
3. La V1 est un outil interne et n'est pas encore ouverte au grand public.
4. L'identité des entités prêteuses et leurs agréments sont gérés en interne, hors du périmètre applicatif V1.
5. Les opérations financières sont initiées dans l'application puis confirmées manuellement par l'administrateur global, qui tient le rôle opérationnel d'agent.
6. Une opération déclarée par un client ne produit aucun mouvement comptable tant que sa confirmation n'est pas exécutée côté serveur.

### Accès

1. La V1 conserve exactement deux rôles : `client` et `admin`.
2. Un seul administrateur global peut être actif.
3. L'administrateur global cumule les actions KYC, crédit, caisse, paramétrage et audit décrites dans l'ADR 0001.
4. La concentration des pouvoirs est acceptée pour la V1 interne et compensée par l'audit append-only, l'idempotence, la réauthentification et les motifs obligatoires.

### Crédit

1. La V1 propose exactement deux produits de prêt paramétrables.
2. Les montants minimum et maximum, durées, taux et frais sont configurables depuis le back-office.
3. La méthode contractuelle unique est la mensualité constante avec intérêts calculés sur le capital restant dû.
4. Un client ne peut avoir qu'un seul prêt vivant. Un prêt `ACTIVE` ou `DEFAULTED` interdit une nouvelle demande.
5. Le coût effectif annualisé interne ne peut pas dépasser 20 %.
6. Le plafond réglementaire de référence est 24 %. Le plafond applicable est le minimum entre le plafond interne et le plafond réglementaire configuré.
7. Le remboursement anticipé partiel ou total est autorisé sans frais.
8. Un remboursement anticipé partiel réduit la durée ; la mensualité reste inchangée sauf dernière échéance d'ajustement.
9. Les intérêts futurs non courus ne sont pas facturés.

### Risque, garantie et retard

1. Le KYC suit une approche fondée sur le risque.
2. Tout doute, incohérence ou document insuffisant déclenche obligatoirement un contrôle humain.
3. La garantie standard est fixée à 10 % du capital, sauf paramètre produit versionné différent.
4. L'épargne obligatoire standard est fixée à 5 % du capital, répartie sur les échéances, sauf paramètre produit versionné différent.
5. La garantie peut être mobilisée uniquement après défaut, décision humaine motivée et expiration du délai de régularisation.
6. Le retard commence à J+1 ; les trois premiers jours constituent un délai de grâce sans pénalité.
7. À partir de J+4, la pénalité est de 0,03 % par jour sur le principal échu restant, sans capitalisation, avec un plafond de 5 % du principal concerné.
8. Une mise en demeure est émise à J+30.
9. Le client dispose ensuite de 15 jours calendaires pour régulariser.
10. L'exigibilité anticipée peut être décidée humainement à partir de J+45.
11. Le défaut définitif intervient au plus tard à J+90, sous décision humaine.

### Langues, signature et juridiction

1. L'espace client est disponible en français et en anglais.
2. Le back-office reste en français.
3. Le portugais juridique pour la Guinée-Bissau n'est pas dans le périmètre de la V1.
4. La signature par PIN ou OTP est acceptée comme mécanisme V1 et gérée en interne.
5. La preuve de signature comprend au minimum le document signé, son hash, sa version, l'identité du signataire, la méthode et l'horodatage.
6. Les litiges relèvent des instances juridiques compétentes du pays déclaré du client.
7. La V1 utilise un formulaire général de consentement commun aux huit États.
8. Le consentement marketing reste séparé et facultatif.

## Conséquences

### Positives

- Un seul modèle comptable et contractuel sert les huit pays.
- Les paramètres commerciaux peuvent évoluer sans redéploiement.
- Chaque prêt conserve les conditions exactes acceptées à sa création.
- Les risques de double mouvement sont limités par une confirmation serveur manuelle et idempotente.
- Le nombre réduit de rôles et de produits accélère la validation interne.

### Risques acceptés pour la V1

- L'administrateur global est un point unique d'opération et de continuité.
- L'application ne modélise pas les entités juridiques ni agréments nationaux.
- La V1 ne contient pas de clauses nationales détaillées ni de portugais.
- Le formulaire de consentement est général et non spécifique par pays.
- La validité juridique du mécanisme PIN/OTP est considérée comme une hypothèse interne validée par le porteur produit.

### Garde-fous obligatoires

- Aucun changement de produit ne s'applique rétroactivement.
- Aucun prêt ne peut être signé si le coût effectif dépasse le plafond applicable.
- Aucun changement de taux, frais, minimum ou maximum ne contourne les contrôles serveur.
- Chaque action financière sensible exige un motif, une réauthentification et un audit.
- Toute décision automatique défavorable doit être confirmée par l'administrateur.

## Alternatives écartées

- Un administrateur par institution ou pays : reporté après la V1.
- Des rôles distincts caisse, crédit, validation et audit : reportés après la V1.
- Des contrats et consentements propres à chaque État : reportés après la V1.
- Une langue portugaise spécifique à la Guinée-Bissau : reportée après la V1.
- Une approbation ou un décaissement entièrement automatique : écarté.
- Une tarification pouvant dépasser 20 % avec dérogation manuelle : écartée.
- Des frais de remboursement anticipé : écartés.

## Suivi d'implémentation

Les exigences détaillées, contrôles, événements d'audit et scénarios d'acceptation se trouvent dans [`docs/business-rules-v1.md`](../business-rules-v1.md). Le moteur de document est spécifié dans [`docs/contracts/dynamic-loan-contract-v1.md`](../contracts/dynamic-loan-contract-v1.md).
