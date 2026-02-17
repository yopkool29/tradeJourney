#!/bin/sh

echo "=== Initialisation PostgreSQL ==="

# Créer les répertoires nécessaires pour uploads
mkdir -p /app/upload
mkdir -p /app/upload/screenshots
mkdir -p /app/temp
mkdir -p /app/temp/exports

# Attendre que PostgreSQL soit prêt
echo "Attente de PostgreSQL..."
until pg_isready -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER}; do
  echo "PostgreSQL n'est pas encore prêt - attente..."
  sleep 2
done
echo "✓ PostgreSQL est prêt"

# --- Créer les fonctions PostgreSQL ---
echo "Création des fonctions PostgreSQL..."
if [ -f /app/scripts/init-db.sql ]; then
  PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f /app/scripts/init-db.sql
  echo "✓ Fonctions PostgreSQL créées"
else
  echo "⚠ Script init-db.sql non trouvé"
fi

# --- Migrations Auth (schéma public) ---
echo "Application des migrations AUTH..."
if [ -f /app/prisma/auth/schema.prisma ]; then
  npx prisma migrate deploy --schema=/app/prisma/auth/schema.prisma
  echo "✓ Migrations AUTH appliquées"
else
  echo "⚠ Schéma AUTH non trouvé à /app/prisma/auth/schema.prisma"
fi

# --- Créer l'utilisateur admin ---
echo "Création de l'utilisateur admin..."
if [ -f /app/scripts/docker-create-user.ts ]; then
  npx tsx /app/scripts/docker-create-user.ts
else
  echo "⚠ Script docker-create-user.ts non trouvé"
fi

echo "=== Initialisation terminée ==="
echo "Démarrage de l'application..."

# Continuer avec le démarrage normal de l'application
exec "$@"
