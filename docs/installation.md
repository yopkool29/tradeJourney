---
layout: default
title: Installation - TradeJourney
description: Guide d'installation de TradeJourney
---

# 🚀 Installation de TradeJourney

Guide complet pour installer et configurer TradeJourney sur votre machine.

## Prérequis

Avant de commencer, assurez-vous d'avoir :

- **Docker** et **Docker Compose** installés (recommandé)
- OU **Node.js 18+** pour une installation manuelle
- Au moins **500 MB** d'espace disque
- Un navigateur moderne (Chrome, Firefox, Safari, Edge)

---

## 🐳 Installation avec Docker (Recommandé)

La méthode la plus simple pour démarrer rapidement.

### 1. Cloner le repository

```bash
git clone https://github.com/yourusername/tradeJourney.git
cd tradeJourney
```

### 2. Configurer l'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer le fichier .env si nécessaire
nano .env
```

**Configuration minimale (.env) :**
```bash
# Port de l'application
PORT=3000

# Mode debug (false en production)
DEBUG_MODE=false

# Taille max des uploads (10MB)
MAX_FILE_SIZE=10485760
```

### 3. Démarrer l'application

```bash
# Mode développement
docker-compose -f docker-compose.dev.yml up -d

# OU Mode production
docker-compose up -d
```

### 4. Accéder à l'application

Ouvrez votre navigateur sur : **http://localhost:3000**

### 5. Créer votre compte

1. Cliquez sur **"S'inscrire"**
2. Remplissez vos informations
3. Créez votre première base de données
4. Commencez à importer vos trades !

---

## 💻 Installation manuelle (sans Docker)

Pour les utilisateurs avancés ou environnements sans Docker.

### 1. Prérequis

```bash
# Vérifier Node.js (version 18 ou supérieure)
node --version

# Vérifier npm
npm --version
```

### 2. Cloner et installer

```bash
# Cloner le repository
git clone https://github.com/yourusername/tradeJourney.git
cd tradeJourney

# Installer les dépendances
npm install
```

### 3. Configurer l'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer la configuration
nano .env
```

### 4. Initialiser la base de données

```bash
# Créer le dossier de données
mkdir -p data

# Les bases de données SQLite seront créées automatiquement
```

### 5. Démarrer l'application

```bash
# Mode développement
npm run dev

# OU Mode production
npm run build
npm run start
```

### 6. Accéder à l'application

Ouvrez votre navigateur sur : **http://localhost:3000**

---

## 🔧 Configuration avancée

### Variables d'environnement

Toutes les options disponibles dans le fichier `.env` :

```bash
# === Application ===
PORT=3000                    # Port du serveur
DEBUG_MODE=false             # Mode debug (logs détaillés)
APP_VERSION=1.0.0           # Version de l'application

# === Fichiers ===
MAX_FILE_SIZE=10485760      # Taille max uploads (10MB)

# === API externes (optionnel) ===
POLYGON_API_KEY=            # Clé API Polygon.io
NINJATRADER_API_ENABLE=false # Activer NinjaTrader API
QUANTOWER_ENABLE=false      # Activer Quantower

# === Logging ===
ENABLE_ROUTE_LOGGER=false   # Logger les routes
ENABLE_API_LOGGER=false     # Logger les requêtes API
```

### Configurer le port

Par défaut, TradeJourney utilise le port 3000. Pour changer :

```bash
# Dans .env
PORT=8080
```

Puis redémarrez l'application.

### Configurer les uploads

Pour augmenter la taille max des fichiers :

```bash
# Dans .env (en bytes, ici 50MB)
MAX_FILE_SIZE=52428800
```

### Activer le mode debug

Pour voir les logs détaillés :

```bash
# Dans .env
DEBUG_MODE=true
ENABLE_API_LOGGER=true
```

---

## 🗄️ Gestion des données

### Emplacement des données

Les données sont stockées dans le dossier `data/` :

```
data/
├── user_1_data/
│   ├── database1/
│   │   ├── database.db      # Base SQLite
│   │   └── screenshots/     # Screenshots des trades
│   └── database2/
│       └── database.db
└── user_2_data/
    └── ...
```

### Backup des données

**Méthode 1 : Copie manuelle**

