/*
  Warnings:

  - You are about to alter the column `pricePerPoint` on the `ConfigSymbol` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConfigSymbol" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "symbol" TEXT NOT NULL,
    "digit" INTEGER NOT NULL DEFAULT 2,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "pricePerPoint" REAL NOT NULL DEFAULT -1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ConfigSymbol" ("active", "createdAt", "digit", "id", "notes", "pricePerPoint", "symbol", "updatedAt") SELECT "active", "createdAt", "digit", "id", "notes", "pricePerPoint", "symbol", "updatedAt" FROM "ConfigSymbol";
DROP TABLE "ConfigSymbol";
ALTER TABLE "new_ConfigSymbol" RENAME TO "ConfigSymbol";
CREATE UNIQUE INDEX "ConfigSymbol_symbol_key" ON "ConfigSymbol"("symbol");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
