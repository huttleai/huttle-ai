-- ============================================================================
-- Add guided tour completion flag to user_profile
-- ============================================================================

ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS has_seen_tour boolean NOT NULL DEFAULT false;
