# Projet API TAIA

Projet de demonstration compose de :

- une page d'accueil front centre sur le programme complet de la JFTL 2026
- un espace API dedie pour documenter et tester les endpoints JSON du projet
- des pages separees pour les conferences, speakers, salles et entreprises avec navigation contextualisee
- une vraie API Node.js testable localement et en serverless
- une zone `BDD/` contenant les fichiers JSON qui font office de base de donnees
- une documentation Swagger interactive
- une interface admin a formulaires avec JWT quotidien et scopes `editor` / `admin-plus`
- une configuration de deploiement Vercel

## Contrainte importante

Le projet cible desormais Vercel pour disposer de vraies routes API serverless.

La solution mise en place ici est donc la suivante :

- Node.js sert a construire le front statique et la documentation Swagger
- les routes API `/api/*` sont executees par de vraies fonctions serverless
- le serveur local reutilise la meme logique API que Vercel
- les reponses API sont alimentees par des fichiers de donnees JSON

Point de fiabilite : les requetes API sont maintenant reelles en local et sur Vercel, donc testables depuis Bruno, Postman, Karate ou Swagger sans mock navigateur.

Point d'incertitude important a signaler : sur Vercel, une ecriture directe dans les fichiers JSON du depot ne sera pas persistante de maniere fiable entre les executions serverless. Les lectures sont adaptees, mais pour des ecritures durables il faudra ensuite passer par une vraie persistance distante comme Vercel KV, Postgres, Blob ou une autre base externe.

## Configuration admin

Les operations d'administration n'utilisent plus de mot de passe en dur dans le code ni dans Swagger.

Variables d'environnement attendues cote serveur :

- `TAIA_ADMIN_EDITOR_PASSWORD` : ouvre le scope `editor` et autorise `PUT`
- `TAIA_ADMIN_SUPER_PASSWORD` : ouvre le scope `admin-plus` et autorise `POST`, `PUT`, `DELETE`
- `bdd_READ_WRITE_TOKEN` : active la persistance distante des JSON via le store Blob prive `taia-bdd`
- `taia_READ_WRITE_TOKEN` : active le stockage public des medias via le store Blob `taia-fichier`

En local, le projet charge automatiquement un fichier `.env.local` a la racine si present.
Sur Vercel, configure-les dans les Environment Variables du projet.

## Configuration locale des variables d'environnement

Flux recommande en local :

1. Copier `.env.local.example` vers `.env.local`.
2. Remplacer les deux valeurs par vos vrais mots de passe locaux.
3. Lancer `npm run dev`.
4. Generer un JWT de test avec `npm run admin-token` ou depuis la page admin.

Exemple de fichier `.env.local` :

```dotenv
TAIA_ADMIN_EDITOR_PASSWORD=votre-mot-de-passe-editor
TAIA_ADMIN_SUPER_PASSWORD=votre-mot-de-passe-admin-plus
```

Regles importantes :

- `.env.local` est ignore par Git et ne doit pas etre committe
- une variable deja definie dans le shell garde la priorite sur `.env.local`
- `npm run dev`, `npm run build` et `npm run admin-token` lisent automatiquement `.env.local`

Alternative sans fichier, en PowerShell :

```powershell
$env:TAIA_ADMIN_EDITOR_PASSWORD="votre-mot-de-passe-editor"
$env:TAIA_ADMIN_SUPER_PASSWORD="votre-mot-de-passe-admin-plus"
npm run dev
```

Alternative bash :

```bash
export TAIA_ADMIN_EDITOR_PASSWORD="votre-mot-de-passe-editor"
export TAIA_ADMIN_SUPER_PASSWORD="votre-mot-de-passe-admin-plus"
npm run dev
```

## Mode hybride local / Vercel Blob

Le projet fonctionne maintenant en mode hybride pour la persistance :

- sans token Blob, les lectures et ecritures continuent d'utiliser `BDD/*.json` et `BDD/photos|logos`
- avec `bdd_READ_WRITE_TOKEN`, les fichiers `Conference.json`, `Speakers.json`, `Salle.json` et `Entreprise.json` sont lus et ecrits dans le dossier Blob prive `Data/`
- avec `taia_READ_WRITE_TOKEN`, les photos et logos admin sont envoyes dans le dossier Blob public `medias/photos` ou `medias/logos`

