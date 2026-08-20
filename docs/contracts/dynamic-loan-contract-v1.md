# Contrat de prêt dynamique V1

Cette spécification définit la génération, la validation, la signature et la conservation des contrats de prêt de la V1 interne.

| Élément            | Valeur                                                 |
| ------------------ | ------------------------------------------------------ |
| Statut métier      | Validé à 100 %                                         |
| Statut technique   | Planifié ; à confronter à l'implémentation             |
| Contrat            | Modèle maître commun UMOA                              |
| Pays               | Variable issue du profil client                        |
| Devise             | XOF                                                    |
| Langues            | Français et anglais                                    |
| Signature          | PIN ou OTP                                             |
| Juridiction        | Instances compétentes du pays du client                |
| Règles financières | [`docs/business-rules-v1.md`](../business-rules-v1.md) |

> [!IMPORTANT]
> Le contrat signé est un instantané immuable. Il ne relit jamais les paramètres courants d'un produit pour calculer une obligation existante.

## 1. Objectifs

Le moteur contractuel doit :

- générer un document cohérent avec l'offre approuvée ;
- afficher tous les coûts et montants récupérables ;
- empêcher la signature d'une offre invalide ;
- conserver la version exacte acceptée ;
- produire une preuve technique de signature ;
- permettre une génération française ou anglaise ;
- conserver l'historique des avenants et échéanciers ;
- produire un PDF lisible, imprimable et durable.

Le moteur ne gère pas en V1 :

- l'identité détaillée des entités prêteuses par pays ;
- les numéros d'agrément nationaux ;
- les annexes juridiques détaillées par État ;
- le portugais ;
- un catalogue d'autorités de médiation ;
- une signature électronique qualifiée externe.

Ces données peuvent être injectées depuis la configuration interne lorsqu'elles sont disponibles, mais elles ne bloquent pas la validation interne de la V1.

## 2. Architecture documentaire

Un dossier contractuel comporte :

1. une fiche précontractuelle ;
2. les conditions particulières ;
3. les conditions générales communes ;
4. l'échéancier accepté ;
5. la notice générale de traitement des données ;
6. le formulaire de consentement ;
7. le reçu de signature ;
8. tout avenant ultérieur ;
9. le relevé de clôture.

Chaque élément possède :

- un identifiant stable ;
- un numéro de version ;
- une langue ;
- une date de génération ;
- un hash SHA-256 ;
- un statut ;
- un lien vers le prêt ou la demande ;
- une politique de conservation.

## 3. Sources de données

Le contrat est assemblé à partir de quatre instantanés.

### 3.1 Instantané client

- identifiant interne ;
- nom complet ;
- date de naissance ;
- pays de résidence ;
- adresse ;
- email ;
- téléphone ;
- type de pièce ;
- numéro masqué ;
- statut KYC ;
- langue préférée.

Une modification future du profil ne réécrit pas le contrat signé.

### 3.2 Instantané produit

- identifiant et version du produit ;
- nom ;
- taux ;
- méthode d'amortissement ;
- frais ;
- garantie ;
- épargne obligatoire ;
- pénalité ;
- bornes de montant et de durée ;
- date d'effet.

### 3.3 Instantané offre

- montant demandé ;
- montant approuvé ;
- durée ;
- canal de décaissement ;
- coût effectif ;
- coût total ;
- échéancier ;
- date limite d'acceptation ;
- conditions préalables ;
- documents complémentaires.

### 3.4 Instantané système

- numéro de contrat ;
- version du modèle ;
- langue ;
- pays ;
- plafond interne ;
- plafond réglementaire configuré ;
- horodatage serveur ;
- identifiant de corrélation.

## 4. États du contrat

```text
DRAFT
→ GENERATED
→ PRESENTED
→ SIGNED
→ EFFECTIVE
→ CLOSED
```

États alternatifs :

- `EXPIRED` : offre non signée avant sa date limite ;
- `REJECTED` : client refuse l'offre ;
- `VOIDED` : contrat invalidé avant décaissement par une décision auditée ;
- `SUPERSEDED` : document remplacé par un avenant ;
- `TERMINATED` : contrat terminé après défaut ou autre cause contractuelle.

Transitions :

