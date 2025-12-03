-- Supabase Schema for Social Media Analytics
-- DEPRECATED: This schema is currently unused but kept for potential future use
-- The app has pivoted to analytics-free approach with manual uploads/exports only
-- This schema stores analytics data fetched from social media platforms via n8n

-- ============================================
-- PART 1: ANALYTICS TABLES
-- ============================================

-- Social analytics table (stores individual post metrics)
CREATE TABLE IF NOT EXISTS public.social_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'tiktok', 'youtube')),
  post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE SET NULL, -- Optional link to scheduled post
  platform_post_id TEXT, -- ID of the post on the platform (e.g., Instagram media ID)
  
  -- Core metrics (common across platforms)
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0, -- Instagram/TikTok
  
  -- Reach and impressions
  reach INTEGER DEFAULT 0, -- Unique users who saw the post
  impressions INTEGER DEFAULT 0, -- Total times post was shown
  
  -- Engagement metrics
  engagement_rate DECIMAL(5, 2) DEFAULT 0.00, -- Calculated: (likes + comments + shares) / impressions * 100
  
  -- Platform-specific metrics (stored as JSONB for flexibility)
  platform_metrics JSONB DEFAULT '{}'::jsonb,
  -- Examples:
  -- Instagram: {"saves": 50, "profile_visits": 120, "link_clicks": 30}
  -- YouTube: {"watch_time_hours": 45.5, "average_view_duration": 180, "likes_ratio": 0.95}
  -- Twitter: {"retweets": 25, "quote_tweets": 10, "url_clicks": 15}
  -- TikTok: {"play_time_seconds": 3600, "completion_rate": 0.85}
  -- Facebook: {"reactions": {"like": 50, "love": 20, "wow": 5}, "link_clicks": 30}
  
  -- Timestamps
  post_date TIMESTAMP WITH TIME ZONE, -- When the post was published
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When these metrics were fetched
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics snapshots table (stores aggregated daily/weekly metrics)
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'all')),
  
  -- Time period this snapshot represents
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('daily', 'weekly', 'monthly')),
  snapshot_date DATE NOT NULL, -- The date this snapshot is for
  
  -- Aggregated account metrics
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  
  -- Aggregated content metrics (sum of all posts in period)
  total_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_reach INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  
  -- Averages
  avg_engagement_rate DECIMAL(5, 2) DEFAULT 0.00,
  avg_views_per_post DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Growth metrics
  follower_growth INTEGER DEFAULT 0, -- Change since last period
  engagement_growth DECIMAL(5, 2) DEFAULT 0.00, -- Percentage change
  
  -- Best performing content
  top_post_id UUID REFERENCES public.social_analytics(id) ON DELETE SET NULL,
  best_posting_time TIME, -- Time of day with highest engagement
  
  -- Platform-specific aggregated data
  platform_metrics JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one snapshot per user per platform per date
  UNIQUE(user_id, platform, snapshot_type, snapshot_date)
);

