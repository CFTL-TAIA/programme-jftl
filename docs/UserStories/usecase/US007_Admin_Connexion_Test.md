# US007_Admin_Connexion_Test

## Cas de test d'acceptation

1. Appeler `GET /api/admin/token` et verifier que la reponse contient `dateStamp`, `scopes`, `requiredEnvironment`, mais aucun mot de passe reel.
2. Appeler `POST /api/admin/token` avec le mot de passe `editor` configure cote serveur et verifier que la reponse contient `scope = editor` et `permissions = [read, update]`.
3. Tenter un `POST /api/conference` avec un token `editor` et verifier que l'API repond `401` pour scope insuffisant.
4. Appeler `POST /api/admin/token` avec le mot de passe `admin-plus` configure cote serveur et verifier que la reponse contient les permissions `create`, `update`, `delete`.
5. Ouvrir la page admin sans token puis verifier que les sections `Modifier`, `Creer`, `Supprimer` restent masquees tant que l'authentification n'est pas reussie.
6. Appeler `GET /api/admin/token` puis verifier que `requiredEnvironment` mentionne aussi `DATABASE_URL` en plus des variables de mot de passe admin.