```bash
# Sauvegarder tout le dossier data
cp -r data/ backup/data-$(date +%Y%m%d)/
```

**Méthode 2 : Script automatique**

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="backup/$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r data/ $BACKUP_DIR/
echo "Backup créé dans $BACKUP_DIR"
```

**Méthode 3 : Avec Docker**

```bash
# Créer un volume Docker pour les données
docker-compose down
docker run --rm -v tradejourney_data:/data -v $(pwd)/backup:/backup alpine tar czf /backup/data-backup.tar.gz /data
```

### Restaurer une sauvegarde

```bash
# Arrêter l'application
docker-compose down

# Restaurer les données
rm -rf data/
cp -r backup/data-20240315/ data/

# Redémarrer
docker-compose up -d
```

---

## 🔄 Mise à jour

### Avec Docker

```bash
# Arrêter l'application
docker-compose down

# Sauvegarder les données
cp -r data/ backup/

# Récupérer la dernière version
git pull origin main

# Reconstruire l'image
docker-compose build

# Redémarrer
docker-compose up -d
```

### Sans Docker

```bash
# Sauvegarder les données
cp -r data/ backup/

# Récupérer la dernière version
git pull origin main

# Mettre à jour les dépendances
npm install

# Reconstruire
npm run build

# Redémarrer
npm run start
```

---

## 🐛 Dépannage

### L'application ne démarre pas

**Vérifier les logs :**
```bash
# Avec Docker
docker-compose logs -f

# Sans Docker
npm run dev
```

**Vérifier le port :**
```bash
# Voir si le port est déjà utilisé
lsof -i :3000

# Ou changer le port dans .env
PORT=8080
```

### Erreur de base de données

```bash
# Vérifier les permissions
chmod -R 755 data/

# Recréer la base si nécessaire
rm data/user_X_data/database/database.db
# La base sera recréée au prochain démarrage
```

### Problèmes d'import

**Import MT5 échoue :**
- Vérifiez que le fichier est bien au format HTML
- Vérifiez que le fichier contient bien les colonnes attendues
- Essayez avec un fuseau horaire différent

**Commissions négatives :**
- Utilisez le bouton "Fix" dans la console LogView
- Ou réimportez avec la dernière version

### Performances lentes

```bash
# Nettoyer les données inutiles
npm run cleanup

# Optimiser la base de données
sqlite3 data/user_X_data/database/database.db "VACUUM;"

# Augmenter les ressources Docker
# Dans docker-compose.yml, ajouter :
deploy:
  resources:
    limits:
      memory: 2G
```

---

## 🔐 Sécurité

### Recommandations

1. **Ne pas exposer sur Internet** sans reverse proxy (nginx, Caddy)
2. **Utiliser HTTPS** en production
3. **Sauvegarder régulièrement** vos données
4. **Mettre à jour** régulièrement l'application
5. **Protéger le fichier .env** (ne jamais le commiter)

### Déploiement en production

Pour un déploiement sécurisé :

1. Utilisez un reverse proxy (nginx, Traefik)
2. Configurez SSL/TLS
3. Limitez l'accès par IP si possible
4. Activez les backups automatiques
5. Surveillez les logs

**Exemple nginx :**
```nginx
server {
    listen 443 ssl;
    server_name tradejourney.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📱 Accès mobile

TradeJourney est responsive et fonctionne sur mobile :

1. Assurez-vous que votre appareil est sur le même réseau
2. Trouvez l'IP de votre machine : `ip addr` ou `ifconfig`
3. Accédez depuis mobile : `http://192.168.1.X:3000`

Pour un accès permanent, configurez un nom de domaine local ou utilisez un VPN.

---

## 🆘 Besoin d'aide ?

- 📖 [Documentation complète](/documentation)
- 💬 [GitHub Issues](https://github.com/yourusername/tradeJourney/issues)
- 📧 Email : contact@tradejourney.com
- 💡 [FAQ](/documentation#faq)

---

## ✅ Checklist post-installation

- [ ] Application accessible sur http://localhost:3000
- [ ] Compte utilisateur créé
- [ ] Première base de données créée
- [ ] Premier compte de trading configuré
- [ ] Premier import de trades réussi
- [ ] Dashboard affiche les données
- [ ] Backup configuré

---

[← Retour à l'accueil](/) | [Documentation →](/documentation)
