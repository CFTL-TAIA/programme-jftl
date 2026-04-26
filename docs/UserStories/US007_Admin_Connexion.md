# US007 - Connexion Admin

## User Story

En tant qu'administrateur du projet API TAIA, je veux obtenir un JWT quotidien avec deux niveaux d'acces afin de modifier, creer ou supprimer des ressources JSON sans exposer les mots de passe dans le code ou la documentation.

## Valeur attendue

- securiser l'acces admin sans base de donnees
- distinguer les actions simples de modification des actions sensibles de creation et suppression
- permettre un usage coherent depuis l'interface admin et depuis Swagger

## Criteres d'acceptation

1. `GET /api/admin/token` retourne uniquement des informations publiques de configuration sans jamais exposer les secrets reels.
2. `POST /api/admin/token` accepte un mot de passe configure cote serveur et renvoie un JWT du jour avec un `scope` et une liste de `permissions`.
3. Le scope `editor` autorise la rubrique `Modifier` et les requetes `PUT` uniquement.
4. Le scope `admin-plus` autorise les rubriques `Modifier`, `Creer`, `Supprimer` et les requetes `POST`, `PUT`, `DELETE`.
5. L'interface admin masque les formulaires de gestion tant qu'aucun token valide n'a ete genere.
6. La documentation de configuration mentionne aussi `DATABASE_URL` comme variable requise pour activer les CRUD metier dans l'environnement courant.