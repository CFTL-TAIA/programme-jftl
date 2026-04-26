# Handoff - Projet API TAIA

## Perimetre courant

- Front moderne avec une page d'accueil programme JFTL 2026
- Un espace API separe pour documenter les endpoints
- Des pages separees pour conferences, speakers, salles et entreprises
- Vraie API locale et serverless compatible Vercel
- Zone BDD JSON a la racine du projet
- Endpoints `GET /api/conference`, `GET /api/speaker`, `GET /api/salle` et `GET /api/entreprise`
- Endpoints d'admin `GET /api/admin/token` et `POST /api/admin/token`
- Endpoint d'upload admin `POST /api/admin/media`
- Endpoints ecriture `POST`, `PUT`, `DELETE` sur conference, speaker, salle et entreprise
- Documentation Swagger interactive
- Configuration Vercel pour deploiement serverless

## Architecture retenue

- Node.js est utilise pour construire le site statique et pour executer l'API localement
- Vercel expose les routes `/api/*` comme fonctions serverless reelles
- Les reponses API sont construites depuis des fichiers de donnees JSON versionnes dans `BDD/`, avec un mode hybride Blob/local pour les lectures et ecritures quand les tokens de stockage sont presents
- Le serveur local `scripts/preview.mjs` reutilise la meme logique que les fonctions serverless
- Le Swagger consomme le fichier OpenAPI genere et peut executer des requetes vers la vraie API sur le meme site
- La page Swagger charge maintenant `swagger-ui-dist@5.32.4` via CDN pour repartir d'une base UI a jour avant toute personnalisation supplementaire
- Le POC courant s'appuie sur le rendu natif Swagger UI avec un theme sombre applique localement aux request bodies en mode `Try it out` et aux panneaux `Example Value / Schema` des reponses pour obtenir une presentation homogene
- Un ajustement CSS supplementaire a ete applique sur les reponses pour aplatir le `model-box` interne et supprimer l'effet visuel de double encapsulation dans les panneaux `Example Value / Schema`
- Le filtre `etage` sur les speakers est deduit des salles associees a leurs conferences
- Les speakers portent maintenant un rattachement `entreprise` et le front reconstruit les liaisons conference > entreprise depuis les speakers ou les titres de demo
- Les conferences portent maintenant un champ `type` persiste dans `BDD/Conference.json`
- L'admin repose sur un JWT quotidien a scopes : `editor` pour modifier, `admin-plus` pour creer et supprimer en plus
- Les mots de passe admin sont exclusivement attendus via variables d'environnement cote serveur
- L'admin permet aussi un upload direct de photos et logos avec deux modes : Blob public sur Vercel si `taia_READ_WRITE_TOKEN` est present, ou fallback local avec copie dans `BDD/` et `dist/BDD/`
- Les CRUD JSON basculent sur Blob prive `Data/` si `bdd_READ_WRITE_TOKEN` est present, sinon restent sur `BDD/*.json`
- Les uploads admin sont limites a 2 Mo et controles aussi sur les dimensions : photo `1200 x 1600 px`, logo `1600 x 800 px`
- Apres un create, update ou delete reussi dans l'admin, l'interface force un rechargement complet differe de `2 s` pour rendre visibles les ecritures Blob eventuellement retardees
- La suppression d'un `speaker` ou d'une `entreprise` supprime aussi le media associe si l'URL ou le chemin pointe vers un media gere par TAIA

## Sources principales

- `src/api/routes.mjs` : source de verite des endpoints
- `api/` : fonctions serverless Vercel
- `lib/api-service.mjs` : logique de lecture et de filtrage partagee
- `lib/openapi.mjs` : generation OpenAPI partagee
- `BDD/` : donnees JSON servant de base aux reponses et emplacement des photos et logos
- `scripts/build.mjs` : generation du site et du fichier OpenAPI
- `scripts/print-admin-token.mjs` : generation locale d'un JWT admin de test
- `scripts/seed-blob.mjs` : pousse les JSON et medias locaux vers les stores Blob Vercel
- `src/site/` : front programme, espace API et pages detaillees
- `docs/Swagger/index.html` : interface Swagger
- `lib/admin-media.mjs` : logique de stockage local des photos et logos uploades depuis l'admin
- `vercel.json` : configuration de build et de runtime

