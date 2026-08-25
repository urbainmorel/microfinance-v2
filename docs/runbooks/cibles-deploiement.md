# Contrôle des cibles de déploiement

## Règle absolue Netlify

Ce dépôt n’appartient pas au projet Netlify `monalyz`. Le compte Netlify actuellement connecté dans l’environnement de développement n’est pas autorisé pour cette application.

En conséquence :

- ne jamais exécuter `netlify link`, `netlify deploy` ou une opération de configuration depuis ce compte ;
- ne jamais utiliser le site `monalyz`, son domaine ou son identifiant ;
- ne pas créer un nouveau site sur le compte actuellement connecté ;
- attendre la connexion explicite au compte propriétaire de cette application ;
- obtenir le nom et l’identifiant du site cible auprès du propriétaire avant toute liaison ;
- vérifier l’identité du compte et du site une seconde fois avant le premier déploiement.

Le fichier `netlify.toml` décrit uniquement les paramètres de build. Il ne constitue pas une liaison à un compte ou à un site.

## Cibles Supabase

### Référence officielle de l'application

La référence Supabase officielle et unique de l'application est :

```text
qdmriiokeindzgeokvqj
```

L'URL applicative attendue utilise donc l'hôte
`qdmriiokeindzgeokvqj.supabase.co`. Cette référence, déjà utilisée historiquement par le dépôt,
est la seule cible autorisée tant qu'une décision métier explicite et documentée ne la remplace
pas.

Le projet **Coutilo**, notamment la référence `kfbcnfurqgncilgwobvo`, est totalement étranger à
cette application. Il ne doit jamais être inspecté, lié, migré, configuré ni utilisé pour ses
données, son Auth, son Storage ou ses fonctions Edge. Si un connecteur ou un jeton ne montre que
Coutilo, l'opération doit être interrompue : ce compte n'est pas le bon contexte Supabase.

Le workflow GitHub applique une liste blanche stricte sur la référence officielle avant
`supabase link`. La concordance du nom et de l'organisation reste une seconde vérification, jamais
un substitut à cette liste blanche.

Les environnements GitHub `staging` et `production` doivent chacun définir :

| Type     | Nom                        | Usage                                                       |
| -------- | -------------------------- | ----------------------------------------------------------- |
| Variable | `SUPABASE_PROJECT_REF`     | Référence exacte du projet cible                            |
| Variable | `SUPABASE_PROJECT_NAME`    | Nom attendu, utilisé pour le contrôle d’identité            |
| Variable | `SUPABASE_ORGANIZATION_ID` | Organisation attendue, utilisée pour le contrôle d’identité |
| Secret   | `SUPABASE_ACCESS_TOKEN`    | Jeton CLI autorisé                                          |

Avant `supabase link`, le workflow exige d'abord la référence officielle, puis récupère les projets
accessibles au jeton et impose une correspondance unique sur la référence, le nom et
l'organisation. Toute valeur absente ou différente arrête le déploiement avant la lecture des
migrations.

La CLI obtient des identifiants temporaires via l’API de gestion : aucun mot de passe PostgreSQL
permanent n’est requis ni conservé dans GitHub.

État du pilote au 20 août 2026 :

- l’environnement `staging` contient la configuration du projet pilote vérifié ;
- l’environnement `production` existe mais ne contient volontairement aucun secret ni variable ;
- aucune configuration Supabase de déploiement n’est définie au niveau global du dépôt.

Ainsi, un lancement production échoue avant toute connexion tant que sa cible dédiée n’a pas été
explicitement configurée.

## Séquence autorisée

1. Créer les projets Supabase dédiés dans la région décidée.
2. Configurer séparément l’environnement GitHub `staging`.
3. Lancer manuellement le workflow vers staging.
4. Exécuter pgTAP, les tests Edge, Playwright et le smoke test.
5. Configurer l’environnement `production` avec des valeurs distinctes.
6. Exiger une approbation GitHub sur l’environnement production.
7. Déployer en production uniquement après sauvegarde et validation staging.

La production n’est jamais une valeur de repli : un push sur `main` cible uniquement l’environnement staging.
