ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_hash TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

UPDATE users
SET phone_hash = NULL,
    phone_verified_at = CASE
      WHEN phone_verified = TRUE AND phone_verified_at IS NULL THEN NOW()
      ELSE phone_verified_at
    END
WHERE phone_hash IS NULL;

ALTER TABLE users
  DROP COLUMN IF EXISTS phone_number;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_hash ON users (phone_hash);
