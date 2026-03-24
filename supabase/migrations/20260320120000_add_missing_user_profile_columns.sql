-- Migration: Ensure all user_profile columns required by BrandContext exist
-- Fixes PGRST204 "Could not find the 'city' column" and any other missing
-- columns that the app writes to / selects from user_profile.
--
-- Safe to run multiple times (idempotent — all statements use IF NOT EXISTS).
-- Run this in the Supabase SQL Editor if the migration runner has not already
-- applied the earlier un-timestamped migrations.

-- ── Core identity ──────────────────────────────────────────────────────────
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS first_name             TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS profile_type           TEXT DEFAULT 'brand';

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS creator_archetype      TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS brand_name             TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS social_handle          TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS city                   TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS industry               TEXT;

-- ── Niche / content focus ──────────────────────────────────────────────────
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS sub_niche              TEXT;

-- ── Audience ───────────────────────────────────────────────────────────────
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS audience_pain_point    TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS audience_action_trigger TEXT;

-- ── Voice & style ──────────────────────────────────────────────────────────
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS tone_chips             TEXT[];

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS writing_style          TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS example_post           TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS content_to_post        TEXT[];

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS content_to_avoid       TEXT;

-- ── Platforms & reach ──────────────────────────────────────────────────────
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS follower_count         TEXT;

-- ── Business-only goals ────────────────────────────────────────────────────
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS primary_offer          TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS conversion_goal        TEXT;

-- ── Creator-only goals ─────────────────────────────────────────────────────
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS content_persona        TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS monetization_goal      TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS show_up_style          TEXT;

-- ── Viral / AI personalisation fields ─────────────────────────────────────
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS content_strengths      TEXT[];

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS biggest_challenge      TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS hook_style_preference  TEXT;

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS emotional_triggers     TEXT[];

-- ── Tour flag (added by 20260217010000) ───────────────────────────────────
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS has_seen_tour          BOOLEAN NOT NULL DEFAULT false;

-- ── Welcome notification (one-time bell) — backfill: 20260323120000 ────────
ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS has_seen_welcome_notification BOOLEAN NOT NULL DEFAULT false;

-- ── Profile type index ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_profile_profile_type
  ON public.user_profile (profile_type);

-- ── Notify PostgREST to reload its schema cache ────────────────────────────
-- This is required so the new columns are immediately visible to the API
-- without restarting the Supabase project.
NOTIFY pgrst, 'reload schema';
