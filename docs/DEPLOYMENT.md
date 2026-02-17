# TradeJourney Deployment

This document explains the different deployment modes of TradeJourney with PostgreSQL.

## 📋 Table of Contents

1. [Local Development](#local-development)
2. [Production Deployment](#production-deployment)
3. [Useful Commands](#useful-commands)

---

## <a id="local-development"></a>🛠️ Local Development

### Prerequisites
- Docker and Docker Compose installed
- Node.js >=20 and pnpm
- Environment variables configured in `.env`

### Startup

#### 1. Start PostgreSQL only

```bash
# Start the PostgreSQL database
docker compose -f ./docker-compose.dev.yml up -d

# Check that PostgreSQL is ready
docker compose -f ./docker-compose.dev.yml ps
```

#### 2. Configure environment variables

Copy `.env.example` to `.env` and edit the values:

```bash
cp .env.example .env
```

#### 3. Generate Prisma clients

```bash

rm -rf generated

# Generate Auth client
pnpm prisma generate --schema=prisma/auth/schema.prisma

# Generate Data client
pnpm prisma generate --schema=prisma/data/schema.prisma
```

#### 4. Initialize database, create admin user

**Old data in the db will be deleted**

```bash
./scripts/reinit.sh
```

**After modifying the Data schema** (optional, only if you modify `prisma/data/schema.prisma`):

```bash
# Regenerate SQL script for user schemas
pnpm prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/data/schema.prisma \
  --script | sed 's/"public"\./"SCHEMA_PLACEHOLDER"\./g' | grep -v 'CREATE SCHEMA IF NOT EXISTS "public"' > scripts/migrations/000-initial-schema.sql

# Add GRANT and REVOKE for role-based isolation (to be done manually after generation)
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
```

**Note**: Data tables are created automatically when creating a user database via the web interface.

#### 6. Start the Nuxt application

```bash
npm dev
```

The application will be accessible at `http://localhost:3000`

### Stopping the database

```bash
# Stop PostgreSQL
docker compose -f docker-compose.dev.yml down
```

---


## <a id="production-deployment"></a>🚀 Production Deployment

### Architecture

Production deployment uses `docker-compose.yml` which contains:
- **PostgreSQL**: Database with persistent volumes
- **App**: Built Nuxt application served by Node.js

### Prerequisites

- Docker and Docker Compose installed on the server
- Environment variables configured (via `.env` or system variables)

### Startup

#### 1. Configure environment variables

**⚠️ IMPORTANT**: The `.env.production` file is **MANDATORY** in production. Docker Compose will not start without it.

Create a `.env.production` file on the server with production values:

```bash
cp .env.production.example .env.production

# Edit the .env.production file with your values
nano .env.production

# Generate a strong JWT secret (if necessary)
openssl rand -base64 32
```

#### 2. Build and startup

*Linux:*
```bash
# Load environment variables from .env.production under Linux
export $(grep -v '^#' .env.production | xargs)
```

*Windows: (powershell)*
```bash
# Load environment variables from .env.production under Windows
Get-Content .\.env.production |
  Where-Object { $_ -and $_ -notmatch '^\s*#' -and $_ -match '=' } |
  ForEach-Object {
    $name, $value = $_ -split '=', 2
    $name = $name.Trim()
    $value = $value.Trim().Trim('"')
    Set-Item -Path "Env:$name" -Value $value
  }
```

*Build and startup:*
```bash
docker compose build --no-cache

# Build and start all services
docker compose up -d --build
```

### Update

```bash
# Retrieve latest modifications
git pull

# Rebuild and restart
docker compose up -d --build
```

### Backup

```bash
# Database backup
docker compose exec postgres pg_dump -U tradejourney tradejourney > backup_$(date +%Y%m%d_%H%M%S).sql

# Restoration
docker compose exec -T postgres psql -U tradejourney tradejourney < backup_20260124_180000.sql
```

---

## <a id="useful-commands"></a>🔧 Useful Commands

### Prisma

```bash
# Open Prisma Studio
pnpm prisma studio --schema=prisma/auth/schema.prisma
```

### Tests

```bash
# Run all tests
pnpm test

# Run a specific test file
pnpm test tests/mt5-parser.test.ts
```

### Docker

```bash
# View logs
docker compose logs -f [service]

# Restart a service
docker compose restart [service]

# View resource usage
docker compose stats

# Clean unused volumes
docker volume prune
```

---

## 🔐 Security

### Production

- ✅ Change `POSTGRES_PASSWORD` with a strong password
- ✅ Change `JWT_SECRET` with a long random key
- ✅ Do not expose PostgreSQL port (5432) publicly
- ✅ Use HTTPS with a reverse proxy (nginx, Caddy, Traefik)
- ✅ Configure automatic backups
- ✅ Limit PostgreSQL connections by IP if possible

### Development

- ⚠️ Never commit the `.env` file
- ⚠️ Use different passwords between dev and prod
- ⚠️ Do not use the same JWT keys between environments

---

### 📊 PostgreSQL Metrics

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('tradejourney'));

-- Size per schema
SELECT 
    table_schema as schema_name,
    pg_size_pretty(SUM(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name)))::bigint) as size