| Depuis      | Vers         | Condition                                        |
| ----------- | ------------ | ------------------------------------------------ |
| `DRAFT`     | `GENERATED`  | Validation complète de l'offre                   |
| `GENERATED` | `PRESENTED`  | PDF et hash créés                                |
| `PRESENTED` | `SIGNED`     | Consentements et PIN/OTP valides                 |
| `SIGNED`    | `EFFECTIVE`  | Décaissement confirmé                            |
| `PRESENTED` | `EXPIRED`    | Date limite dépassée                             |
| `PRESENTED` | `REJECTED`   | Refus explicite du client                        |
| `SIGNED`    | `VOIDED`     | Annulation avant décaissement, motif obligatoire |
| `EFFECTIVE` | `CLOSED`     | Toutes les obligations sont soldées              |
| `EFFECTIVE` | `TERMINATED` | Procédure de défaut achevée                      |

## 5. Contrôles avant génération

La génération est refusée si une seule condition échoue :

- client actif ;
- KYC validé ;
- produit actif à la date de l'offre ;
- montant dans les bornes ;
- durée dans les bornes ;
- aucun prêt vivant ;
- aucune offre signée concurrente ;
- coût effectif inférieur ou égal au plafond applicable ;
- échéancier équilibré ;
- somme du principal égale au capital ;
- coût total égal à la somme des composantes ;
- garantie et épargne cohérentes ;
- offre non expirée ;
- langue prise en charge ;
- pays membre de l'UMOA.

Formule de plafond :

```text
applicable_cost_cap = min(internal_cost_cap, configured_regulatory_cap)
effective_annual_cost <= applicable_cost_cap
```

La V1 fixe `internal_cost_cap` à 20 % et la référence réglementaire à 24 %.

## 6. Variables obligatoires

### 6.1 Identité du contrat

```text
contract_id
contract_number
contract_version
template_version
contract_language
generated_at
expires_at
country_code
currency_code
```

### 6.2 Parties

```text
lender_display_name
lender_internal_reference
borrower_id
borrower_full_name
borrower_birth_date
borrower_address
borrower_country
borrower_email
borrower_phone_masked
identity_type
identity_number_masked
```

### 6.3 Produit et offre

```text
product_id
product_version
product_name
loan_purpose
requested_principal
approved_principal
term_months
installment_count
monthly_interest_rate
nominal_annual_rate
effective_annual_cost
internal_cost_cap
regulatory_cost_cap
```

### 6.4 Frais et totaux

```text
processing_fee_flat
processing_fee_rate
management_fee_flat
management_fee_rate
insurance_fee
other_mandatory_fees
total_fees
total_interest
total_credit_cost
total_repayment
regular_installment
```

### 6.5 Garantie et épargne

```text
guarantee_rate
guarantee_amount
mandatory_savings_rate
mandatory_savings_total
guarantee_funded_amount
guarantee_remaining_amount
```

### 6.6 Dates et pénalités

```text
planned_disbursement_date
first_due_date
last_due_date
grace_period_days
late_penalty_daily_rate
late_penalty_cap_rate
formal_notice_after_days
cure_period_days
acceleration_eligible_after_days
default_no_later_than_days
```

### 6.7 Signature

```text
signature_method
signature_timestamp
signature_verification_id
document_sha256
signer_user_id
signer_ip
signer_user_agent
consent_receipt_id
```

Les secrets PIN et OTP sont strictement interdits dans ces données.

## 7. Conditions particulières proposées

### Page de garde

```text
CONTRAT DE PRÊT N° {{contract_number}}

Prêteur : {{lender_display_name}}
Référence interne : {{lender_internal_reference}}

Emprunteur : {{borrower_full_name}}
Pays : {{borrower_country}}
Pièce : {{identity_type}} — {{identity_number_masked}}

Produit : {{product_name}} — version {{product_version}}
Devise : XOF
```

### Fiche financière

