ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS has_completed_onboarding
boolean NOT NULL DEFAULT false;

-- Existing users are considered onboarded
UPDATE public.user_profile
SET has_completed_onboarding = true
WHERE created_at < NOW();
