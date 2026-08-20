# Règles métier V1

Ce document est la source canonique des règles métier validées pour la V1 interne de Microfinance v2.1.

| Élément          | Décision                                                        |
| ---------------- | --------------------------------------------------------------- |
| Statut métier    | Validé à 100 %                                                  |
| Statut technique | À implémenter ou vérifier règle par règle                       |
| Zone             | UMOA : BJ, BF, CI, GW, ML, NE, SN, TG                           |
| Devise           | XOF uniquement                                                  |
| Utilisateurs V1  | Client et un administrateur global                              |
| Distribution     | Validation interne, non publique                                |
| ADR              | [`ADR 0002`](adr/0002-cadre-metier-credit-v1-umoa.md)           |
| Contrats         | [`Contrat dynamique V1`](contracts/dynamic-loan-contract-v1.md) |

> [!WARNING]
> Les paramètres de ce document sont des décisions produit. Le code, la base et les tests doivent encore prouver leur application. Une règle absente du code n'est pas réputée livrée parce qu'elle est documentée ici.

## 1. Territoire, devise et temps local

### 1.1 Pays couverts

La V1 accepte les clients dont le pays déclaré appartient à la liste fermée suivante :

| Code | Pays          | Fuseau de traitement |
| ---- | ------------- | -------------------- |
| `BJ` | Bénin         | `Africa/Porto-Novo`  |
| `BF` | Burkina Faso  | `Africa/Ouagadougou` |
| `CI` | Côte d'Ivoire | `Africa/Abidjan`     |
| `GW` | Guinée-Bissau | `Africa/Bissau`      |
| `ML` | Mali          | `Africa/Bamako`      |
| `NE` | Niger         | `Africa/Niamey`      |
| `SN` | Sénégal       | `Africa/Dakar`       |
| `TG` | Togo          | `Africa/Lome`        |

Le fuseau est dérivé du pays du client ou de l'opération. `Africa/Abidjan` ne doit plus servir de valeur universelle pour les règles horaires.

### 1.2 Devise

- `XOF` est la seule devise autorisée.
- Les montants sont stockés en entiers signés 64 bits.
- Aucune décimale FCFA n'est acceptée.
- Le format d'affichage est `100 000 FCFA`.
- Une valeur négative est interdite pour les demandes, frais, soldes bloqués et échéances.
- Les conversions de devise ne font pas partie de la V1.

## 2. Modèle opérationnel

### 2.1 Principe initiation-confirmation

Le client peut initier une demande, mais aucune déclaration ne produit seule un mouvement comptable.

| Demande              | Initiation     | Confirmation   | Mouvement au moment de la confirmation |
| -------------------- | -------------- | -------------- | -------------------------------------- |
| Dépôt                | Client         | Administrateur | Crédit du sous-compte prévu            |
| Retrait Mobile Money | Client         | Administrateur | Débit du wallet et levée de la réserve |
| Virement bancaire    | Client         | Administrateur | Débit du wallet et levée de la réserve |
| Remboursement        | Client         | Administrateur | Affectation à la dette et à l'épargne  |
| Décaissement         | Administrateur | Administrateur | Création du prêt et mise à disposition |

Chaque confirmation doit être :

- exécutée côté serveur ;
- atomique ;
- idempotente ;
- conditionnée au statut courant ;
- liée à une clé d'idempotence ;
- accompagnée d'une référence externe lorsque le canal l'exige ;
- enregistrée dans l'audit.

### 2.2 Administrateur global

La V1 autorise un seul profil `admin` actif à la fois. Il agit comme agent unique pour toutes les opérations internes.

L'administrateur ne peut pas :

- se désactiver lui-même ;
- se rétrograder lui-même ;
- contourner les plafonds tarifaires ;
- modifier un contrat signé ;
- confirmer deux fois la même demande ;
- supprimer ou altérer l'audit.

Une action sensible exige une session active, une réauthentification et un motif. Le remplacement de l'administrateur suit le runbook [`amorcer-chef-agence.md`](runbooks/amorcer-chef-agence.md).

## 3. Catalogue de produits

### 3.1 Produits V1

La V1 contient exactement deux produits :

