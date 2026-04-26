# Handoff - Projet API TAIA

## Perimetre courant

- Front programme JFTL 2026
- Pages dediees conferences, speakers, salles, entreprises et admin
- API serverless compatible Vercel exposee sous `/api/*`
- Documentation Swagger interactive basee sur le contrat reel
- CRUD admin sur conference, speaker, salle et entreprise
- Upload admin de photos et logos

## Etat d'architecture

- Node.js `24.x` construit le site statique et permet le preview local
- `src/api/routes.mjs` reste la source de verite du contrat API
- `api/` contient les handlers serverless Vercel
- `lib/` contient la logique partagee entre Vercel, Swagger et le preview local
- Postgres est la persistance runtime unique des donnees metier
- `src/api/data/` contient uniquement les seeds JSON versionnes
- `src/site/assets/media/` contient les medias versionnes utilises en preview local et pour le seed Blob
- Blob reste reserve aux medias publics, pas aux donnees metier

## Regles de stockage

- variable prioritaire pour la base : `taia_bdd_DATABASE_URL`
- alias encore acceptes : `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `NEON_DATABASE_URL`
- variable media : `taia_READ_WRITE_TOKEN`
- sans token Blob, les uploads admin tombent en fallback local dans `src/site/assets/media/` et `dist/assets/media/`

## Comportements verifies

- le runtime JSON local pour les donnees metier a ete retire
- le build OpenAPI ne depend plus d'un acces obligatoire a Postgres
- l'admin recharge la page environ `1 s` apres une mutation reussie
- les suppressions de speakers et d'entreprises nettoient aussi le media TAIA associe
- les noms de speakers sont normalises et tries sans sensibilite a la casse
- les conferences admin sont groupees par type dans les listes deroulantes

## Sources principales

- `src/api/routes.mjs` : contrat API et schemas Swagger
- `lib/api-service.mjs` : logique CRUD et filtres
- `lib/data-storage.mjs` : acces Postgres et lecture des seeds versionnes
- `lib/admin-media.mjs` : uploads media et fallback local
- `lib/openapi.mjs` : generation OpenAPI
- `scripts/build.mjs` : build du site et de Swagger
- `scripts/seed-postgres.mjs` : seed Postgres depuis `src/api/data/`
- `scripts/seed-blob.mjs` : seed Blob depuis `src/site/assets/media/`
- `scripts/migrate-media-urls.mjs` : migration des anciennes references media stockees en base vers les URLs Blob canoniques
- `src/site/` : front et pages statiques

## Commandes utiles

```bash
npm run build
npm run dev
npm run start
npm run admin-token
npm run seed-postgres
npm run seed-blob
npm run migrate-media-urls
npm run db:up
npm run db:down
```

## Points d'attention

- toute nouvelle route doit d'abord etre declaree dans `src/api/routes.mjs`
- toute evolution admin doit conserver zero secret dans le code, Swagger et les docs versionnees
- `.env.local` est ignore par Git ; `.env.local.example` doit rester en placeholders uniquement
- le montage recommande est une base `dev`, une base `preview` eventuelle et une base `prod` separee
- les medias de preview local sont maintenant sous `src/site/assets/media/`
- si l'URL Vercel de production change, verifier aussi les origines de repli dans le front et Swagger
- en cas de legacy media URLs en base, utiliser `npm run migrate-media-urls -- --dry-run` puis `npm run migrate-media-urls` sur chaque environnement cible

## Regle stricte pour `docs/chat.md`

- ne jamais enregistrer un secret reel dans `docs/chat.md`
- si un utilisateur colle une URI Postgres, un token Blob, un mot de passe admin ou toute valeur secrete, la valeur doit etre redigee avant toute copie dans la doc
- `docs/chat.md` doit rester un journal utile, pas une archive brute de secrets ou de `.env.local`

## Regle de maintenance documentaire

Quand une fonctionnalite, un comportement technique ou un process de dev change, mettre a jour au minimum :

- `docs/chat.md`
- `README.md`
- `docs/handoff.md`
- `docs/Vercel.md`
- `docs/UserStories/*.md`
- `docs/UserStories/usecase/*_Test.md`
- `docs/Swagger/openapi.json` et sa source `src/api/routes.mjs` si le contrat API change

## Prochaines etapes pertinentes

- ajouter des tests automatiques sur l'auth admin, les scopes et les filtres API
- ajouter des tests de navigation front sur le programme et les pages detail
- valider regulierement la coherence entre seeds versionnes, base de dev et media store de dev