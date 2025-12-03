-- User Publishes Tracking Schema
-- This table tracks when users publish content via deep links for analytics and upsell opportunities

CREATE TABLE IF NOT EXISTS public.user_publishes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID, -- Reference to scheduled_posts if available
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'tiktok', 'youtube')),
  deep_link_used BOOLEAN DEFAULT true,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_publishes_user_id ON public.user_publishes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_publishes_platform ON public.user_publishes(platform);
CREATE INDEX IF NOT EXISTS idx_user_publishes_published_at ON public.user_publishes(published_at DESC);

-- Enable RLS
ALTER TABLE public.user_publishes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own publishes" ON public.user_publishes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own publishes" ON public.user_publishes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can manage all (for analytics)
CREATE POLICY "Service can manage all publishes" ON public.user_publishes
  FOR ALL USING (true);

COMMENT ON TABLE public.user_publishes IS 'Tracks user publish actions via deep links for engagement analytics and upsell opportunities.';