| Produit         | Valeurs initiales recommandées                 | Paramétrable |
| --------------- | ---------------------------------------------- | ------------ |
| Prêt Essentiel  | 50 000–300 000 FCFA, 3–6 mois, 1 %/mois        | Oui          |
| Prêt Croissance | 100 000–1 500 000 FCFA, 6–12 mois, 1,25 %/mois | Oui          |

Les valeurs initiales servent à amorcer le pilote. Les valeurs effectivement actives sont celles de la version publiée du produit.

### 3.2 Paramètres modifiables

- nom et description ;
- statut actif/inactif ;
- montant minimum ;
- montant maximum ;
- durée minimum ;
- durée maximum ;
- liste des durées permises ;
- taux périodique ;
- frais de dossier fixes et proportionnels ;
- frais de gestion fixes et proportionnels ;
- assurance, uniquement lorsqu'elle est réellement applicable ;
- taux de garantie ;
- taux d'épargne obligatoire ;
- délai de grâce ;
- taux et plafond de pénalité ;
- critères et documents d'éligibilité ;
- date de prise d'effet.

### 3.3 Paramètres verrouillés

- devise XOF ;
- mensualités constantes ;
- intérêts sur capital restant dû ;
- plafond interne de coût effectif à 20 % ;
- interdiction d'une modification rétroactive ;
- interdiction d'un second prêt vivant ;
- remboursement anticipé sans frais ;
- contrôle humain pour toute décision sensible.

### 3.4 Cycle de version

Un produit suit les statuts :

```text
DRAFT → VALIDATED → SCHEDULED → ACTIVE → RETIRED
```

Règles :

1. Une modification crée une nouvelle version.
2. Une version active est immuable.
3. La nouvelle version possède une date d'effet future.
4. Le délai d'effet par défaut est de 24 heures.
5. Une simulation automatique couvre les cas extrêmes avant validation.
6. L'administrateur se réauthentifie pour publier.
7. Le motif et les valeurs avant/après sont audités.
8. La désactivation empêche les nouvelles offres, sans affecter les prêts existants.

## 4. Coût effectif et plafond

### 4.1 Plafonds

- plafond interne : 20 % par an ;
- plafond réglementaire de référence : 24 % par an ;
- plafond applicable : `min(plafond_interne, plafond_réglementaire_configuré)` ;
- aucune dérogation manuelle dans l'application.

### 4.2 Coûts à intégrer

Le calcul inclut tout paiement obligatoire nécessaire à l'obtention du prêt :

- intérêts ;
- frais de dossier ;
- frais de gestion ;
- assurance obligatoire ;
- commission obligatoire ;
- autre coût imposé au client.

La garantie remboursable et l'épargne obligatoire récupérable sont affichées séparément. Elles ne sont pas automatiquement comptabilisées comme coût, mais leur traitement doit rester configurable si une validation réglementaire impose leur inclusion.

### 4.3 Calcul

Le coût effectif annualisé est déterminé à partir des flux datés réels :

- décaissement net reçu par le client ;
- frais prélevés au décaissement ;
- échéances datées ;
- autres paiements obligatoires.

Une simple formule `coût total / capital` ne suffit pas. Le calcul doit rechercher le taux qui égalise la valeur actualisée du décaissement et celle des remboursements, puis l'annualiser selon la convention approuvée.

### 4.4 Moments de contrôle

Le plafond est vérifié :

1. lors de la validation d'une version produit ;
2. pour les montants minimum et maximum ;
3. pour les durées minimum et maximum ;
4. sur les combinaisons intermédiaires générant le coût le plus élevé ;
5. lors de chaque simulation client ;
6. lors de l'approbation ;
7. avant génération du contrat ;
8. avant décaissement.

Si le coût dépasse le plafond, l'opération échoue avec un code métier stable et ne peut pas être contournée par l'interface.

## 5. Éligibilité et prêt vivant

### 5.1 Conditions minimales

- client actif ;
- email vérifié ;
- PIN configuré ;
- KYC validé ;
- document d'identité valide ;
- aucun prêt `ACTIVE` ou `DEFAULTED` ;
- aucune demande ouverte concurrente ;
- montant et durée dans la version active du produit ;
- capacité de remboursement documentée ;
- contrat non expiré et accepté.

