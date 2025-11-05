-- Supabase Schema for n8n Social Media Integration
-- This schema tracks connection status and post queues for n8n-powered social posting

-- Social connections table (tracks which platforms are connected via n8n)
CREATE TABLE IF NOT EXISTS public.social_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube')),
  is_connected BOOLEAN NOT NULL DEFAULT false,
  n8n_credential_id TEXT, -- n8n internal credential reference
  platform_username TEXT, -- User's username on the platform
  platform_user_id TEXT, -- Platform's internal user ID
  connected_at TIMESTAMP WITH TIME ZONE,
  last_verified TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one connection per user per platform
  UNIQUE(user_id, platform)
);

-- Post queue table (posts waiting for n8n to process)
CREATE TABLE IF NOT EXISTS public.n8n_post_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  post_data JSONB NOT NULL, -- Full post object (title, caption, platforms, etc.)
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  platforms TEXT[] NOT NULL, -- Which platforms to post to
  scheduled_for TIMESTAMP WITH TIME ZONE, -- Optional scheduling
  n8n_workflow_id TEXT, -- n8n workflow execution ID
  n8n_response JSONB, -- Response from n8n after processing
  error_message TEXT, -- If status is 'failed'
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_connections_user_id ON public.social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_platform ON public.social_connections(platform);
CREATE INDEX IF NOT EXISTS idx_social_connections_connected ON public.social_connections(is_connected);

CREATE INDEX IF NOT EXISTS idx_n8n_post_queue_user_id ON public.n8n_post_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_n8n_post_queue_status ON public.n8n_post_queue(status);
CREATE INDEX IF NOT EXISTS idx_n8n_post_queue_scheduled ON public.n8n_post_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_n8n_post_queue_created ON public.n8n_post_queue(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_post_queue ENABLE ROW LEVEL SECURITY;

-- Users can view/manage their own social connections
CREATE POLICY "Users can manage own social connections" ON public.social_connections
  FOR ALL USING (auth.uid() = user_id);

-- Users can view/manage their own post queue
CREATE POLICY "Users can manage own post queue" ON public.n8n_post_queue
  FOR ALL USING (auth.uid() = user_id);

-- Allow service role to manage connections (for n8n webhooks)
CREATE POLICY "Service can manage social connections" ON public.social_connections
  FOR ALL USING (true);

-- Allow service role to manage post queue (for n8n webhooks)
CREATE POLICY "Service can manage post queue" ON public.n8n_post_queue
  FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_n8n_post_queue_updated_at
  BEFORE UPDATE ON public.n8n_post_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Demo data for testing (optional - remove in production)
-- INSERT INTO public.social_connections (user_id, platform, is_connected, platform_username)
-- VALUES ('demo-user-123'::uuid, 'instagram', true, 'huttle.ai_demo');

-- INSERT INTO public.social_connections (user_id, platform, is_connected, platform_username)
-- VALUES ('demo-user-123'::uuid, 'twitter', true, '@huttle_ai');

-- Function to get user's connected platforms (for quick queries)
CREATE OR REPLACE FUNCTION get_connected_platforms(user_uuid UUID)
RETURNS TABLE(platform TEXT, username TEXT, connected_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    sc.platform,
    sc.platform_username,
    sc.connected_at
  FROM public.social_connections sc
  WHERE sc.user_id = user_uuid
    AND sc.is_connected = true
  ORDER BY sc.platform;
$$;

-- Function to check if user has platform connected
CREATE OR REPLACE FUNCTION is_platform_connected(user_uuid UUID, platform_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.social_connections
    WHERE user_id = user_uuid
      AND platform = LOWER(platform_name)
      AND is_connected = true
  );
$$;
