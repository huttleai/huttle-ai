-- Create AI Analytics Table
-- Tracks AI generation performance and usage metrics

CREATE TABLE IF NOT EXISTS ai_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('caption', 'hook', 'remix', 'script', 'trend_forecast', 'audience_insight')),
  platform TEXT,
  response_time_ms INTEGER CHECK (response_time_ms >= 0),
  success BOOLEAN NOT NULL DEFAULT false,
  error_type TEXT,
  model_used TEXT DEFAULT 'unknown',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_ai_analytics_user_id ON ai_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_timestamp ON ai_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_content_type ON ai_analytics(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_success ON ai_analytics(success);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_user_timestamp ON ai_analytics(user_id, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE ai_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own analytics
CREATE POLICY "Users can view own analytics"
  ON ai_analytics
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- RLS Policy: System can insert analytics (service role)
CREATE POLICY "Service role can insert analytics"
  ON ai_analytics
  FOR INSERT
  WITH CHECK (true);

-- Add helpful comment
COMMENT ON TABLE ai_analytics IS 'Tracks AI generation requests for performance monitoring and usage analytics';
COMMENT ON COLUMN ai_analytics.content_type IS 'Type of content generated: caption, hook, remix, script, trend_forecast, audience_insight';
COMMENT ON COLUMN ai_analytics.response_time_ms IS 'Time taken for AI to respond in milliseconds';
COMMENT ON COLUMN ai_analytics.success IS 'Whether the request was successful';
COMMENT ON COLUMN ai_analytics.error_type IS 'Category of error if failed: TIMEOUT, NETWORK, VALIDATION, HTTP_xxx, etc';
COMMENT ON COLUMN ai_analytics.model_used IS 'AI model used for generation (e.g., grok-4, sonar)';
COMMENT ON COLUMN ai_analytics.metadata IS 'Additional metadata like content length, hashtag presence, etc';




