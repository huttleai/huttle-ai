ALTER TABLE daily_dashboard_cache -- HUTTLE AI: cache fix
  ADD COLUMN IF NOT EXISTS daily_alerts JSONB DEFAULT '[]'::jsonb, -- HUTTLE AI: cache fix
  ADD COLUMN IF NOT EXISTS dashboard_metadata JSONB DEFAULT '{}'::jsonb; -- HUTTLE AI: cache fix
