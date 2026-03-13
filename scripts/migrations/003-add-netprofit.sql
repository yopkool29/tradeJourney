-- AlterTable
ALTER TABLE "SCHEMA_PLACEHOLDER"."Trade" ADD COLUMN     "netProfit" DOUBLE PRECISION;

-- Calculate netProfit for existing trades
-- netProfit = profit - commission (or profit if commission is null)
UPDATE "SCHEMA_PLACEHOLDER"."Trade" 
SET "netProfit" = "profit" - COALESCE("commission", 0)
WHERE "netProfit" IS NULL;

-- Make netProfit NOT NULL after populating existing data
ALTER TABLE "SCHEMA_PLACEHOLDER"."Trade" ALTER COLUMN "netProfit" SET NOT NULL;

-- Add comment to clarify the columns
COMMENT ON COLUMN "SCHEMA_PLACEHOLDER"."Trade"."profit" IS 'Profit BRUT (avant déduction des commissions)';
COMMENT ON COLUMN "SCHEMA_PLACEHOLDER"."Trade"."netProfit" IS 'Profit NET (après déduction des commissions)';
COMMENT ON COLUMN "SCHEMA_PLACEHOLDER"."Trade"."commission" IS 'Commission totale du trade';