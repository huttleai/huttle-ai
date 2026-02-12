-- Migration: Add first_name column to user_profile
-- Keeps onboarding writes aligned with database schema
-- Safe to run multiple times (idempotent)

ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS first_name TEXT;

COMMENT ON COLUMN public.user_profile.first_name IS 'User first name captured during onboarding.';
