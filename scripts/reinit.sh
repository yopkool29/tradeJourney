#!/bin/bash
# 1. Reset complet
docker compose -f docker-compose.dev.yml exec -T postgres psql -U tradejourney -d tradejourney < scripts/reset-database.sql
# 2. Recréer les fonctions PostgreSQL
docker compose -f docker-compose.dev.yml exec -T postgres psql -U tradejourney -d tradejourney < scripts/init-db.sql
# 3. Appliquer les migrations Prisma Auth
pnpm prisma migrate deploy --schema=prisma/auth/schema.prisma
# 4. Créer l'utilisateur admin
node scripts/create-user.mjs