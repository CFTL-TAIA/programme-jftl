# US009_Persistance_Postgres_Test

## Cas de test d'acceptation

1. Configurer `DATABASE_URL` sur une base de dev, lancer `npm run seed-postgres`, puis verifier que `GET /api/speaker` retourne les donnees attendues.
2. Creer un speaker depuis l'admin avec `DATABASE_URL` active puis verifier que la creation est visible sans erreur de synchronisation Blob.
3. Configurer une `DATABASE_URL` differente en `Production` et verifier qu'une creation en prod n'apparait pas dans la base de dev.
4. Retirer `DATABASE_URL` puis verifier que les CRUD metier echouent avec un message explicite indiquant que `DATABASE_URL` est requise.
5. Verifier que `POST /api/admin/media` continue d'utiliser Blob pour les medias quand `taia_READ_WRITE_TOKEN` est configure.