### 5.2 Capacité de remboursement

- aucune approbation automatique en V1 ;
- la mensualité ne doit pas dépasser 30 % du revenu disponible vérifié ;
- les revenus irréguliers utilisent une moyenne prudente des trois derniers mois ;
- les autres dettes déclarées sont prises en compte ;
- une dérogation exige un motif explicite et un audit ;
- l'administrateur reste responsable de la décision finale.

### 5.3 Un seul prêt vivant

Un prêt vivant possède un statut `ACTIVE` ou `DEFAULTED`. La contrainte est vérifiée dans la transaction de création, avec verrouillage empêchant deux demandes concurrentes de produire deux prêts.

## 6. Simulation et échéancier

### 6.1 Méthode

- mensualités constantes ;
- intérêts sur capital restant dû ;
- périodicité mensuelle ;
- taux périodique exprimé en fraction dans le moteur ;
- échéancier définitif généré au décaissement à partir de l'offre signée.

### 6.2 Arrondis

- chaque composante monétaire est arrondie à l'unité FCFA ;
- la somme des principaux doit égaler exactement le capital ;
- la dernière échéance absorbe l'écart cumulé ;
- le total contractuel doit égaler la somme des échéances ;
- un changement de produit ne regénère jamais un échéancier existant.

### 6.3 Affectation d'un paiement

Chaque paiement est affecté dans l'ordre :

1. pénalités échues ;
2. intérêts échus ;
3. frais échus ;
4. principal échu ;
5. épargne obligatoire.

Le reçu détaille la ventilation exacte.

## 7. Garantie et épargne obligatoire

### 7.1 Garantie

- valeur standard : 10 % du capital ;
- montant calculé et figé dans l'offre ;
- constitution depuis l'épargne libre autorisée ;
- blocage partiel autorisé, avec solde restant à déposer ;
- fonds appartenant au client mais indisponibles pendant le prêt ;
- aucune mobilisation automatique sur simple retard.

### 7.2 Mobilisation après défaut

La mobilisation exige :

- au moins 30 jours de retard ;
- mise en demeure envoyée ;
- délai supplémentaire de 15 jours expiré ;
- prêt déclaré `DEFAULTED` par décision humaine ;
- dette recalculée dans la transaction ;
- motif obligatoire ;
- notification du client ;
- événement d'audit.

Ordre d'affectation de la garantie : pénalités, intérêts, frais, principal. Le prélèvement est plafonné à la dette. Le surplus reste bloqué jusqu'à la clôture ou est restitué selon la décision de clôture. La même garantie ne peut être mobilisée deux fois.

### 7.3 Épargne obligatoire

- valeur standard : 5 % du capital ;
- répartie sur l'échéancier ;
- propriété du client ;
- affichée séparément du coût du crédit ;
- non mobilisée automatiquement pour couvrir un défaut ;
- libérée à la clôture si aucune obligation ne subsiste.

## 8. Retard, régularisation et défaut

| Moment            | Statut/action        | Règle                                     |
| ----------------- | -------------------- | ----------------------------------------- |
| Jour d'échéance   | `DUE`                | Rappel au client                          |
| J+1               | `LATE`               | Retard constaté, sans pénalité immédiate  |
| J+1 à J+3         | Grâce                | Aucune pénalité                           |
| J+4               | Pénalité             | 0,03 %/jour sur le principal échu restant |
| J+7               | Suivi renforcé       | Notification et revue humaine             |
| J+30              | Mise en demeure      | Début du délai formel de régularisation   |
| J+45              | Exigibilité possible | Décision humaine motivée                  |
| J+90 au plus tard | `DEFAULTED`          | Décision et traitement final              |

La pénalité :

- n'est pas capitalisée ;
- ne porte pas sur les intérêts, frais ou pénalités ;
- est plafonnée à 5 % du principal concerné ;
- s'arrête au paiement, au plafond ou à la restructuration ;
- peut être remise uniquement par décision motivée et auditée.

L'exigibilité anticipée n'est jamais automatique. L'administrateur peut accorder un délai, accepter un paiement partiel, restructurer, suspendre une pénalité, déclarer le défaut ou mobiliser la garantie.

