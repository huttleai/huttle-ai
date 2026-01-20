-- Migration: Add viral content strategy fields to user_profile
-- This adds the missing columns that are used in the onboarding quiz
-- Run this in your Supabase SQL Editor to fix the "content_strengths column not found" error
--
-- This migration is safe to run multiple times (idempotent)

-- Check if user_profile table exists, if not, create it with all fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profile'
  ) THEN
    -- Table doesn't exist, create it with all columns
    -- (Run the complete schema from docs/setup/supabase-user-profile-schema.sql instead)
    RAISE NOTICE 'user_profile table does not exist. Please run docs/setup/supabase-user-profile-schema.sql first.';
  ELSE
    -- Table exists, add missing columns
    RAISE NOTICE 'user_profile table exists. Adding missing columns...';
  END IF;
END $$;

-- Add content_strengths column (array of text)
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS content_strengths TEXT[];

-- Add biggest_challenge column
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS biggest_challenge TEXT;

-- Add hook_style_preference column
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS hook_style_preference TEXT;

-- Add emotional_triggers column (array of text)
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS emotional_triggers TEXT[];

-- Add profile_type column if missing (for brand vs creator distinction)
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'brand';

-- Add creator_archetype column if missing
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS creator_archetype TEXT;

-- Add brand_name column if missing
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS brand_name TEXT;

-- Add industry column if missing
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS industry TEXT;

-- Create index on profile_type if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_profile_profile_type ON public.user_profile(profile_type);

-- Add comments for documentation
COMMENT ON COLUMN public.user_profile.content_strengths IS 'What user is best at: storytelling, education, entertainment, visuals, trends, authenticity';
COMMENT ON COLUMN public.user_profile.biggest_challenge IS 'Main content struggle: consistency, ideas, engagement, growth, time, quality';
COMMENT ON COLUMN public.user_profile.hook_style_preference IS 'Preferred hook style: question, bold_statement, story, statistic, controversy, curiosity_gap';
COMMENT ON COLUMN public.user_profile.emotional_triggers IS 'How they want audience to feel: inspired, entertained, educated, connected, motivated, understood';

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration complete! All viral content strategy fields have been added to user_profile.';
END $$;

