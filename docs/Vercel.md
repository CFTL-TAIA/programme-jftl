# Vercel - API serverless TAIA

## Objectif

Deployer le projet sur Vercel avec :

- un front statique genere dans `dist/`
- de vraies routes API serverless sous `/api/*`
- une documentation Swagger pointant vers les vrais endpoints
- un systeme admin base sur deux mots de passe fournis par variables d'environnement

## Configuration technique retenue

- `vercel.json` definit `npm run vercel-build` comme commande de build
- `dist/` est le repertoire de sortie du front
- `api/*.js` contient les fonctions serverless exposees publiquement
- `lib/` contient la logique partagee entre Vercel, le preview local et Swagger

## Premiere mise en place sur Vercel

1. Creer un projet Vercel connecte au depot GitHub.
2. Laisser Vercel detecter un projet Node.js.
3. Verifier les parametres suivants :
   - Build Command : `npm run vercel-build`
   - Output Directory : `dist`
4. Ouvrir le projet Vercel puis aller dans `Settings` > `Environment Variables`.
5. Ajouter les deux variables suivantes :
   - `TAIA_ADMIN_EDITOR_PASSWORD`
   - `TAIA_ADMIN_SUPER_PASSWORD`
   - `taia_bdd_DATABASE_URL`
   - `taia_READ_WRITE_TOKEN`
6. Saisir vos vraies valeurs secretes pour chaque environnement cible.
7. Relancer un deploiement apres ajout ou modification des variables.

## Recommandation d'environnements

Pour un premier deploiement propre :

- definir `taia_bdd_DATABASE_URL` de production pour `Production`
- definir une `taia_bdd_DATABASE_URL` differente pour `Preview` si vous voulez tester l'admin sur les branches ou pull requests
- definir les deux mots de passe admin au minimum pour `Production` et `Preview` selon votre besoin
- ne jamais mettre les vraies valeurs dans le depot, Swagger, README ou les user stories

## Verification apres deploiement

1. Ouvrir l'URL Vercel racine et verifier le chargement du programme.
2. Tester les endpoints publics :
   - `/api/conference`
   - `/api/speaker`
   - `/api/salle`
   - `/api/entreprise`
3. Ouvrir `/api/admin/token` et verifier que la reponse expose seulement :
   - `dateStamp`
   - `scopes`
   - `requiredEnvironment`
4. Ouvrir `/admin/`, saisir le mot de passe `editor`, puis verifier l'acces a `Modifier`.
5. Saisir le mot de passe `admin-plus`, puis verifier l'acces a `Modifier`, `Creer` et `Supprimer`.
6. Ouvrir `/docs/Swagger/` pour tester les routes avec la vraie API deployee.

## Utilisation avec Swagger sur Vercel

1. Generer un JWT depuis `/admin/` ou par `POST /api/admin/token`.
2. Copier uniquement la valeur du token.
3. Dans Swagger, utiliser `Authorize` avec `Bearer <token>`.
4. Tester ensuite `POST`, `PUT` et `DELETE` selon le scope obtenu.

## Notes sur le local

En local, le projet peut charger automatiquement `.env.local` a la racine.

Vercel ne lit pas ce fichier depuis le depot pour vos secrets runtime :

- les secrets locaux restent dans `.env.local`
- les secrets Vercel doivent etre configures dans le dashboard Vercel

Pour recuperer aussi les variables Blob en local :

```bash
vercel env pull
```

## Persistance retenue

Le projet s'appuie maintenant sur :

- une base Postgres distante pour les donnees metier, alimentee par `taia_bdd_DATABASE_URL` en priorite, avec `DATABASE_URL` encore accepte comme alias
- `taia-fichier` en public pour les medias, sous `medias/photos` et `medias/logos`

Mode de fonctionnement :

- sur Vercel avec `taia_bdd_DATABASE_URL` ou `DATABASE_URL`, les CRUD metier lisent et ecrivent dans Postgres
- sur Vercel avec `taia_READ_WRITE_TOKEN`, les uploads admin publient les medias dans Blob public
- les JSON versionnes de `BDD/` servent uniquement de source de seed pour Postgres

Recommandation Neon :

- une base `dev` pour `.env.local`
- une base `prod` differente pour Vercel `Production`
- eventuellement une base `preview` ou une branche Neon pour Vercel `Preview`

Commande utile pour initialiser la base Postgres a partir des fichiers versionnes :

```bash
npm run seed-postgres
```

Commande utile pour initialiser le store media Blob a partir des fichiers versionnes :

```bash
npm run seed-blob
```

## Contraintes d'upload admin

- taille maximale : `2 Mo`
- photo speaker : `1200 x 1600 px` maximum
- logo entreprise : `1600 x 800 px` maximum

Le controle est fait a deux niveaux :

- message preventif et blocage dans l'interface admin
- verification API cote serveur sur `/api/admin/media`

## Checklist rapide premier deploiement

1. `npm run build` passe localement
2. `npm run dev` fonctionne sur `http://localhost:8080`
3. `TAIA_ADMIN_EDITOR_PASSWORD` configure sur Vercel
4. `TAIA_ADMIN_SUPER_PASSWORD` configure sur Vercel
5. `taia_bdd_DATABASE_URL` configure sur Vercel
6. `taia_READ_WRITE_TOKEN` configure sur Vercel
7. deploy relance apres ajout des variables
8. test de `/api/admin/token` effectue
9. test Swagger effectue sur l'URL Vercel
10. test de `/api/admin/media` effectue avec une image < 2 Mo