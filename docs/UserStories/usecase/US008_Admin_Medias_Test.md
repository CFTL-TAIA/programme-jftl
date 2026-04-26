# US008_Admin_Medias_Test

## Cas de tests d'acceptance

1. Appeler `POST /api/admin/media` sans JWT puis verifier que l'API repond `401`.
2. Charger une photo speaker valide inferieure a `2 Mo` et verifier que la reponse contient `publicPath` et `requiresResourceSave`.
3. Charger un logo entreprise de plus de `2 Mo` puis verifier qu'un message d'erreur explicite est retourne.
4. Charger une photo depassant `1200 x 1600 px` puis verifier qu'un message d'erreur explicite est retourne.
5. Avec les tokens Blob presents, verifier que `publicPath` utilise une URL `.blob.vercel-storage.com` ; sans token, verifier que le chemin reste sous `/assets/media/`.
6. Supprimer un `speaker` avec photo geree par TAIA puis verifier que la ressource disparait et que le media associe est supprime du stockage.
7. Supprimer une `entreprise` avec logo gere par TAIA puis verifier que la ressource disparait et que le media associe est supprime du stockage.
8. Apres un create, update ou delete reussi dans l'admin, verifier qu'un rechargement complet intervient environ `1 s` plus tard et affiche l'etat persiste.