-- AI-generated insights table (stores insights from analysis)
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Insight details
  insight_type TEXT NOT NULL CHECK (insight_type IN ('best_time', 'content_gap', 'engagement_trend', 'growth_opportunity', 'performance_alert')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Priority and status
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'acted_on')),
  
  -- Associated data
  platform TEXT CHECK (platform IN ('instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'all')),
  metrics JSONB DEFAULT '{}'::jsonb, -- Supporting data for the insight
  
  -- Action items
  action_items TEXT[], -- Array of recommended actions
  
  -- Timestamps
  valid_until TIMESTAMP WITH TIME ZONE, -- When this insight expires (e.g., time-sensitive opportunities)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content gap analysis table (tracks content performance patterns)
CREATE TABLE IF NOT EXISTS public.content_gaps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Gap details
  gap_type TEXT NOT NULL CHECK (gap_type IN ('content_format', 'posting_frequency', 'content_topic', 'platform_coverage', 'engagement_quality')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Gap metrics
  current_performance DECIMAL(5, 2) DEFAULT 0.00, -- e.g., 45% video content
  industry_benchmark DECIMAL(5, 2) DEFAULT 0.00, -- e.g., 70% video content
  gap_percentage DECIMAL(5, 2) DEFAULT 0.00, -- Difference
  
  -- Recommendations
  recommendations TEXT[], -- Array of specific recommendations
  potential_impact TEXT, -- Expected impact if gap is addressed
  
  -- Associated data
  platform TEXT CHECK (platform IN ('instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'all')),
  analysis_data JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 2: INDEXES FOR PERFORMANCE
-- ============================================

-- Social analytics indexes
CREATE INDEX IF NOT EXISTS idx_social_analytics_user_id ON public.social_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_platform ON public.social_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_social_analytics_post_id ON public.social_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_post_date ON public.social_analytics(post_date DESC);
CREATE INDEX IF NOT EXISTS idx_social_analytics_fetched_at ON public.social_analytics(fetched_at DESC);

-- Analytics snapshots indexes
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_user_id ON public.analytics_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_platform ON public.analytics_snapshots(platform);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON public.analytics_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_type ON public.analytics_snapshots(snapshot_type);

-- AI insights indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON public.ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON public.ai_insights(status);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created ON public.ai_insights(created_at DESC);

-- Content gaps indexes
CREATE INDEX IF NOT EXISTS idx_content_gaps_user_id ON public.content_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_content_gaps_type ON public.content_gaps(gap_type);
CREATE INDEX IF NOT EXISTS idx_content_gaps_analyzed ON public.content_gaps(analyzed_at DESC);

-- ============================================
-- PART 3: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.social_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_gaps ENABLE ROW LEVEL SECURITY;

-- Social analytics policies
CREATE POLICY "Users can view own analytics" ON public.social_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON public.social_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics" ON public.social_analytics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analytics" ON public.social_analytics
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can manage all analytics (for n8n)
CREATE POLICY "Service can manage all analytics" ON public.social_analytics
  FOR ALL USING (true);

-- Analytics snapshots policies
CREATE POLICY "Users can view own snapshots" ON public.analytics_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage snapshots" ON public.analytics_snapshots
  FOR ALL USING (true);

-- AI insights policies
CREATE POLICY "Users can view own insights" ON public.ai_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own insights" ON public.ai_insights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service can manage insights" ON public.ai_insights
  FOR ALL USING (true);

-- Content gaps policies
CREATE POLICY "Users can view own gaps" ON public.content_gaps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage gaps" ON public.content_gaps
  FOR ALL USING (true);

-- ============================================
-- PART 4: HELPER FUNCTIONS
-- ============================================

-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
  p_likes INTEGER,
  p_comments INTEGER,
  p_shares INTEGER,
  p_impressions INTEGER
)
RETURNS DECIMAL(5, 2)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF p_impressions = 0 OR p_impressions IS NULL THEN
    RETURN 0.00;
  END IF;
  
  RETURN ROUND(
    ((p_likes + p_comments + p_shares)::DECIMAL / p_impressions::DECIMAL) * 100,
    2
  );
END;
$$;

-- Function to get user's analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_user_id UUID,
  p_platform TEXT DEFAULT 'all',
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  platform TEXT,
  total_posts INTEGER,
  total_views BIGINT,
  total_engagement BIGINT,
  avg_engagement_rate DECIMAL(5, 2),
  best_performing_post_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.platform,
    COUNT(DISTINCT sa.id)::INTEGER as total_posts,
    SUM(sa.views)::BIGINT as total_views,
    SUM(sa.likes + sa.comments + sa.shares)::BIGINT as total_engagement,
    AVG(sa.engagement_rate) as avg_engagement_rate,
    (
      SELECT id FROM public.social_analytics
      WHERE user_id = p_user_id
        AND (p_platform = 'all' OR platform = p_platform)
        AND post_date >= NOW() - (p_days || ' days')::INTERVAL
      ORDER BY engagement_rate DESC
      LIMIT 1
    ) as best_performing_post_id
  FROM public.social_analytics sa
  WHERE sa.user_id = p_user_id
    AND (p_platform = 'all' OR sa.platform = p_platform)
    AND sa.post_date >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY sa.platform;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- PART 5: TRIGGERS
-- ============================================

-- Trigger to auto-update updated_at on social_analytics
CREATE TRIGGER update_social_analytics_updated_at
  BEFORE UPDATE ON public.social_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();

-- Trigger to auto-update updated_at on analytics_snapshots
CREATE TRIGGER update_analytics_snapshots_updated_at
  BEFORE UPDATE ON public.analytics_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();

-- Trigger to auto-update updated_at on ai_insights
CREATE TRIGGER update_ai_insights_updated_at
  BEFORE UPDATE ON public.ai_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();

-- Trigger to auto-update updated_at on content_gaps
CREATE TRIGGER update_content_gaps_updated_at
  BEFORE UPDATE ON public.content_gaps
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();

-- ============================================
-- PART 6: COMMENTS
-- ============================================

COMMENT ON TABLE public.social_analytics IS 'Stores individual post analytics from social media platforms. Populated by n8n workflows.';
COMMENT ON TABLE public.analytics_snapshots IS 'Stores aggregated daily/weekly/monthly analytics snapshots for quick queries.';
COMMENT ON TABLE public.ai_insights IS 'Stores AI-generated insights based on analytics data analysis.';
COMMENT ON TABLE public.content_gaps IS 'Stores content gap analysis comparing user performance to industry benchmarks.';

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. Run this schema in Supabase SQL Editor
-- 2. Verify tables were created successfully
-- 3. Set up n8n workflows to populate these tables
-- 4. Connect frontend to query this data

