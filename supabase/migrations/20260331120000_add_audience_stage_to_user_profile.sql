-- Add audience_stage column to user_profile for solo creator onboarding
-- Values: 'early' (under 1K), 'growing' (1K–10K), 'established' (10K+)

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS audience_stage TEXT
  CHECK (audience_stage IN ('early', 'growing', 'established') OR audience_stage IS NULL);

NOTIFY pgrst, 'reload schema';
