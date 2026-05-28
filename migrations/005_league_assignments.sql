CREATE TABLE IF NOT EXISTS league_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league        TEXT NOT NULL CHECK (league IN ('bronze', 'silver', 'gold')),
  group_id      INTEGER NOT NULL,
  week_start    DATE NOT NULL,
  weekly_points BIGINT NOT NULL DEFAULT 0,
  rank_in_group INTEGER,
  promoted      BOOLEAN NOT NULL DEFAULT FALSE,
  demoted       BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_league_assignments_week
  ON league_assignments (week_start, league, group_id, weekly_points DESC);

