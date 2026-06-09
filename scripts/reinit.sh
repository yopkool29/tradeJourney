#!/bin/bash
set -e

# Charger et exporter les variables du .env
set -a
source .env
set +a

# 1. Reset complet
docker compose -f docker-compose.dev.yml exec -T postgres psql -U "${POSTGRES_USER:-pnltracker}" -d "${POSTGRES_DB:-pnltracker}" < scripts/reset-database.sql
# 2. Recréer les fonctions PostgreSQL
docker compose -f docker-compose.dev.yml exec -T postgres psql -U "${POSTGRES_USER:-pnltracker}" -d "${POSTGRES_DB:-pnltracker}" < scripts/init-db.sql
# 3. Appliquer les migrations Prisma Auth
pnpm prisma migrate deploy --schema=prisma/auth/schema.prisma
# 4. Créer l'utilisateur admin
npx tsx scripts/create-user.ts