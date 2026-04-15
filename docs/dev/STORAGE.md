# Storage Server

## Lancer avec Docker

```bash
docker compose -f docker-compose.storage.yml up -d --build
```

## Arrêter

```bash
docker compose -f docker-compose.storage.yml down
```

## Voir les logs

```bash
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