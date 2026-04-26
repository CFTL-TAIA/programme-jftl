# Projet API TAIA

Projet Node.js + Vercel compose de trois briques coherentes :

- un front statique autour du programme JFTL 2026
- une vraie API serverless sous `/api/*`
- une interface admin avec JWT journalier et scopes `editor` / `admin-plus`

## Architecture retenue

- `src/api/routes.mjs` est la source de verite du contrat API
- `api/*.js` expose les fonctions serverless Vercel
- `lib/` contient la logique partagee entre Vercel, le preview local et Swagger
- `src/api/data/` contient les seeds JSON versionnes des donnees metier
- `src/site/assets/media/` contient les medias versionnes utilises pour le preview local et le seed Blob
- `docs/Swagger/openapi.json` est regenere au build a partir des routes reelles

Les donnees metier vivent en runtime dans Postgres. Les seeds JSON ne servent plus de persistance runtime.

## Stockage et variables d'environnement

Variables attendues cote serveur :

- `TAIA_ADMIN_EDITOR_PASSWORD` pour le scope `editor`
- `TAIA_ADMIN_SUPER_PASSWORD` pour le scope `admin-plus`
- `taia_bdd_DATABASE_URL` pour Postgres en priorite
- `taia_READ_WRITE_TOKEN` pour Vercel Blob si les uploads media doivent partir sur Blob

Alias encore acceptes pour la base :

- `DATABASE_URL`
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `NEON_DATABASE_URL`

Mode de fonctionnement :

- avec une URL Postgres, les CRUD metier lisent et ecrivent dans Postgres
- avec `taia_READ_WRITE_TOKEN`, les photos et logos admin sont publies dans Blob sous `medias/photos` et `medias/logos`
- sans `taia_READ_WRITE_TOKEN`, le preview local garde un fallback de medias sous `src/site/assets/media/` et `dist/assets/media/`

## Prerequis

- Node.js `24.x`
- `npm install`
- optionnel : Docker si tu veux un Postgres local via `npm run db:up`

## Demarrage local recommande

1. Copier `.env.local.example` vers `.env.local`.
2. Renseigner les deux mots de passe admin.
3. Renseigner `taia_bdd_DATABASE_URL` vers un Postgres local ou une base Neon de dev.
4. Optionnel : renseigner `taia_READ_WRITE_TOKEN` vers un store Blob de dev.
5. Lancer `npm run seed-postgres` pour charger les seeds versionnes dans la base.
6. Optionnel : lancer `npm run seed-blob` pour precharger les medias du store Blob.
7. Lancer `npm run dev`.

Exemple minimal de `.env.local` :

```dotenv
TAIA_ADMIN_EDITOR_PASSWORD=change-me-editor
TAIA_ADMIN_SUPER_PASSWORD=change-me-admin-plus
taia_bdd_DATABASE_URL=postgresql://taia:taia@localhost:5432/taia
taia_READ_WRITE_TOKEN=vercel_blob_rw_change-me
```

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
npm run free-local-port
```

Notes utiles :

- `npm run dev` reconstruit le site avant de lancer le preview local
- `npm run admin-token` lit automatiquement `.env.local`
- `npm run seed-postgres` lit `src/api/data/*.json`
- `npm run seed-blob` lit `src/site/assets/media/photos` et `src/site/assets/media/logos`
- `npm run migrate-media-urls` reecrit en base les anciennes references media (`/BDD/...`, `http://localhost:8080/BDD/...`, `/assets/media/...`) vers les URLs Blob canoniques du store configure

## Migration des URLs media existantes

Si la base contient encore d'anciennes references locales ou legacy, utiliser :

```bash
npm run migrate-media-urls -- --dry-run
npm run migrate-media-urls
```

Usage recommande :

1. pointer `.env.local` vers la base cible (`dev`, `preview` ou `prod`)
2. verifier que `taia_READ_WRITE_TOKEN` correspond bien au store Blob qui contient les medias
3. lancer d'abord le `--dry-run`
4. lancer la migration reelle

La commande ne touche qu'aux colonnes `speakers.photo` et `entreprises.logo`.

## Validation locale minimale

1. Ouvrir `http://localhost:8080/`.
2. Verifier `GET /api/conference`, `GET /api/speaker`, `GET /api/salle`, `GET /api/entreprise`.
3. Ouvrir `http://localhost:8080/docs/Swagger/`.
4. Ouvrir `http://localhost:8080/admin/`.
5. Verifier le scope `editor` puis le scope `admin-plus`.
6. Verifier un upload media et un CRUD metier.

Comportement admin a connaitre :

- apres un create, update ou delete reussi, l'interface force un rechargement complet avec un delai d'environ `1 s`
- la suppression d'un `speaker` ou d'une `entreprise` nettoie aussi le media TAIA associe
- une URL media externe saisie manuellement n'est pas supprimee automatiquement

## Seeds versionnes

Sources versionnees actuelles :

- `src/api/data/Conference.json`
- `src/api/data/Speakers.json`
- `src/api/data/Salle.json`
- `src/api/data/Entreprise.json`
- `src/site/assets/media/photos/`
- `src/site/assets/media/logos/`

Le programme a ete reconstruit depuis `docs/Programme-JFTL26.pdf` puis consolide avec les informations publiques CFTL.

## Regles de securite documentaire

- ne jamais committer `.env.local`
- ne jamais copier un secret reel dans `README.md`, `docs/chat.md`, `docs/handoff.md`, les user stories, Swagger ou une issue
- si un secret est partage par erreur, le rediger immediatement puis le rotater
- conserver uniquement des placeholders dans `.env.local.example`

## Structure du depot

- `src/` : sources front et definition des routes API
- `src/api/data/` : seeds JSON versionnes
- `src/site/assets/media/` : medias versionnes pour preview local et seed Blob
- `api/` : fonctions serverless Vercel
- `lib/` : logique partagee
- `scripts/` : build, preview, seed et utilitaires
- `docs/` : documentation projet, Swagger et user stories
- `dist/` : site genere

## Deploiement

Le guide de deploiement detaille est dans `docs/Vercel.md`.

Montage actuel :

- le front statique peut etre publie sur GitHub Pages
- l'API serverless tourne sur Vercel
- le front detecte `github.io` et rebascule alors ses appels API vers l'origine Vercel configuree

## Licence

La variante exacte de licence Creative Commons reste a confirmer dans le depot. Rien n'a ete change sur ce point dans ce projet.