## 9. Remboursement anticipé

### 9.1 Remboursement total

Montant à payer :

```text
principal restant
+ intérêts courus
+ frais déjà exigibles
+ pénalités déjà acquises
```

Les intérêts futurs ne sont pas facturés. Après confirmation atomique, le prêt est clôturé et les fonds bloqués sont libérés.

### 9.2 Remboursement partiel

- aucun frais ;
- application aux montants échus puis au principal ;
- mensualité régulière inchangée ;
- réduction de la durée ;
- nouvel échéancier généré et confirmé par PIN ;
- conservation de l'ancien échéancier et du motif de remplacement.

## 10. Clôture

Le prêt peut être clôturé uniquement lorsque :

- principal restant = 0 ;
- intérêts échus = 0 ;
- frais échus = 0 ;
- pénalités échues = 0 ;
- toutes les échéances sont réglées ;
- épargne obligatoire constituée ;
- aucune demande de remboursement n'est en traitement.

La libération de la garantie et de l'épargne obligatoire s'exécute dans la même transaction que la clôture.

## 11. Dépôts, retraits et virements

### 11.1 Dépôts

- demande disponible à toute heure ;
- montant, motif, canal, référence, preuve et certification obligatoires ;
- aucun crédit avant confirmation ;
- détection de doublon sur référence, montant, canal et date ;
- rejet motivé.

### 11.2 Retraits Mobile Money

- soumission disponible 24 h/24 ;
- exécution du lundi au samedi, de 8 h à 19 h dans le fuseau du pays ;
- demande reçue avant 17 h : objectif de traitement le jour même ;
- demande reçue après 17 h : prochain jour ouvré ;
- réserve créée dès la demande ;
- annulation client autorisée tant que `PENDING` ;
- rejet ou annulation libérant obligatoirement la réserve.

### 11.3 Virements bancaires

- délai communiqué : 24 à 48 heures ouvrées ;
- pays, banque, titulaire, code banque, compte et IBAN séparés ;
- coordonnées masquées hors écrans nécessaires ;
- référence bancaire obligatoire avant `EXECUTED`.

### 11.4 Frais de pilote

- frais applicatifs de retrait : 0 FCFA ;
- frais applicatifs de virement : 0 FCFA ;
- frais opérateur réels affichés séparément ;
- aucun frais caché ni estimation non confirmée.

## 12. KYC fondé sur le risque

### 12.1 Pièces et conditions

- âge minimum : 18 ans ;
- CNI ou passeport valide ;
- permis accepté uniquement si le paramètre interne l'autorise ;
- recto/verso pour une carte ;
- page d'identité pour un passeport ;
- selfie de vérification ;
- justificatif d'adresse selon le risque ;
- justificatif de revenu ou d'activité pour un prêt.

### 12.2 Classification

Chaque client est classé `LOW`, `MEDIUM` ou `HIGH` selon :

- présence physique ou parcours à distance ;
- cohérence documentaire ;
- pays et zone d'activité ;
- profession et activité ;
- revenus et patrimoine déclarés ;
- volume et nature des opérations ;
- origine et destination des fonds ;
- comportement inhabituel ;
- statut PEP ou présence sur une liste de sanctions.

Un doute déclenche une revue humaine. Si les éléments à distance sont insuffisants, l'administrateur demande un complément ou une vérification en présentiel.

### 12.3 Mise à jour

- risque faible : tous les trois ans ;
- risque moyen : tous les deux ans ;
- risque élevé ou PEP : chaque année ;
- révision immédiate en cas d'expiration, changement significatif ou opération atypique.

## 13. Langues

- client : français et anglais ;
- langue par défaut : français ;
- détection initiale `Accept-Language` ;
- choix du profil prioritaire et persistant ;
- back-office : français ;
- repli de traduction : français ;
- portugais ignoré pour la V1, y compris en Guinée-Bissau ;
- contrats générables en français ou anglais ;
- aucun texte juridique généré par traduction automatique.

## 14. Notifications

Les changements de statut visibles produisent une notification in-app. Un email est également envoyé pour : vérification, récupération de compte, décision KYC, décision de prêt, décaissement, échéance, retard, opération confirmée, clôture et effacement.