Pour recuperer les variables Vercel en local :

```bash
vercel env pull
```

Pour initialiser les stores Blob a partir de la BDD locale :

```bash
npm run seed-blob
```

Pre-requis du seed :

- le store prive contient le dossier `Data`
- le store public contient `medias/photos` et `medias/logos`
- les variables `bdd_READ_WRITE_TOKEN` et `taia_READ_WRITE_TOKEN` sont disponibles en local

## Zone BDD

Le dossier `BDD/` contient les sources de donnees du projet :

- `BDD/Conference.json`
- `BDD/Speakers.json`
- `BDD/Salle.json`
- `BDD/Entreprise.json`
- `BDD/photos/` pour les photos des speakers
- `BDD/logos/` pour les logos des entreprises

Ces fichiers jouent le role de base de donnees contributive pour les services JSON exposes par la vraie API serverless.

Le programme a ete reconstruit a partir du fichier `docs/Programme-JFTL26.pdf` puis consolide avec la page officielle CFTL afin de confirmer la date reelle de l'evenement : le 9 juin 2026 au Beffroi de Montrouge.

Point de fiabilite explicite :

- la date, les titres du programme et les rattachements conferences > speakers > salles sont confirmes
- les medias presents dans `BDD/photos/` et `BDD/logos/` peuvent etre des placeholders ou des assets reels selon les sources confirmees
- les contenances de salles sont conservees comme valeurs de travail pour le front, car elles ne figurent pas dans le PDF source

## Installation pour un nouvel utilisateur

1. Installer Node.js 20 ou une version superieure.
2. Cloner le depot.
3. Depuis la racine du projet, executer `npm install`.
4. Generer le site avec `npm run build`.

## Licence

Le projet peut etre distribue sous licence Creative Commons selon la variante que vous choisirez ; la documentation officielle est disponible ici : https://creativecommons.org/licenses/

Point d'incertitude a signaler : je ne peux pas confirmer la variante exacte de licence Creative Commons a utiliser tant qu'elle n'est pas choisie explicitement dans le depot.

## Lancer l'API et la requeter

1. Construire le projet avec `npm run build`.
2. Lancer le projet avec `npm run dev`.
3. Ouvrir `http://localhost:8080` pour la page programme.
4. Requeter l'API via les endpoints ci-dessous.
5. Ouvrir `http://localhost:8080/docs/Swagger/` pour tester les endpoints depuis Swagger.
6. Ouvrir `http://localhost:8080/api-space/` pour l'espace API.

Endpoints disponibles :

- `GET /api/conference`
- `GET /api/entreprise`
- `GET /api/speaker`
- `GET /api/salle`
- `GET /api/admin/token`
- `POST /api/admin/token`
- `POST /api/conference`, `PUT /api/conference`, `DELETE /api/conference`
- `POST /api/speaker`, `PUT /api/speaker`, `DELETE /api/speaker`
- `POST /api/salle`, `PUT /api/salle`, `DELETE /api/salle`
- `POST /api/entreprise`, `PUT /api/entreprise`, `DELETE /api/entreprise`
- `POST /api/admin/media`

Exemples de filtres :

- `GET /api/conference?nom=Keynote`
- `GET /api/conference?speakerId=spk-bruno-legeard`
- `GET /api/conference?salleId=sal-auditorium-moebius`
- `GET /api/entreprise?nomEntreprise=Open`
- `GET /api/entreprise?speakerId=spk-bruno-legeard`
- `GET /api/speaker?nom=Bernard`
- `GET /api/speaker?etage=1`
- `GET /api/salle?etage=2`

Exemples de tests externes :

- Bruno ou Postman sur `http://localhost:8080/api/conference`
- Karate sur `http://localhost:8080/api/speaker?nom=Bernard`

Exemple de reponse :

