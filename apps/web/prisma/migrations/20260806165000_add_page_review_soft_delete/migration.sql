-- PageStatus is stored as TEXT by SQLite, so REVIEW requires no table rebuild.
ALTER TABLE "Page" ADD COLUMN "deletedAt" DATETIME;
