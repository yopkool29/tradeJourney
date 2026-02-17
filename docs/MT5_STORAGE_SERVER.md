# MT5 Export Storage Server Setup

Guide complet pour configurer l'Expert Advisor MT5 avec le serveur de stockage Python.

## Architecture

```
MT5 EA (ExportHistory.mq5)
  ↓ POST CSV file
Python Storage Server (port 5000)
  ↓ stores file + returns file_id
TradeJourney
  ↓ polls for files
Python Storage Server
  ↓ retrieves file
TradeJourney (imports trades)
```

## Prérequis

- **MT5** avec l'EA `ExportHistory.mq5` compilé
- **Python 3.8+** avec Flask et requests
- **Serveur Python** en cours d'exécution sur port 5000
- **Token API** depuis TradeJourney (Settings → API Token)

## Installation du Serveur Python

### 1. Démarrer le serveur

```bash
cd tools/mt5-server
python app.py
```

Ou avec le script de démarrage :
```bash
bash start.sh  # Linux/Mac
start.bat      # Windows
```

Le serveur démarre sur `http://localhost:5000`

### 2. Vérifier que le serveur fonctionne

```bash
curl http://localhost:5000/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "timestamp": "2026-02-17T13:05:42.000000"
}
```

## Configuration de l'EA MT5

### 1. Ouvrir l'EA dans MetaEditor

- MetaTrader 5 → File → Open Data Folder
- Aller à : `MQL5/Experts/`
- Ouvrir `ExportHistory.mq5` dans MetaEditor

### 2. Configurer les paramètres

Dans MetaTrader 5, aller à : **Tools → Options → Expert Advisors**

Vérifier que :
- ✅ "Allow WebRequest for listed URLs" est coché
- ✅ Ajouter à la liste : `http://localhost:5000`

### 3. Compiler l'EA

Dans MetaEditor :
- F7 ou Compile
- Vérifier qu'il n'y a pas d'erreurs

### 4. Charger l'EA sur un graphique

- Glisser-déposer `ExportHistory.mq5` sur un graphique MT5
- Ou : Navigator → Experts → ExportHistory → Double-click

### 5. Configurer les paramètres de l'EA

Dans la fenêtre "Expert Advisors" qui apparaît, configurer :

#### Paramètres d'export local
```
daysToExport = 1              // Nombre de jours à exporter
importName = "MT5Export"      // Nom de l'import dans TradeJourney
accountFullname = "MetaTrader 5"  // Nom du compte
defaultExchange = "Forex"     // Bourse par défaut
saveLocalFile = true          // Sauvegarder localement
```

#### Paramètres du serveur de stockage
```
uploadToAPI = true            // Activer l'upload au serveur
apiURL = http://localhost:5000/api/mt5-export  // URL du serveur
apiToken = YOUR_API_TOKEN     // Token depuis TradeJourney
```

### 6. Obtenir votre API Token

