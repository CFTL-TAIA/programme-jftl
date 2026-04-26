# US008 - Upload medias admin

## User Story

En tant qu'administrateur du projet API TAIA, je veux charger des photos de speakers et des logos d'entreprises depuis l'interface admin afin de publier rapidement des medias conformes sans depasser les contraintes de poids et de dimensions.

## Valeur attendue

- fiabiliser les uploads admin en local comme sur Vercel
- envoyer les medias vers Blob public en production tout en gardant un fallback local simple
- eviter les images trop lourdes ou trop grandes pour l'affichage cible du site

## Criteres d'acceptation

1. `POST /api/admin/media` exige un JWT admin avec permission `update`.
2. Une photo de speaker inferieure ou egale a `2 Mo` et a `1200 x 1600 px` est acceptee.
3. Un logo d'entreprise inferieur ou egal a `2 Mo` et a `1600 x 800 px` est accepte.
4. Une image trop lourde ou trop grande est refusee avec un message explicite cote UI et cote API.
5. Si les variables Blob sont presentes, l'URL retournee pointe vers Blob public ; sinon le fallback local continue de fonctionner.