-- Migration: Add creator_archetype column to user_profile table
-- This column was added for solo creators to specify their creator archetype
-- Run this migration if you see errors about missing 'creator_archetype' column

-- Add the creator_archetype column if it doesn't exist
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS creator_archetype TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profile.creator_archetype IS 'For solo creators: educator, entertainer, storyteller, inspirer, curator';

-- Create index for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_user_profile_creator_archetype ON public.user_profile(creator_archetype);



