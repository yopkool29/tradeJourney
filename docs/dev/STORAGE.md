# Storage Server

Le `docker-compose.storage.yml` et la doc de déploiement complète ont été déplacés dans le repo privé `pnltracker-private-tools`.

Voir : [`pnltracker-private-tools/docs/STORAGE_DEPLOY.md`](../../pnltracker-private-tools/docs/STORAGE_DEPLOY.md)

## Lancer avec Docker

```bash
cd pnltracker-private-tools
docker compose -f docker-compose.storage.yml up -d --build
```

## Arrêter

```bash
cd pnltracker-private-tools
docker compose -f docker-compose.storage.yml down
```

## Voir les logs

```bash
cd pnltracker-private-tools
docker compose -f docker-compose.storage.yml logs -f
```

## Variables d'environnement (`.env`)

```env
STORAGE_SERVER_PORT=5000
STORAGE_SERVER_DEBUG=false
CLEANUP_DAYS_OLD=2
```

## Notes

- Les fichiers sont persistés dans le volume Docker `storage_data`
- Le service `storage-cleanup` tourne en boucle toutes les heures et supprime les fichiers plus vieux que `CLEANUP_DAYS_OLD` jours
- L'API token est passé via le header `X-API-Token` dans les requêtes
