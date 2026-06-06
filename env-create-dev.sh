#!/bin/bash

# Script pour créer un fichier .env de développement à partir de .env.example
# Génère automatiquement les mots de passe aléatoires et les URLs PostgreSQL

set -e

if [ ! -f ".env.example" ]; then
    echo "❌ Fichier .env.example introuvable"
    exit 1
fi

if [ -f ".env" ]; then
    echo "⚠️  Le fichier .env existe déjà. Voulez-vous le remplacer ? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Opération annulée"
        exit 0
    fi
fi

generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

generate_jwt_secret() {
    openssl rand -hex 32
}

generate_admin_token() {
    openssl rand -base64 24 | tr -d "=+/" | cut -c1-24
}

POSTGRES_PASSWORD=$(generate_password)
JWT_SECRET=$(generate_jwt_secret)
ADMIN_API_TOKEN=$(generate_admin_token)

echo "🔐 Génération des secrets..."

awk -v postgres_pass="$POSTGRES_PASSWORD" -v jwt_secret="$JWT_SECRET" -v admin_token="$ADMIN_API_TOKEN" '
{
    gsub(/postgresPassword1234/, postgres_pass)
    if ($0 ~ /^JWT_SECRET=CHANGE_ME_TO_RANDOM_SECRET/) {
        sub(/CHANGE_ME_TO_RANDOM_SECRET/, jwt_secret)
    }
    if ($0 ~ /^ADMIN_API_TOKEN=CHANGE_ME_TO_RANDOM_SECRET/) {
        sub(/CHANGE_ME_TO_RANDOM_SECRET/, admin_token)
    }
    print
}
' .env.example > .env

echo "📝 Fichier .env créé avec succès !"
echo ""
echo "🔒 Secrets générés :"
echo "   PostgreSQL Password: $POSTGRES_PASSWORD"
echo "   JWT Secret: $JWT_SECRET"
echo "   Admin API Token: $ADMIN_API_TOKEN"
echo ""
echo "⚠️  IMPORTANT :"
echo "   - Le fichier .env ne doit JAMAIS être commité dans git"
echo "   - Vérifiez et ajustez les autres paramètres si nécessaire"
echo ""
echo "🔍 Vérifiez le contenu avec : cat .env"