| Élément                 |                             Valeur |
| ----------------------- | ---------------------------------: |
| Capital accordé         |      `{{approved_principal}} FCFA` |
| Durée                   |             `{{term_months}} mois` |
| Nombre d'échéances      |            `{{installment_count}}` |
| Taux mensuel            |      `{{monthly_interest_rate}} %` |
| Taux annuel nominal     |        `{{nominal_annual_rate}} %` |
| Coût effectif annualisé |      `{{effective_annual_cost}} %` |
| Plafond interne         |          `{{internal_cost_cap}} %` |
| Frais totaux            |              `{{total_fees}} FCFA` |
| Intérêts totaux         |          `{{total_interest}} FCFA` |
| Coût total du crédit    |       `{{total_credit_cost}} FCFA` |
| Total à rembourser      |         `{{total_repayment}} FCFA` |
| Mensualité régulière    |     `{{regular_installment}} FCFA` |
| Garantie bloquée        |        `{{guarantee_amount}} FCFA` |
| Épargne obligatoire     | `{{mandatory_savings_total}} FCFA` |
| Première échéance       |               `{{first_due_date}}` |
| Dernière échéance       |                `{{last_due_date}}` |

Les lignes à zéro restent affichées avec `0 FCFA`. Un coût obligatoire ne doit jamais être masqué.

## 8. Conditions générales proposées

### Article 1 — Objet

> Le prêteur accorde à l'emprunteur un prêt de `{{approved_principal}} FCFA` destiné à `{{loan_purpose}}`, aux conditions particulières et générales du présent contrat.

### Article 2 — Conditions préalables

Le décaissement exige : KYC valide, compte actif, offre non expirée, absence de prêt vivant, documents requis, garantie constituée, contrat signé et confirmation humaine finale.

L'approbation ne vaut pas décaissement. Le contrat devient effectif à la confirmation du décaissement.

### Article 3 — Mise à disposition

> Après satisfaction des conditions préalables, les fonds sont mis à disposition par le canal indiqué dans l'offre. Le décaissement est confirmé par une référence interne ou externe unique.

### Article 4 — Intérêts et amortissement

> Les intérêts sont calculés sur le capital restant dû. Le remboursement s'effectue par mensualités constantes. Les montants sont arrondis à l'unité FCFA et la dernière échéance absorbe les écarts d'arrondi.

Le taux et l'échéancier signés ne changent pas lorsque le produit est reconfiguré.

### Article 5 — Frais

Chaque frais est affiché séparément. Un frais nul apparaît comme `0 FCFA`. Aucun frais non présent dans le contrat ne peut être débité.

### Article 6 — Échéancier

L'échéancier annexé détaille pour chaque période : date, principal, intérêts, frais, épargne obligatoire, total et capital restant.

### Article 7 — Affectation des paiements

> Les paiements sont affectés successivement aux pénalités échues, intérêts échus, frais échus, principal échu puis épargne obligatoire.

### Article 8 — Remboursement anticipé

> L'emprunteur peut rembourser tout ou partie du prêt avant son terme, sans frais ni pénalité de remboursement anticipé. Les intérêts futurs non courus ne sont pas dus.

Un remboursement partiel maintient la mensualité et réduit la durée. Le nouvel échéancier remplace le précédent pour l'avenir sans supprimer l'historique.

### Article 9 — Retard

> Une échéance impayée est en retard dès le lendemain de sa date. Aucun frais de retard n'est appliqué pendant trois jours calendaires. À compter du quatrième jour, une pénalité de 0,03 % par jour est calculée uniquement sur le principal échu non réglé, sans capitalisation, dans la limite de 5 % de ce principal.

### Article 10 — Régularisation et exigibilité anticipée

> Après 30 jours consécutifs de retard, une mise en demeure est adressée à l'emprunteur. Celui-ci dispose de 15 jours calendaires pour régulariser. À défaut, l'administrateur peut, après examen humain et décision motivée, déclarer les sommes restantes exigibles. Le défaut définitif intervient au plus tard à 90 jours.

### Article 11 — Garantie

> La garantie de `{{guarantee_amount}} FCFA` reste la propriété de l'emprunteur mais demeure indisponible pendant le prêt. Elle ne peut être mobilisée qu'après défaut, expiration du délai de régularisation, décision humaine motivée et notification.

La mobilisation ne dépasse pas la dette réelle et suit l'ordre pénalités, intérêts, frais, principal. Tout surplus reste la propriété du client.

### Article 12 — Épargne obligatoire

> L'emprunteur constitue une épargne obligatoire totale de `{{mandatory_savings_total}} FCFA` selon l'échéancier. Cette somme demeure sa propriété, est distincte du coût du crédit et est libérée à la clôture lorsque toutes les obligations sont satisfaites.

L'épargne obligatoire n'est pas automatiquement mobilisée en cas de défaut.

