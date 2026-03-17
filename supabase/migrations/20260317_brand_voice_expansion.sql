-- Migration: Brand Voice Expansion
-- Adds new columns to user_profile for richer brand voice data collection.
-- Safe to run multiple times (idempotent via IF NOT EXISTS).

-- Shared fields (both user types)
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS social_handle TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS sub_niche TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS audience_pain_point TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS audience_action_trigger TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS tone_chips TEXT[];
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS writing_style TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS example_post TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS content_to_post TEXT[];
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS content_to_avoid TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS follower_count TEXT;

-- Business-only fields
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS primary_offer TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS conversion_goal TEXT;

-- Creator-only fields
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS content_persona TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS monetization_goal TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS show_up_style TEXT;

-- Column documentation
COMMENT ON COLUMN public.user_profile.social_handle IS 'Social media handle, e.g. @sarahcreates';
COMMENT ON COLUMN public.user_profile.sub_niche IS 'Sub-niche within the main niche, e.g. Anti-aging treatments';
COMMENT ON COLUMN public.user_profile.audience_pain_point IS 'Audience biggest pain point related to niche';
COMMENT ON COLUMN public.user_profile.audience_action_trigger IS 'What makes the audience take action (single select)';
COMMENT ON COLUMN public.user_profile.tone_chips IS 'Selected tone descriptors: professional, conversational, humorous, etc.';
COMMENT ON COLUMN public.user_profile.writing_style IS 'Preferred writing style: short_punchy, storytelling, data_facts, etc.';
COMMENT ON COLUMN public.user_profile.example_post IS 'Example post that represents the user voice and style';
COMMENT ON COLUMN public.user_profile.content_to_post IS 'Content types user wants to post more of';
COMMENT ON COLUMN public.user_profile.content_to_avoid IS 'Content types or topics user wants to avoid';
COMMENT ON COLUMN public.user_profile.follower_count IS 'Approximate follower count range';
COMMENT ON COLUMN public.user_profile.primary_offer IS 'Business main offer in one line';
COMMENT ON COLUMN public.user_profile.conversion_goal IS 'Primary conversion goal for business';
COMMENT ON COLUMN public.user_profile.content_persona IS 'Creator content persona archetype';
COMMENT ON COLUMN public.user_profile.monetization_goal IS 'Creator monetization goal';
COMMENT ON COLUMN public.user_profile.show_up_style IS 'How the creator shows up on camera';
