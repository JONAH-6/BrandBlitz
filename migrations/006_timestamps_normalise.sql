-- Normalize created_at / updated_at across tables and add a shared update trigger.

ALTER TABLE IF EXISTS challenge_questions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS game_sessions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS fraud_flags
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS league_assignments
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS user_badges
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS referrals
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at') THEN
    EXECUTE 'CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'brands_updated_at') THEN
    EXECUTE 'CREATE TRIGGER brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'challenges_updated_at') THEN
    EXECUTE 'CREATE TRIGGER challenges_updated_at BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payouts_updated_at') THEN
    EXECUTE 'CREATE TRIGGER payouts_updated_at BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'challenge_questions_updated_at') THEN
    EXECUTE 'CREATE TRIGGER challenge_questions_updated_at BEFORE UPDATE ON challenge_questions FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'game_sessions_updated_at') THEN
    EXECUTE 'CREATE TRIGGER game_sessions_updated_at BEFORE UPDATE ON game_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'session_round_scores_updated_at') THEN
    EXECUTE 'CREATE TRIGGER session_round_scores_updated_at BEFORE UPDATE ON session_round_scores FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'fraud_flags_updated_at') THEN
    EXECUTE 'CREATE TRIGGER fraud_flags_updated_at BEFORE UPDATE ON fraud_flags FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'league_assignments_updated_at') THEN
    EXECUTE 'CREATE TRIGGER league_assignments_updated_at BEFORE UPDATE ON league_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_badges_updated_at') THEN
    EXECUTE 'CREATE TRIGGER user_badges_updated_at BEFORE UPDATE ON user_badges FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'referrals_updated_at') THEN
    EXECUTE 'CREATE TRIGGER referrals_updated_at BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION set_updated_at()';
  END IF;
END;
$$ LANGUAGE plpgsql;