### Article 13 — Clôture

Le prêt est clôturé lorsque principal, intérêts, frais et pénalités sont soldés, que l'épargne contractuelle est constituée et qu'aucune opération n'est en traitement. La clôture libère la garantie et l'épargne dans une transaction unique.

### Article 14 — Obligations du prêteur

Le prêteur présente tous les coûts, conserve les versions signées, remet un reçu, protège les données, notifie les changements, traite les réclamations et ne modifie pas rétroactivement le contrat.

### Article 15 — Obligations de l'emprunteur

L'emprunteur fournit des informations exactes, protège ses identifiants, signale les anomalies, utilise le prêt pour l'objet déclaré et respecte l'échéancier.

### Article 16 — Données

Les données sont traitées pour l'identification, l'analyse, l'exécution, la sécurité, l'audit, la notification et la conservation des preuves. Les modalités détaillées figurent dans la notice annexée.

### Article 17 — Réclamations et litiges

> Les parties recherchent d'abord une résolution amiable. À défaut, le différend relève des instances de médiation ou juridictions compétentes du pays de résidence déclaré de l'emprunteur.

### Article 18 — Signature

> Le client accepte le contrat au moyen de son PIN ou d'un OTP après présentation de la fiche financière, de l'échéancier et des consentements. Une copie durable et un reçu de signature lui sont remis.

## 9. Blocs conditionnels

| Condition                      | Bloc affiché                              |
| ------------------------------ | ----------------------------------------- |
| `guarantee_amount > 0`         | Constitution et mobilisation de garantie  |
| `mandatory_savings_total > 0`  | Épargne obligatoire                       |
| `insurance_fee > 0`            | Assurance, couverture et coût             |
| Documents additionnels         | Liste des conditions préalables           |
| KYC renforcé                   | Mention de contrôle humain complémentaire |
| Remboursement anticipé partiel | Avenant et nouvel échéancier              |
| Contrat anglais                | Modèle anglais approuvé correspondant     |

Un bloc conditionnel ne peut pas supprimer une information financière obligatoire. Les zéros restent visibles dans la fiche financière.

## 10. Consentements

Avant la signature, le client coche séparément :

1. exactitude des informations ;
2. vérification d'identité ;
3. lecture de la fiche financière ;
4. compréhension des taux et frais ;
5. consultation de l'échéancier ;
6. compréhension de la garantie ;
7. compréhension de l'épargne obligatoire ;
8. compréhension des pénalités ;
9. acceptation de la signature PIN/OTP ;
10. acceptation des notifications nécessaires ;
11. réception d'une copie durable.

Le consentement au traitement strictement nécessaire est distingué des préférences facultatives. Le marketing est séparé, facultatif et non précoché.

## 11. Signature et preuve

### 11.1 Séquence

1. Le serveur valide l'offre.
2. Il génère le PDF et son hash.
3. Le client consulte la fiche et l'échéancier.
4. Le client confirme les consentements.
5. Le client saisit son PIN ou l'OTP.
6. Le serveur vérifie le secret sans l'enregistrer dans le dossier.
7. Le serveur scelle la preuve.
8. Le contrat passe à `SIGNED`.
9. Une copie est rendue disponible au client.

### 11.2 Reçu

Le reçu contient :

- numéro du contrat ;
- version ;
- nom du client ;
- produit ;
- capital ;
- date et heure ;
- méthode de signature ;
- empreinte abrégée du document ;
- identifiant de vérification ;
- moyen d'accéder à la copie.

### 11.3 Immutabilité

- le PDF signé n'est jamais écrasé ;
- le hash est recalculé lors de chaque téléchargement de contrôle ;
- toute divergence déclenche un incident ;
- une correction produit un avenant ;
- les versions antérieures restent accessibles à l'audit.

## 12. Avenants

Un avenant est requis pour :

- restructuration ;
- remboursement anticipé partiel modifiant l'échéancier ;
- report exceptionnel ;
- correction acceptée d'une donnée contractuelle ;
- modification licite d'une condition future.

L'avenant :

- référence le contrat initial ;
- décrit les valeurs avant/après ;
- contient le motif ;
- recalcule le coût effectif si nécessaire ;
- ne modifie pas les mouvements passés ;
- génère un nouvel échéancier ;
- exige une nouvelle signature PIN/OTP.