## Commandes utiles

```bash
npm run build
npm run free-local-port
npm run dev
npm run admin-token
npm run seed-blob
```

## Points d'attention

- Toute nouvelle route doit etre ajoutee dans `src/api/routes.mjs`, puis implementee ou branchee dans `api/`
- Toute evolution de l'admin doit conserver l'absence de secret dans le code, Swagger et les docs versionnees
- Les JSON de `BDD/` restent la source de seed et le fallback local, mais la persistance distante cible maintenant Vercel Blob avec `bdd_READ_WRITE_TOKEN`
- Les ecritures API locales sont maintenant validees cote serveur avant persistance des fichiers JSON
- Les uploads admin de photos et logos ecrivent en Blob public sur Vercel quand `taia_READ_WRITE_TOKEN` est present ; sinon ils restent copies localement pour le preview
- Les suppressions admin de `speaker` et `entreprise` nettoient aussi les photos/logos associes quand ils sont stockes sous `BDD/` ou dans Blob `medias/`
- Les variables de stockage attendues sont `bdd_READ_WRITE_TOKEN` et `taia_READ_WRITE_TOKEN`
- Le programme source correspond a la JFTL du 9 juin 2026 au Beffroi de Montrouge, reconstruit depuis `docs/Programme-JFTL26.pdf` puis consolide avec la page officielle CFTL
- Les liaisons conferences > speakers > salles sont a jour dans les trois fichiers JSON de `BDD/`
- Les liaisons speakers > entreprises sont presentes dans `BDD/Speakers.json` et `BDD/Entreprise.json`
- Une partie des medias de `BDD/photos/` et `BDD/logos/` a ete remplacee par des assets verifies issus du site CFTL JFTL ; les entrees non confirmees restent en placeholders et peuvent etre remplacees unitairement sans modifier les IDs
- Les contenances de salles sont des valeurs de travail conservees dans `Salle.json`, car absentes du PDF source
- En local, un ancien service worker navigateur peut polluer les tests tant qu'il n'est pas desinscrit ; le front et Swagger declenchent maintenant ce nettoyage automatiquement
- Une tentative precedente de personnalisation DOM des request bodies a ete retiree car elle perturbait l'editeur de requete ; le POC actuel evite de surcharger le composant et se limite a un theming CSS du rendu natif
- Les descriptions de champs des request bodies sont deja portees par `src/api/routes.mjs`, ce qui permet au schema Swagger d'afficher la documentation de chaque champ sans enrichissement supplementaire dans le POC
- Le POC courant a ete valide au build, mais pas encore par un test navigateur automatise ; un controle manuel local reste utile avant generalisation
- En local, `npm run dev` tente d'abord de liberer le port `8080` si un ancien serveur Node TAIA y est encore attache
- En local comme sur Vercel, les variables `TAIA_ADMIN_EDITOR_PASSWORD` et `TAIA_ADMIN_SUPER_PASSWORD` doivent etre configurees pour utiliser l'admin
- En local, `.env.local` est auto-charge par `scripts/build.mjs`, `scripts/preview.mjs` et `scripts/print-admin-token.mjs` ; `.env.local.example` sert de modele et `.env.local` est ignore par Git
- Le site CFTL JFTL peut servir de source fiable de decouverte pour les photos de speakers et certains logos d'entreprises, car les assets sont publies en URLs directes dans le HTML WordPress ; garder toutefois une vigilance sur les droits d'usage et sur le choix de la variante canonique parmi `srcset` et fichiers `-scaled`

## Prochaines etapes pertinentes

- Executer `npm run seed-blob` une premiere fois avec les tokens Vercel pour initialiser `Data/` et `medias/`
- Ajouter des tests automatiques de filtrage, d'authentification et de scopes admin
- Ajouter des tests de navigation front pour les pages programme, conferences, speakers, salles, entreprises et admin