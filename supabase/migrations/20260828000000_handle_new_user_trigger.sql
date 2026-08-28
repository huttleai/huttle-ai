-- Signup trigger: insert a public.users row for every new auth.users row.
--
-- WHY: several production FKs point at public.users(id), not auth.users(id)
-- (user_activity, generated_content, subscriptions, social_connections,
-- n8n_post_queue, trend_forecasts). App code only UPDATES public.users
-- (OnboardingQuiz, getStorageUsage, stripe-webhook) and never INSERTs.
-- The only copy of this trigger in the repo was commented SQL in
-- docs/setup/FIX-CONTENT-LIBRARY-FK.sql. This file is the committed,
-- idempotent version.
--
-- Column list is the current public.users shape from
-- supabase/migrations/00000000000000_baseline_production_schema.sql.
-- Only id/email/full_name/created_at/updated_at are set explicitly;
-- remaining NOT NULL columns have defaults (storage_used_bytes, 
-- onboarding_completed, subscription_tier, secure_account_email_sent).
--
-- DO NOT apply this to production as part of an automated run. Review
-- first, then apply the file contents in the Supabase SQL Editor (or
-- MCP apply_migration). Do not `supabase db push` to production: other
-- repo migrations are not recorded in production schema_migrations.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(
      TRIM(
        COALESCE(
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'name',
          NEW.raw_user_meta_data->>'first_name'
        )
      ),
      ''
    ),
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'AFTER INSERT on auth.users: create a matching public.users row so FKs to public.users(id) succeed.';

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Optional backfill for auth users that already exist without a public.users
-- row. Left commented so applying this migration does not write existing
-- production user data. Run separately after review if needed:
--
-- INSERT INTO public.users (id, email, full_name, created_at, updated_at)
-- SELECT
--   id,
--   email,
--   NULLIF(
--     TRIM(
--       COALESCE(
--         raw_user_meta_data->>'full_name',
--         raw_user_meta_data->>'name',
--         raw_user_meta_data->>'first_name'
--       )
--     ),
--     ''
--   ),
--   COALESCE(created_at, now()),
--   now()
-- FROM auth.users
-- ON CONFLICT (id) DO NOTHING;
