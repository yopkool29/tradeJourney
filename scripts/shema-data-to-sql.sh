#!/bin/bash
# Régénérer le script SQL pour les schémas utilisateur
pnpm prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/data/schema.prisma \
  --script | sed 's/"public"\./"SCHEMA_PLACEHOLDER"\./g' | grep -v 'CREATE SCHEMA IF NOT EXISTS "public"' > scripts/migrations/000-initial-schema.sql

# Ajouter les GRANT et REVOKE pour l'isolation par rôles (à faire manuellement après la génération)
cat >> scripts/migrations/000-initial-schema.sql << 'EOF'

-- Grant permissions to the role for all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "SCHEMA_PLACEHOLDER" TO "ROLE_PLACEHOLDER";

-- Grant permissions on sequences (for auto-increment IDs)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "SCHEMA_PLACEHOLDER" TO "ROLE_PLACEHOLDER";

-- Grant default privileges for future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA "SCHEMA_PLACEHOLDER" GRANT ALL PRIVILEGES ON TABLES TO "ROLE_PLACEHOLDER";
ALTER DEFAULT PRIVILEGES IN SCHEMA "SCHEMA_PLACEHOLDER" GRANT ALL PRIVILEGES ON SEQUENCES TO "ROLE_PLACEHOLDER";

-- Revoke direct access from main user to enforce role-based isolation
-- The main user must use SET ROLE to access this schema
REVOKE ALL ON ALL TABLES IN SCHEMA "SCHEMA_PLACEHOLDER" FROM MAIN_USER_PLACEHOLDER;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "SCHEMA_PLACEHOLDER" FROM MAIN_USER_PLACEHOLDER;

EOF