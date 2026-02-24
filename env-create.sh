#!/bin/bash

# Script pour créer un fichier .env de production à partir de .env.production.example
# Génère automatiquement les mots de passe aléatoires

set -e  # Exit on error

# Vérifier que le fichier exemple existe
if [ ! -f ".env.production.example" ]; then
    echo "❌ Fichier .env.production.example introuvable"
    exit 1
fi

# Vérifier que .env n'existe pas déjà
if [ -f ".env" ]; then
    echo "⚠️  Le fichier .env existe déjà. Voulez-vous le remplacer ? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Opération annulée"
        exit 0
    fi
fi

# Fonction pour générer un mot de passe PostgreSQL (sans / pour éviter les problèmes)
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Fonction pour générer un secret JWT (plus long, avec caractères spéciaux)
generate_jwt_secret() {
    openssl rand -hex 32
}

# Fonction pour générer un token admin (différent du JWT)
generate_admin_token() {
    openssl rand -base64 24 | tr -d "=+/" | cut -c1-24
}

echo "🔐 Génération des mots de passe..."

# Générer les secrets (séparément pour garantir qu'ils sont différents)
POSTGRES_PASSWORD=$(generate_password)
JWT_SECRET=$(generate_jwt_secret)
ADMIN_API_TOKEN=$(generate_admin_token)

echo "✅ Secrets générés"

# Remplacer les valeurs en utilisant une méthode plus sûre
# Utiliser awk pour éviter les problèmes avec les caractères spéciaux
awk -v postgres_pass="$POSTGRES_PASSWORD" -v jwt_secret="$JWT_SECRET" -v admin_token="$ADMIN_API_TOKEN" '
{
    if ($0 ~ /CHANGE_ME_TO_STRONG_PASSWORD/) {
        sub(/CHANGE_ME_TO_STRONG_PASSWORD/, postgres_pass)
    }
    if ($0 ~ /^JWT_SECRET=CHANGE_ME_TO_RANDOM_SECRET/) {
        sub(/CHANGE_ME_TO_RANDOM_SECRET/, jwt_secret)
    }
    if ($0 ~ /^ADMIN_API_TOKEN=CHANGE_ME_TO_RANDOM_SECRET/) {
        sub(/CHANGE_ME_TO_RANDOM_SECRET/, admin_token)
    }
    print
}
' .env.production.example > .env

echo "📝 Fichier .env créé avec succès !"
echo ""
echo "🔒 Secrets générés :"
echo "   PostgreSQL Password: $POSTGRES_PASSWORD"
echo "   JWT Secret: $JWT_SECRET"
echo "   Admin API Token: $ADMIN_API_TOKEN"
echo ""
echo "⚠️  IMPORTANT :"
echo "   - Sauvegardez ces secrets en lieu sûr"
echo "   - Le fichier .env ne doit JAMAIS être commité dans git"
echo "   - Vérifiez et ajustez les autres paramètres si nécessaire"
echo ""
echo "🔍 Vérifiez le contenu avec : cat .env"
