ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_brands_deleted_at ON brands (deleted_at);