Rappels de prêt : J-3, jour J, J+1, J+4, J+7 et J+30.

Interdictions :

- aucune pièce KYC en pièce jointe ;
- aucun PIN ou mot de passe ;
- données de compte masquées ;
- OTP isolé et supprimé après expiration ;
- marketing sans consentement séparé.

## 15. Consentement et signature

### 15.1 Consentement général

Le client confirme séparément qu'il :

- fournit des informations exactes ;
- accepte la vérification de son identité ;
- a consulté la fiche financière ;
- comprend montant, durée, intérêts et frais ;
- a consulté l'échéancier ;
- comprend garantie, épargne et pénalités ;
- accepte la signature PIN/OTP ;
- accepte les notifications nécessaires ;
- accepte le traitement nécessaire de ses données ;
- a reçu une copie durable du contrat.

Le même formulaire est utilisé dans les huit pays. Le consentement marketing n'est jamais précoché et ne conditionne pas le prêt.

### 15.2 Preuve PIN/OTP

La signature V1 est réputée acceptée en interne lorsqu'elle conserve :

- identifiant du contrat ;
- version ;
- hash du document ;
- identifiant du client ;
- méthode PIN ou OTP ;
- horodatage serveur ;
- résultat de vérification ;
- IP et informations techniques raisonnablement nécessaires ;
- reçu remis au client.

Le PIN et l'OTP eux-mêmes ne sont jamais inscrits dans la preuve.

## 16. Conservation et effacement

| Donnée                         | Durée V1                          |
| ------------------------------ | --------------------------------- |
| Upload temporaire non finalisé | 24 heures                         |
| Inscription non vérifiée       | 30 jours                          |
| Brouillon KYC abandonné        | 90 jours                          |
| KYC d'une relation active      | Relation + 10 ans                 |
| Pièces d'opération             | Fin de l'exercice + 10 ans        |
| Écritures et audit financier   | 10 ans                            |
| Logs techniques non financiers | 12 mois                           |
| OTP/challenge expiré           | 24 heures maximum                 |
| Corps d'email livré            | 30 jours, puis métadonnées seules |
| Sauvegardes                    | 35 jours glissants                |

Une demande d'effacement exige une réauthentification, reçoit un accusé immédiat et vise un traitement sous 30 jours. Les données soumises à conservation sont isolées ; les autres données sont anonymisées et les fichiers sont supprimés via l'API Storage.

## 17. Litiges

La clause commune est :

> Le contrat est soumis aux règles applicables dans le pays de résidence déclaré de l'emprunteur. Les parties recherchent d'abord une résolution amiable. À défaut, le différend relève des instances de médiation ou juridictions compétentes de ce pays.

La V1 ne maintient pas de catalogue détaillé des autorités par pays.

## 18. Audit minimum

Doivent être audités avec auteur, date, motif, corrélation et valeurs avant/après :

- publication d'un produit ;
- changement de taux ou frais ;
- approbation ou rejet d'un prêt ;
- décaissement ;
- confirmation/rejet d'une opération ;
- remise de pénalité ;
- exigibilité anticipée ;
- déclaration de défaut ;
- mobilisation de garantie ;
- remboursement anticipé ;
- clôture ;
- changement de rôle/statut ;
- traitement d'une demande d'effacement.

## 19. Critères d'acceptation globaux

La politique est considérée comme implémentée uniquement si :

1. les contrôles sensibles existent côté serveur ;
2. les cas concurrents sont testés ;
3. aucun changement produit n'affecte un prêt existant ;
4. les flux financiers sont atomiques et idempotents ;
5. le coût effectif est testé sur toutes les bornes ;
6. la preuve contractuelle est immuable ;
7. les décisions humaines et leurs motifs sont auditables ;
8. les tests reconstruisent la base depuis zéro dans GitHub Actions.

## Documents liés

- [`ADR 0001 — Modèle d'accès`](adr/0001-modele-acces-deux-roles.md)
- [`ADR 0002 — Cadre métier`](adr/0002-cadre-metier-credit-v1-umoa.md)
- [`Contrats de prêt dynamiques`](contracts/dynamic-loan-contract-v1.md)
- [`ROADMAP.md`](../ROADMAP.md)