## 13. Conservation

- contrat et avenants : durée de la relation puis dix ans ;
- preuves de signature : même durée que le contrat ;
- échéanciers remplacés : conservés avec le dossier ;
- copies temporaires de génération : supprimées après scellement ;
- accès : client propriétaire et administrateur actif ;
- téléchargement : URL signée à durée courte ;
- suppression : jamais par suppression directe d'une ligne Storage.

## 14. Audit

Événements minimum :

```text
contract.generated
contract.presented
contract.signed
contract.expired
contract.rejected
contract.voided
contract.effective
contract.amended
contract.closed
contract.terminated
contract.downloaded
contract.integrity_failed
```

Chaque événement contient : contrat, version, acteur, horodatage, corrélation, motif éventuel et hash du document. Les secrets d'authentification sont exclus.

## 15. Erreurs métier

| Code                               | Signification                          |
| ---------------------------------- | -------------------------------------- |
| `CONTRACT_CLIENT_INELIGIBLE`       | Client non éligible                    |
| `CONTRACT_KYC_REQUIRED`            | KYC non validé                         |
| `CONTRACT_LIVING_LOAN_EXISTS`      | Prêt vivant existant                   |
| `CONTRACT_PRODUCT_INACTIVE`        | Version produit inactive               |
| `CONTRACT_AMOUNT_OUT_OF_RANGE`     | Montant hors bornes                    |
| `CONTRACT_TERM_OUT_OF_RANGE`       | Durée hors bornes                      |
| `CONTRACT_EFFECTIVE_COST_EXCEEDED` | Coût supérieur au plafond              |
| `CONTRACT_SCHEDULE_INVALID`        | Échéancier non équilibré               |
| `CONTRACT_OFFER_EXPIRED`           | Offre expirée                          |
| `CONTRACT_SIGNATURE_FAILED`        | PIN/OTP refusé                         |
| `CONTRACT_DOCUMENT_MISMATCH`       | Hash différent                         |
| `CONTRACT_ALREADY_SIGNED`          | Signature idempotente déjà enregistrée |

## 16. Scénarios d'acceptation

### Génération

- montant minimum et durée minimum ;
- montant maximum et durée maximum ;
- frais fixes sur petit montant ;
- coût exactement égal à 20 % ;
- coût supérieur de 0,01 point, refusé ;
- produit reconfiguré après génération, contrat inchangé ;
- prêt vivant existant, génération refusée.

### Signature

- PIN correct ;
- PIN incorrect ;
- PIN verrouillé ;
- OTP correct ;
- OTP expiré ;
- double clic retournant la même preuve ;
- offre expirée entre présentation et signature ;
- document altéré après génération, signature refusée.

### Cycle de vie

- contrat signé puis décaissement ;
- contrat signé puis annulé avant décaissement ;
- remboursement anticipé total ;
- remboursement partiel avec nouvel échéancier ;
- retard J+4 et pénalité ;
- mise en demeure J+30 ;
- exigibilité J+45 sur décision humaine ;
- mobilisation partielle de garantie ;
- clôture et libération des fonds.

### Langues et pays

- génération française dans chacun des huit pays ;
- génération anglaise dans chacun des huit pays ;
- devise toujours XOF ;
- juridiction reprenant le pays du client ;
- fuseau correct pour les dates opérationnelles ;
- absence de portugais acceptée en V1.

## 17. Définition de terminé

Le moteur contractuel est terminé lorsque :

1. les variables proviennent d'instantanés immuables ;
2. tous les contrôles sont serveur-autoritatifs ;
3. le coût effectif ne peut pas dépasser le plafond ;
4. chaque contrat possède un PDF, un hash et une preuve ;
5. PIN/OTP n'apparaît jamais dans les données conservées ;
6. les doubles soumissions sont idempotentes ;
7. les avenants préservent l'historique ;
8. les contrats français et anglais sont testés ;
9. les scénarios financiers et temporels passent en CI ;
10. le client peut retrouver et télécharger sa copie.

## Documents liés

- [`Règles métier V1`](../business-rules-v1.md)
- [`ADR 0002`](../adr/0002-cadre-metier-credit-v1-umoa.md)
- [`PRD`](../../PRD_Microfinance_v2.1.md)
- [`ROADMAP`](../../ROADMAP.md)
