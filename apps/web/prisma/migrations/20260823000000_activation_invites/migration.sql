CREATE TABLE "ActivationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" TEXT,
    "pageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "ActivationEvent_userId_kind_key" ON "ActivationEvent"("userId", "kind");
CREATE INDEX "ActivationEvent_userId_kind_idx" ON "ActivationEvent"("userId", "kind");
CREATE INDEX "ActivationEvent_kind_createdAt_idx" ON "ActivationEvent"("kind", "createdAt");

CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codeHash" TEXT NOT NULL,
    "channel" TEXT,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "InviteCode_codeHash_key" ON "InviteCode"("codeHash");

CREATE TABLE "InviteRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteRedemption_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "InviteCode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InviteRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InviteRedemption_codeId_userId_key" ON "InviteRedemption"("codeId", "userId");
