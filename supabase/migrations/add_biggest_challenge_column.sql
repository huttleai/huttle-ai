-- Migration: Add biggest_challenge column to user_profile if it doesn't exist
-- This fixes the error: "Could not find the 'biggest_challenge' column of 'user_profile' in the schema cache"

-- Add biggest_challenge column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profile' 
    AND column_name = 'biggest_challenge'
  ) THEN
    ALTER TABLE public.user_profile 
    ADD COLUMN biggest_challenge TEXT;
    
    COMMENT ON COLUMN public.user_profile.biggest_challenge IS 'Main content struggle: consistency, ideas, engagement, growth, time, quality';
  END IF;
END $$;



