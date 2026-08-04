CREATE TABLE IF NOT EXISTS revalidations (
    tag TEXT NOT NULL,
    revalidatedAt INTEGER,
    stale INTEGER,
    expire INTEGER
);
CREATE INDEX IF NOT EXISTS idx_revalidations_tag ON revalidations(tag);
