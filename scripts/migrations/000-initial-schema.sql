-- CreateSchema

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."Trade" (
    "id" SERIAL NOT NULL,
    "uniqueId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "openDate" TIMESTAMP(3) NOT NULL,
    "closeDate" TIMESTAMP(3) NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lot" DOUBLE PRECISION NOT NULL,
    "openPrice" DOUBLE PRECISION NOT NULL,
    "closePrice" DOUBLE PRECISION NOT NULL,
    "stopLoss" DOUBLE PRECISION DEFAULT 0,
    "takeProfit" DOUBLE PRECISION DEFAULT 0,
    "profit" DOUBLE PRECISION NOT NULL,
    "profit_points" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION DEFAULT 0,
    "exchange" DOUBLE PRECISION DEFAULT 0,
    "note" TEXT,
    "screenshotUrl" TEXT,
    "accountId" INTEGER NOT NULL,
    "importName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."Screenshot" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "tradeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Screenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."TagGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "dark_fg_reverse" BOOLEAN NOT NULL DEFAULT false,
    "groupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."DayTag" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."TradeTag" (
    "tradeId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."DayTagAssociation" (
    "dayTagId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "DayTagAssociation_pkey" PRIMARY KEY ("dayTagId","tagId")
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."Account" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'abcdef',
    "aliases" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."ConfigSymbol" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "digit" INTEGER NOT NULL DEFAULT 2,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "aliases" TEXT NOT NULL DEFAULT '',
    "pricePerPoint" DOUBLE PRECISION NOT NULL DEFAULT -1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigSymbol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."ImportProfile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "importMode" TEXT NOT NULL DEFAULT 'local',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "keepExistingTrades" BOOLEAN NOT NULL DEFAULT false,
    "ibkrFlexQueryToken" TEXT,
    "ibkrFlexQueryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."ImportProfileDayTag" (
    "importProfileId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "ImportProfileDayTag_pkey" PRIMARY KEY ("importProfileId","tagId")
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."ImportProfileTradeTag" (
    "importProfileId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "ImportProfileTradeTag_pkey" PRIMARY KEY ("importProfileId","tagId")
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."DailyNote" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCHEMA_PLACEHOLDER"."_DayTagsOnTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_DayTagsOnTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trade_uniqueId_key" ON "SCHEMA_PLACEHOLDER"."Trade"("uniqueId");

-- CreateIndex
CREATE INDEX "Screenshot_tradeId_idx" ON "SCHEMA_PLACEHOLDER"."Screenshot"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "TagGroup_name_key" ON "SCHEMA_PLACEHOLDER"."TagGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_groupId_key" ON "SCHEMA_PLACEHOLDER"."Tag"("name", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeTag_tradeId_tagId_key" ON "SCHEMA_PLACEHOLDER"."TradeTag"("tradeId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_name_key" ON "SCHEMA_PLACEHOLDER"."Account"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigSymbol_symbol_key" ON "SCHEMA_PLACEHOLDER"."ConfigSymbol"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "ImportProfile_name_key" ON "SCHEMA_PLACEHOLDER"."ImportProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DailyNote_date_key" ON "SCHEMA_PLACEHOLDER"."DailyNote"("date");

-- CreateIndex
CREATE INDEX "DailyNote_date_idx" ON "SCHEMA_PLACEHOLDER"."DailyNote"("date");

-- CreateIndex
CREATE INDEX "_DayTagsOnTags_B_index" ON "SCHEMA_PLACEHOLDER"."_DayTagsOnTags"("B");

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SCHEMA_PLACEHOLDER"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."Screenshot" ADD CONSTRAINT "Screenshot_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "SCHEMA_PLACEHOLDER"."Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."Tag" ADD CONSTRAINT "Tag_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SCHEMA_PLACEHOLDER"."TagGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."TradeTag" ADD CONSTRAINT "TradeTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "SCHEMA_PLACEHOLDER"."Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."TradeTag" ADD CONSTRAINT "TradeTag_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "SCHEMA_PLACEHOLDER"."Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."DayTagAssociation" ADD CONSTRAINT "DayTagAssociation_dayTagId_fkey" FOREIGN KEY ("dayTagId") REFERENCES "SCHEMA_PLACEHOLDER"."DayTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."DayTagAssociation" ADD CONSTRAINT "DayTagAssociation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "SCHEMA_PLACEHOLDER"."Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."ImportProfileDayTag" ADD CONSTRAINT "ImportProfileDayTag_importProfileId_fkey" FOREIGN KEY ("importProfileId") REFERENCES "SCHEMA_PLACEHOLDER"."ImportProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."ImportProfileDayTag" ADD CONSTRAINT "ImportProfileDayTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "SCHEMA_PLACEHOLDER"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."ImportProfileTradeTag" ADD CONSTRAINT "ImportProfileTradeTag_importProfileId_fkey" FOREIGN KEY ("importProfileId") REFERENCES "SCHEMA_PLACEHOLDER"."ImportProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."ImportProfileTradeTag" ADD CONSTRAINT "ImportProfileTradeTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "SCHEMA_PLACEHOLDER"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."_DayTagsOnTags" ADD CONSTRAINT "_DayTagsOnTags_A_fkey" FOREIGN KEY ("A") REFERENCES "SCHEMA_PLACEHOLDER"."DayTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCHEMA_PLACEHOLDER"."_DayTagsOnTags" ADD CONSTRAINT "_DayTagsOnTags_B_fkey" FOREIGN KEY ("B") REFERENCES "SCHEMA_PLACEHOLDER"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;


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

