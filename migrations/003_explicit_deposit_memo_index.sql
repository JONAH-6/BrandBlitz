-- Migration 003: add explicit btree index on challenges.deposit_memo
--
-- The UNIQUE constraint already creates an implicit btree index, but making
-- it explicit as idx_challenges_deposit_memo keeps it visible in schema
-- tooling and matches the index declared in init.sql for fresh databases.
--
-- Using CONCURRENTLY so this can run without locking the table in production.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_challenges_deposit_memo
  ON challenges (deposit_memo);
