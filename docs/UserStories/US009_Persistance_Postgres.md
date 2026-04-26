# US009 - Persistance Postgres

## User Story

En tant qu'administrateur du projet API TAIA, je veux que les donnees metier soient persistees dans une base Postgres dediee au lieu de Blob afin que les creations, modifications et suppressions soient visibles rapidement et de maniere fiable.

## Valeur attendue

- fiabiliser les CRUD admin en production
- aligner le comportement local sur le comportement prod avec une vraie base de dev
- conserver les JSON versionnes comme source de seed

## Criteres d'acceptation

1. Quand `DATABASE_URL` est configuree, les routes CRUD metier utilisent Postgres pour `conference`, `speaker`, `salle` et `entreprise`.
2. Le projet peut utiliser une base de `dev` differente de la base de `prod`.
3. Le projet fournit un seed pour charger les JSON versionnes dans Postgres.
4. Les donnees metier ne repassent plus par une persistance runtime JSON locale.
5. Les medias admin restent stockes dans Blob ou en local selon la configuration media.