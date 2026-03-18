-- Migration v4: Add metadata JSONB to multiple tables
-- Idempotent: uses IF NOT EXISTS for safe re-run

-- AlterTable
ALTER TABLE "SCHEMA_PLACEHOLDER"."Screenshot" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AlterTable
ALTER TABLE "SCHEMA_PLACEHOLDER"."TagGroup" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AlterTable
ALTER TABLE "SCHEMA_PLACEHOLDER"."Tag" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AlterTable
ALTER TABLE "SCHEMA_PLACEHOLDER"."DayTag" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AlterTable
ALTER TABLE "SCHEMA_PLACEHOLDER"."Account" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AlterTable
ALTER TABLE "SCHEMA_PLACEHOLDER"."ConfigSymbol" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AlterTable
ALTER TABLE "SCHEMA_PLACEHOLDER"."DailyNote" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

