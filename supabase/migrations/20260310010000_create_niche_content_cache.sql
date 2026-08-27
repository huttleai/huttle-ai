CREATE TABLE IF NOT EXISTS niche_content_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  niche text NOT NULL,
  platform text NOT NULL,
  feature text NOT NULL,
  user_type text,
  result_data jsonb NOT NULL,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_niche_cache_key ON niche_content_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_niche_cache_expires ON niche_content_cache(expires_at);

ALTER TABLE niche_content_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read cache" ON niche_content_cache;
CREATE POLICY "Anyone can read cache"
  ON niche_content_cache FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role can insert cache" ON niche_content_cache;
CREATE POLICY "Service role can insert cache"
  ON niche_content_cache FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update cache" ON niche_content_cache;
CREATE POLICY "Service role can update cache"
  ON niche_content_cache FOR UPDATE
  TO service_role
  USING (true);