1. Aller sur TradeJourney (http://localhost:3000)
2. Settings → API Token
3. Copier le token
4. Coller dans le paramètre `apiToken` de l'EA

## Utilisation

### Exporter l'historique

1. Ouvrir un graphique avec l'EA chargé
2. Cliquer sur le bouton **"EXPORT H."** en haut à droite
3. L'EA va :
   - Générer le CSV avec les trades des N derniers jours
   - Sauvegarder localement (si `saveLocalFile = true`)
   - Envoyer au serveur Python (si `uploadToAPI = true`)
   - Afficher un message de confirmation

### Vérifier les logs

Dans MT5, aller à : **View → Toolbox → Experts**

Vous verrez les messages :
```
History exported successfully. Deals: 5
File saved locally: MetaQuotes\Terminal\Common\Files\ReportHistory-123456789.csv
Uploading to MT5 Storage Server...
File uploaded to Storage Server successfully
```

## Endpoints du serveur Python

### Upload (MT5 → Serveur)
```
POST /api/mt5-export
Headers:
  X-API-Token: YOUR_API_TOKEN
  Content-Type: text/csv

Body: CSV file content

Response:
{
  "success": true,
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "ReportHistory-123456789.csv",
  "file_size": 2048,
  "timestamp": "2026-02-17T13:05:42.000000"
}
```

### Lister les fichiers (TradeJourney)
```
GET /api/mt5-export/list
Headers:
  X-API-Token: YOUR_API_TOKEN

Response:
{
  "count": 1,
  "files": [
    {
      "file_id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "ReportHistory-123456789.csv",
      "timestamp": "2026-02-17T13:05:42.000000",
      "file_size": 2048,
      "retrieved": false
    }
  ]
}
```

### Récupérer un fichier (TradeJourney)
```
GET /api/mt5-export/retrieve/{file_id}
Headers:
  X-API-Token: YOUR_API_TOKEN

Response: CSV file (binary)
```

### Supprimer un fichier (TradeJourney)
```
DELETE /api/mt5-export/delete/{file_id}
Headers:
  X-API-Token: YOUR_API_TOKEN

Response:
{
  "success": true,
  "message": "File deleted successfully",
  "file_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Déploiement avec ngrok (accès distant)

### 1. Installer ngrok

```bash
# macOS
brew install ngrok

# Windows
choco install ngrok

# Linux
apt install ngrok
```

### 2. Démarrer le serveur Python

```bash
cd tools/mt5-server
python app.py
```

### 3. Exposer avec ngrok

```bash
ngrok http 5000
```

Vous obtenez une URL comme : `https://abc123.ngrok.io`

### 4. Configurer l'EA MT5

Dans les paramètres de l'EA :
```
apiURL = https://abc123.ngrok.io/api/mt5-export
```

### 5. Ajouter à la liste blanche MT5

Tools → Options → Expert Advisors :
- Ajouter : `https://abc123.ngrok.io`

## Troubleshooting

### "WebRequest error: -1"

**Cause** : L'URL n'est pas dans la liste blanche MT5

**Solution** :
1. Tools → Options → Expert Advisors
2. Cocher "Allow WebRequest for listed URLs"
3. Ajouter `http://localhost:5000` (ou votre URL ngrok)
4. Redémarrer MT5

### "API token required"

**Cause** : Le token n'est pas configuré ou est vide

**Solution** :
1. Aller sur TradeJourney → Settings
2. Copier votre API Token
3. Coller dans le paramètre `apiToken` de l'EA
4. Recompiler l'EA

### "Cannot connect to server"

**Cause** : Le serveur Python n'est pas en cours d'exécution

**Solution** :
```bash
cd tools/mt5-server
python app.py
```

Vérifier que le serveur démarre sur `http://localhost:5000`

### Fichiers ne s'affichent pas dans TradeJourney

**Cause** : TradeJourney ne poll pas encore les fichiers

**Solution** : En attente de l'implémentation de l'endpoint dans TradeJourney qui :
1. Appelle `GET /api/mt5-export/list`
2. Télécharge chaque fichier avec `GET /api/mt5-export/retrieve/{file_id}`
3. Traite le CSV comme un import normal
4. Supprime le fichier avec `DELETE /api/mt5-export/delete/{file_id}`

## Format du CSV

Le CSV généré par l'EA contient les colonnes suivantes :

```
importName,accountName,accountFullname,openDate,closeDate,symbol,type,lot,openPrice,closePrice,profit,stopLoss,takeProfit,commission,exchange,extendId,profit_points,screenshotUrl,mae,mfe
```

Exemple :
```
MT5Export,123456789,MetaTrader 5,2026-02-17 10:30:00,2026-02-17 11:45:00,EURUSD,buy,1.0,1.0850,1.0860,100.00,1.0840,1.0870,5.00,Forex,,10,,0,100
```

## Stockage des fichiers

Les fichiers sont stockés sur le serveur Python dans :

```
tools/mt5-server/storage/
├── {uuid}.csv              # Fichier CSV
└── metadata/
    └── {uuid}.json         # Métadonnées
```

Chaque fichier a un UUID unique et des métadonnées contenant :
- `file_id` : UUID du fichier
- `original_filename` : Nom original du fichier
- `api_token` : Token utilisé pour l'upload
- `timestamp` : Date/heure de l'upload
- `file_size` : Taille du fichier en bytes
- `retrieved` : Si le fichier a été téléchargé
- `remote_addr` : Adresse IP de MT5

## Logs du serveur

Les logs sont écrits dans `tools/mt5-server/mt5-server.log`

Pour activer le mode debug :
```env
DEBUG=true
```

Cela affichera plus de détails sur chaque requête.

## Sécurité

- ✅ Authentification par token API
- ✅ Vérification du token pour chaque requête
- ✅ Isolation des fichiers par utilisateur (token)
- ✅ Métadonnées stockées pour audit
- ✅ HTTPS recommandé en production (ngrok fournit HTTPS)

## Prochaines étapes

1. ✅ Serveur Python créé et fonctionnel
2. ✅ EA MT5 configuré pour envoyer vers le serveur
3. ⏳ Créer endpoint dans TradeJourney pour récupérer les fichiers
4. ⏳ Implémenter la logique d'import automatique

## Support

Pour les problèmes :
1. Vérifier les logs MT5 (View → Toolbox → Experts)
2. Vérifier les logs du serveur (`tail -f mt5-server.log`)
3. Tester l'endpoint avec curl :
   ```bash
   curl -H "X-API-Token: YOUR_TOKEN" http://localhost:5000/health
   ```
