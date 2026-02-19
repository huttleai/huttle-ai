-- Add ai_insights array column to daily_dashboard_cache
-- Supports the new 3-card rotating insights feature (Timing, Content Type, Audience)
ALTER TABLE daily_dashboard_cache
  ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '[]'::jsonb;