FROM information_schema.tables
GROUP BY table_schema
ORDER BY SUM(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name))) DESC;

-- Active connections count
SELECT count(*) FROM pg_stat_activity;
```

---

## 🔄 Schema Migrations (Data Database)

### Incremental migrations system

The project uses an incremental migrations system for the Data database (multi-tenant). This allows adding or modifying columns **without losing existing data**.

### Migration workflow

#### 1. Backup current schema

Before modifying `prisma/data/schema.prisma`, create a backup copy:

```bash
cp prisma/data/schema.prisma prisma/data/schema.prev.prisma.bak
```

#### 2. Modify schema and regenerate Prisma client

Make your modifications in `prisma/data/schema.prisma` (add columns, modify types, etc.), then regenerate the Prisma client:

```bash
pnpm prisma generate --schema=prisma/data/schema.prisma
```

#### 3. Generate migration script

```bash
# Generate incremental SQL migration
pnpm prisma migrate diff \
  --from-schema-datamodel prisma/data/schema.prev.prisma.bak \
  --to-schema-datamodel prisma/data/schema.prisma \
  --script | sed 's/"public"\./"SCHEMA_PLACEHOLDER"\./g' \
  > scripts/migrations/XXX-description.sql
```

Replace `XXX-description` with a descriptive name (e.g., `001-add-timezone-to-account`).

#### 4. Register migration in migrations.json

Add an entry in `scripts/migrations/migrations.json` so the automatic migration system detects and applies the new script:

```json
{
  "migrations": [
    {
      "version": 0,
      "name": "initial-schema",
      "description": "Initial database schema with all tables",
      "file": "000-initial-schema.sql",
      "date": "2026-01-29"
    },
    {
      "version": 2,
      "name": "XXX-description",
      "description": "Migration description",
      "file": "XXX-description.sql",
      "date": "YYYY-MM-DD"
    }
  ]
}
```

- **`version`**: must be higher than the version stored in DB (`migrationVersion`). The target version is calculated automatically from the largest `version` in the array.
- **`file`**: exact name of the SQL file in `scripts/migrations/`

#### 5. Migration application

Migrations are **applied automatically** on each user connection, in dev and prod. The system (`server/utils/migrations.ts`) compares the schema version with `migrations.json` and executes missing migrations.

Simply **restart the server** (or wait for the next user connection) for the migration to be applied.

> **Manual fallback** (only in case of problems):
> ```bash
> # For a specific schema
> sed 's/SCHEMA_PLACEHOLDER/user_1_db_main/g' scripts/migrations/XXX-description.sql | \
>   docker compose exec -T postgres psql -U tradejourney -d tradejourney
> ```

### ⚠️ Important

- **Always test** the migration on a development database before applying it in production
- **Backup** the database before applying a migration in production
- Migrations are **irreversible** - create a reverse migration if necessary
- The multi-tenant system requires applying the migration to **every user schema**
