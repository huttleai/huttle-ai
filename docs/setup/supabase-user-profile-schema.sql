-- User Profile Schema for Onboarding Quiz Data
-- Stores personalization data collected during onboarding to customize AI generations

CREATE TABLE IF NOT EXISTS public.user_profile (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Quiz data
  niche TEXT, -- User's content niche (e.g., "fitness", "food blogging", "tech reviews")
  target_audience TEXT, -- Target audience description (e.g., "millennials interested in wellness")
  content_goals TEXT[], -- Array of content goals (e.g., ["grow_followers", "increase_engagement", "drive_sales"])
  posting_frequency TEXT, -- How often they plan to post (e.g., "daily", "3-5 times per week")
  
  -- Onboarding tracking
  quiz_completed_at TIMESTAMP WITH TIME ZONE,
  onboarding_step INTEGER DEFAULT 0, -- Track which step of onboarding they're on
  has_seen_tour BOOLEAN DEFAULT false NOT NULL, -- Track if user has completed the guided tour
  
  -- Additional preferences
  preferred_platforms TEXT[], -- Array of platforms they use most
  brand_voice_preference TEXT, -- Preferred tone (e.g., "casual", "professional", "humorous")
  
  -- Profile type (Brand/Business vs Solo Creator)
  profile_type TEXT DEFAULT 'brand', -- 'brand' for businesses, 'creator' for solo creators
  creator_archetype TEXT, -- For solo creators: 'educator', 'entertainer', 'storyteller', 'inspirer', 'curator'
  
  -- Extended brand/creator info
  brand_name TEXT, -- Brand name or creator handle
  industry TEXT, -- Industry or category
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON public.user_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_niche ON public.user_profile(niche);
CREATE INDEX IF NOT EXISTS idx_user_profile_quiz_completed ON public.user_profile(quiz_completed_at);
CREATE INDEX IF NOT EXISTS idx_user_profile_profile_type ON public.user_profile(profile_type);

-- Enable RLS
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.user_profile
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profile
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON public.user_profile
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_updated_at();

COMMENT ON TABLE public.user_profile IS 'Stores user onboarding quiz data and preferences for personalized AI content generation.';

-- Migration for existing tables (run if table already exists):
-- ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'brand';
-- ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS creator_archetype TEXT;
-- ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS brand_name TEXT;
-- ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS industry TEXT;
-- CREATE INDEX IF NOT EXISTS idx_user_profile_profile_type ON public.user_profile(profile_type);
