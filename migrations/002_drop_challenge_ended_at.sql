-- Migration 002: canonicalise session end timestamp to completed_at
--
-- game_sessions previously carried two overlapping timestamps:
--   challenge_ended_at  (set by finishSession)
--   completed_at        (referenced by the sessions route)
--
-- Strategy: completed_at is canonical. Backfill it from challenge_ended_at
-- for any existing rows, then drop challenge_ended_at.

-- Backfill completed_at from challenge_ended_at where not already set
UPDATE game_sessions
SET completed_at = challenge_ended_at
WHERE challenge_ended_at IS NOT NULL
  AND completed_at IS NULL;

ALTER TABLE game_sessions
  DROP COLUMN IF EXISTS challenge_ended_at;
