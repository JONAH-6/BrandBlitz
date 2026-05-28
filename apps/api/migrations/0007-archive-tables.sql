-- Create archive tables for settled challenges and game sessions older than 90 days.
-- Preserves the same shape as the live tables so archive reads remain compatible.

CREATE TABLE IF NOT EXISTS challenges_archive (LIKE challenges INCLUDING ALL);
CREATE TABLE IF NOT EXISTS game_sessions_archive (LIKE game_sessions INCLUDING ALL);
