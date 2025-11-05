-- Smart Calendar - Scheduled Posts Schema
-- Enhanced schema for production-ready calendar with timezone support, status tracking, and user preferences

-- ============================================================================
-- 1. Enhance scheduled_posts table with all required fields
-- ============================================================================

-- Add new columns to existing scheduled_posts table
ALTER TABLE public.scheduled_posts 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS hashtags TEXT,
  ADD COLUMN IF NOT EXISTS keywords TEXT,
  ADD COLUMN IF NOT EXISTS platforms TEXT[], -- Array of platform names
  ADD COLUMN IF NOT EXISTS content_type TEXT, -- Text Post, Image Post, Video, Story, Reel, Carousel
  ADD COLUMN IF NOT EXISTS image_prompt TEXT,
  ADD COLUMN IF NOT EXISTS video_prompt TEXT,
  ADD COLUMN IF NOT EXISTS media_urls JSONB, -- Store media file references
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMP WITH TIME ZONE;

-- Update the content column to allow NULL (since we have caption now)
ALTER TABLE public.scheduled_posts 
  ALTER COLUMN content DROP NOT NULL;

-- Update status check constraint to include new states
ALTER TABLE public.scheduled_posts 
  DROP CONSTRAINT IF EXISTS scheduled_posts_status_check;

ALTER TABLE public.scheduled_posts 
  ADD CONSTRAINT scheduled_posts_status_check 
  CHECK (status IN ('draft', 'scheduled', 'ready', 'posting', 'posted', 'failed', 'cancelled'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON public.scheduled_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_status ON public.scheduled_posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_timezone ON public.scheduled_posts(timezone);

-- ============================================================================
-- 2. Create trigger to update last_status_change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_post_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_status_change = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_status_change ON public.scheduled_posts;
CREATE TRIGGER trigger_update_post_status_change
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_status_change();

-- ============================================================================
-- 3. Create user_preferences table for timezone and calendar settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  timezone TEXT DEFAULT 'UTC',
  calendar_view TEXT DEFAULT 'month' CHECK (calendar_view IN ('month', 'week', 'day')),
  notification_settings JSONB DEFAULT '{"reminders": [30, 15, 5]}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Create trigger to auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_preferences_timestamp ON public.user_preferences;
CREATE TRIGGER trigger_update_user_preferences_timestamp
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- ============================================================================
-- 5. Add helpful comments
-- ============================================================================

COMMENT ON TABLE public.scheduled_posts IS 'Stores user-scheduled social media posts with timezone support and status tracking';
COMMENT ON COLUMN public.scheduled_posts.title IS 'Post title for identification';
COMMENT ON COLUMN public.scheduled_posts.platforms IS 'Array of social media platforms (Instagram, Facebook, TikTok, etc.)';
COMMENT ON COLUMN public.scheduled_posts.content_type IS 'Type of content (Text Post, Image Post, Video, Story, Reel, Carousel)';
COMMENT ON COLUMN public.scheduled_posts.timezone IS 'User timezone for scheduling (e.g., America/New_York)';
COMMENT ON COLUMN public.scheduled_posts.status IS 'Post lifecycle status (draft, scheduled, ready, posting, posted, failed, cancelled)';
COMMENT ON COLUMN public.scheduled_posts.posted_at IS 'Actual timestamp when post was published';
COMMENT ON COLUMN public.scheduled_posts.last_status_change IS 'Timestamp of last status change';

COMMENT ON TABLE public.user_preferences IS 'Stores user preferences for calendar view, timezone, and notifications';
COMMENT ON COLUMN public.user_preferences.timezone IS 'User preferred timezone for displaying and scheduling posts';
COMMENT ON COLUMN public.user_preferences.calendar_view IS 'Default calendar view (month, week, day)';
COMMENT ON COLUMN public.user_preferences.notification_settings IS 'JSON object with notification preferences including reminder intervals';

