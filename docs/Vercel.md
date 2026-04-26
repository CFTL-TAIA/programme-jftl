# Vercel - API serverless TAIA

## Objectif

Deployer le projet avec :

- un front statique genere dans `dist/`
- une vraie API serverless sous `/api/*`
- Swagger branche sur les endpoints reels
- un back-office admin securise par variables d'environnement

## Configuration attendue

- Build Command : `npm run vercel-build`
- Output Directory : `dist`
- Runtime API : `api/*.js`

## Variables a configurer

Variables minimales cote Vercel :

- `TAIA_ADMIN_EDITOR_PASSWORD`
- `TAIA_ADMIN_SUPER_PASSWORD`
- `taia_bdd_DATABASE_URL`

Variable recommandee pour les medias :

- `taia_READ_WRITE_TOKEN`

Regles :

- utiliser `taia_bdd_DATABASE_URL` comme variable principale
- garder `DATABASE_URL` uniquement comme alias de compatibilite si besoin
- ne jamais coller les vraies valeurs dans le depot, Swagger ou `docs/chat.md`

## Premiere mise en place

1. Creer le projet Vercel connecte au depot GitHub.
2. Verifier que la commande de build est `npm run vercel-build`.
3. Verifier que le repertoire de sortie est `dist`.
4. Configurer les variables d'environnement dans `Settings > Environment Variables`.
5. Relancer un deploiement apres toute modification de variable.

## Repartition recommandee des environnements

- `Development` : base de dev si tu utilises Vercel en local ou des tests ponctuels
- `Preview` : base ou branche Neon separee pour les PR et branches
- `Production` : base de production uniquement

Ne jamais partager la meme base entre `dev` et `prod`.

## Ce que fait l'application une fois deployee

- les CRUD metier utilisent Postgres
- les uploads admin utilisent Blob si `taia_READ_WRITE_TOKEN` est present
- les seeds versionnes restent dans le depot sous `src/api/data/` et `src/site/assets/media/`, uniquement pour initialisation et preview local

## Initialisation des donnees

Pour precharger une base :

```bash
npm run seed-postgres
```

Pour precharger le store Blob de medias :

```bash
npm run seed-blob
```

Sources lues par ces scripts :

- `src/api/data/*.json`
- `src/site/assets/media/photos`
- `src/site/assets/media/logos`

## Verification apres deploiement

1. Ouvrir l'URL Vercel du projet.
2. Verifier `GET /api/conference`, `GET /api/speaker`, `GET /api/salle`, `GET /api/entreprise`.
3. Verifier `GET /api/admin/token`.
4. Ouvrir `/admin/` et tester un login `editor` puis `admin-plus`.
5. Ouvrir `/docs/Swagger/` et tester au moins une route publique puis une route protegee avec `Authorize`.
6. Tester `POST /api/admin/media` avec une image valide.

## Usage Swagger

1. Generer un JWT via `/admin/` ou `POST /api/admin/token`.
2. Copier uniquement la valeur du token.
3. Utiliser `Authorize` avec `Bearer <token>`.
4. Tester ensuite `POST`, `PUT` et `DELETE` selon le scope.

## Notes locales utiles

- `.env.local` reste strictement local et ignore par Git
- `vercel env pull` peut aider a rapatrier les variables non sensibles de travail, mais ne doit pas pousser les secrets dans la documentation
- le preview local peut fonctionner sans `taia_READ_WRITE_TOKEN`, avec fallback media local

## Contraintes d'upload admin

- taille maximale : `2 Mo`
- photo speaker : `1200 x 1600 px` max
- logo entreprise : `1600 x 800 px` max

## Checklist rapide

1. `npm run build` passe localement.
2. Les variables Vercel sont configurees pour l'environnement cible.
3. Un redeploiement a ete relance apres mise a jour des variables.
4. Les endpoints publics repondent.
5. L'admin permet d'obtenir un JWT.
6. Swagger fonctionne sur l'URL deployee.
7. Un upload media de test aboutit.