-- Add expiration, action_required, what_it_means, and enriched fields to social_updates
-- Expiration tiers: High Impact = 21 days, Medium = 10 days, Low = 5 days

ALTER TABLE social_updates
  ADD COLUMN IF NOT EXISTS expires_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS what_it_means   TEXT,
  ADD COLUMN IF NOT EXISTS update_type     TEXT,
  ADD COLUMN IF NOT EXISTS source_url      TEXT,
  ADD COLUMN IF NOT EXISTS fetched_at      TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS published_date  TEXT;

-- Index for efficient expiry filtering
CREATE INDEX IF NOT EXISTS idx_social_updates_expires_at ON social_updates (expires_at);