```json
{
	"items": [
		{
			"id": "conf-keynote-1-gouvernance-antifragile",
			"nom": "Keynote #1 : Vers une gouvernance antifragile: décider à l'ère des collectifs humain agent",
			"horaire": "2026-06-09T09:20:00+02:00",
			"type": "keynote",
			"speakerIds": [
				"spk-gabriel-rousseau",
				"spk-karim-hedeoud-perrot"
			],
			"salleIds": [
				"sal-auditorium-moebius"
			]
		}
	],
	"total": 1,
	"filters": {
		"id": null,
		"nom": "Keynote",
		"speakerId": null,
		"salleId": null,
		"horaire": null
	}
}
```

## Commandes

```bash
npm run build
npm run free-local-port
npm run dev
```

`npm run free-local-port` tente de liberer automatiquement un ancien serveur Node local sur le port `8080` avant redemarrage.

`npm run admin-token` aide a generer un JWT local uniquement si les variables d'environnement admin sont deja configurees.

`npm run seed-blob` pousse les JSON de `BDD/` vers `Data/` dans Blob prive, puis les photos et logos vers `medias/` dans Blob public.

Verification locale minimale des mots de passe :

1. Ouvrir `http://localhost:8080/admin/`
2. Saisir le mot de passe `editor` pour verifier l'acces a `Modifier`
3. Saisir le mot de passe `admin-plus` pour verifier l'acces a `Modifier`, `Creer` et `Supprimer`

## Structure

- `src/` : sources front, pages statiques et definition des routes API
- `api/` : fonctions serverless Vercel exposees publiquement
- `lib/` : logique partagee entre Vercel, le serveur local et Swagger
- `BDD/` : donnees JSON contributives et emplacement des photos et logos
- `docs/` : documentation projet, handoff, user stories, Swagger
- `dist/` : site genere pour le front et Swagger
- `vercel.json` : configuration de build et runtime Vercel

## Deploiement Vercel

La configuration Vercel est definie dans `vercel.json`.

### Cohabitation GitHub Pages + API Vercel

Le front statique peut etre publie sur GitHub Pages tandis que les endpoints `/api/*` restent executes sur Vercel.

Montage retenu dans ce projet :

- GitHub Pages sert l'interface statique sous `https://cftl-taia.github.io/programme-jftl/`
- Vercel sert l'API serverless sous `https://programme-jftl.vercel.app/api/*`
- le front detecte automatiquement l'hebergement `github.io` et redirige alors ses appels API vers Vercel
- Swagger publie sur GitHub Pages pointe egalement vers l'origine Vercel pour `Try it out`

Point d'attention :

- si l'URL Vercel change plus tard (par exemple avec un domaine personnalise), il faudra mettre a jour l'origine d'API de repli dans `src/site/assets/shared.js` et `docs/Swagger/index.html`
- les headers CORS de l'API autorisent actuellement l'origine GitHub Pages `https://cftl-taia.github.io` ainsi que l'URL Vercel du projet

### Ajouter les variables d'environnement sur Vercel

Une fois le projet cree et deploye sur Vercel, il faut definir les secrets admin dans le dashboard :

1. Ouvrir le projet dans Vercel.
2. Aller dans `Settings`.
3. Aller dans `Environments` 
4. Choisir au minimum l'environnement `Production`.
5. Ouvrir la section `Environment Variables`.
6. Ajouter la variable `TAIA_ADMIN_EDITOR_PASSWORD`.
7. Saisir la valeur du mot de passe correspondant au scope 
8. Ajouter ensuite la variable `TAIA_ADMIN_SUPER_PASSWORD`.
9.  Saisir la valeur du mot de passe correspondant au scope `admin-plus`.
10. Choisir au minimum l'environnement `Production`.
8.  Enregistrer.
9.  Relancer un deploiement pour que les fonctions serverless prennent bien en compte ces nouvelles variables.

Recommandation pratique :

- configurer aussi ces deux variables pour `Preview` si vous voulez tester l'admin sur les branches ou les pull requests
- ne jamais stocker ces valeurs dans le depot Git

Verification apres configuration :

1. Ouvrir l'URL Vercel du projet.
2. Verifier que `GET /api/admin/token` repond correctement.
3. Ouvrir `/admin/`.
4. Saisir le mot de passe `editor` pour verifier l'acces a `Modifier`.
5. Saisir le mot de passe `admin-plus` pour verifier l'acces a `Modifier`, `Creer` et `Supprimer`.

La documentation detaillee est disponible dans `docs/Vercel.md`.
