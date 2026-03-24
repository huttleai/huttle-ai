-- One-time in-app welcome notification (bell) — persisted per account.
-- After ADD, every existing row is false; backfill all to true once so only new signups stay eligible.

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS has_seen_welcome_notification BOOLEAN NOT NULL DEFAULT false;

UPDATE public.user_profile
SET has_seen_welcome_notification = true
WHERE has_seen_welcome_notification = false;

COMMENT ON COLUMN public.user_profile.has_seen_welcome_notification IS
  'When true, welcome notification was claimed; false for new profiles until first dashboard welcome.';
