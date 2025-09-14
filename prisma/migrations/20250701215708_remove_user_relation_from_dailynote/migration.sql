/*
  Warnings:

  - You are about to drop the column `userId` on the `DailyNote` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DailyNote" ("content", "createdAt", "date", "id", "updatedAt") SELECT "content", "createdAt", "date", "id", "updatedAt" FROM "DailyNote";
DROP TABLE "DailyNote";
ALTER TABLE "new_DailyNote" RENAME TO "DailyNote";
CREATE UNIQUE INDEX "DailyNote_date_key" ON "DailyNote"("date");
CREATE INDEX "DailyNote_date_idx" ON "DailyNote"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
