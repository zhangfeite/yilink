/*
  Warnings:

  - The primary key for the `ClickEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClickEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "blockId" TEXT,
    "kind" TEXT NOT NULL,
    "tsBucket" DATETIME NOT NULL,
    "uaClass" TEXT,
    "refClass" TEXT,
    "ipHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ClickEvent" ("blockId", "createdAt", "id", "ipHash", "kind", "pageId", "refClass", "tsBucket", "uaClass") SELECT "blockId", "createdAt", "id", "ipHash", "kind", "pageId", "refClass", "tsBucket", "uaClass" FROM "ClickEvent";
DROP TABLE "ClickEvent";
ALTER TABLE "new_ClickEvent" RENAME TO "ClickEvent";
CREATE INDEX "ClickEvent_pageId_tsBucket_idx" ON "ClickEvent"("pageId", "tsBucket");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
