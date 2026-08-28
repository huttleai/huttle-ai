-- RLS policies for public tables that have ENABLE ROW LEVEL SECURITY in
-- 00000000000000_baseline_production_schema.sql but no CREATE POLICY in
-- supabase/migrations/.
--
-- Pattern matches user_profile (20260317_rls_performance_fix.sql):
--   (select auth.uid()) = user_id
-- UPDATE policies include WITH CHECK (20260319200000) so upserts cannot
-- retarget another user_id.
--
-- DROP POLICY IF EXISTS covers names from docs/setup and root SQL files
-- so this is safe to re-run if those were applied out of band.
--
-- Intentionally NOT opening client access (RLS on + no policy = deny all
-- for anon/authenticated; service_role still bypasses RLS):
--   api_rate_limit_counters  -- server increment function only
--   stripe_webhook_events    -- webhook idempotency, service_role only
--   dm_leads                 -- no user_id column
--   global_cache             -- shared, no client .from() usage
--   tier_feature_limits      -- unused by app code (creditConfig is source)
--
-- social_updates has no user_id; it is a shared feed the client reads.
-- That table gets SELECT for everyone, not an own-row policy.
--
-- DO NOT apply this to production as part of an automated run. Review
-- first. Do not `supabase db push` to production.

-- ---------------------------------------------------------------------------
-- Helper: own-row SELECT/INSERT/UPDATE/DELETE using (select auth.uid())
-- Dropped at the end of this file so it does not remain in public.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._install_own_row_policies(
  p_table regclass,
  p_user_column text,
  p_label text,
  p_allow_select boolean DEFAULT true,
  p_allow_insert boolean DEFAULT true,
  p_allow_update boolean DEFAULT true,
  p_allow_delete boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  uid_eq text;
  pol_view text := 'Users can view own ' || p_label;
  pol_insert text := 'Users can insert own ' || p_label;
  pol_update text := 'Users can update own ' || p_label;
  pol_delete text := 'Users can delete own ' || p_label;
BEGIN
  IF p_user_column IS NULL OR p_user_column !~ '^[a-z_][a-z0-9_]*$' THEN
    RAISE EXCEPTION 'invalid user column name: %', p_user_column;
  END IF;

  uid_eq := format('(select auth.uid()) = %I', p_user_column);

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', p_table);

  IF p_allow_select THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol_view, p_table);
    EXECUTE format(
      'CREATE POLICY %I ON %s FOR SELECT USING (%s)',
      pol_view, p_table, uid_eq
    );
  END IF;

  IF p_allow_insert THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol_insert, p_table);
    EXECUTE format(
      'CREATE POLICY %I ON %s FOR INSERT WITH CHECK (%s)',
      pol_insert, p_table, uid_eq
    );
  END IF;

  IF p_allow_update THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol_update, p_table);
    EXECUTE format(
      'CREATE POLICY %I ON %s FOR UPDATE USING (%s) WITH CHECK (%s)',
      pol_update, p_table, uid_eq, uid_eq
    );
  END IF;

  IF p_allow_delete THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol_delete, p_table);
    EXECUTE format(
      'CREATE POLICY %I ON %s FOR DELETE USING (%s)',
      pol_delete, p_table, uid_eq
    );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- user_activity
-- Client: trackUsage INSERT, usage counts SELECT (src/config/supabase.js).
-- FK is public.users(id), so handle_new_user must exist for inserts to work.
-- Docs had "Service can track activity ... WITH CHECK (true)" which would
-- let any authenticated role insert a row for any user_id. That policy is
-- dropped and not recreated. service_role bypasses RLS.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can insert own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can update own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can delete own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Service can track activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can manage own activity" ON public.user_activity;

SELECT public._install_own_row_policies(
  'public.user_activity', 'user_id', 'activity',
  true, true, true, true
);

-- ---------------------------------------------------------------------------
-- users (owner column is id, not user_id)
-- Client UPDATE: OnboardingQuiz onboarding_completed.
-- Client SELECT: getStorageUsage.
-- INSERT kept as a safety net if the trigger has not created the row yet
-- (matches root fix_rls.sql). No DELETE: dropping your public.users row
-- would break FKs that still point at this table.
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own data" ON public.users;

CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- generated_content / trend_forecasts / scheduled_posts
-- Client writes generated_content and trend_forecasts via src/config/supabase.js.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own content" ON public.generated_content;
DROP POLICY IF EXISTS "Users can view own generated_content" ON public.generated_content;
DROP POLICY IF EXISTS "Users can insert own generated_content" ON public.generated_content;
DROP POLICY IF EXISTS "Users can update own generated_content" ON public.generated_content;
DROP POLICY IF EXISTS "Users can delete own generated_content" ON public.generated_content;

SELECT public._install_own_row_policies(
  'public.generated_content', 'user_id', 'generated_content',
  true, true, true, true
);

DROP POLICY IF EXISTS "Users can manage own forecasts" ON public.trend_forecasts;
DROP POLICY IF EXISTS "Users can view own trend_forecasts" ON public.trend_forecasts;
DROP POLICY IF EXISTS "Users can insert own trend_forecasts" ON public.trend_forecasts;
DROP POLICY IF EXISTS "Users can update own trend_forecasts" ON public.trend_forecasts;
DROP POLICY IF EXISTS "Users can delete own trend_forecasts" ON public.trend_forecasts;

SELECT public._install_own_row_policies(
  'public.trend_forecasts', 'user_id', 'trend_forecasts',
  true, true, true, true
);

DROP POLICY IF EXISTS "Users can manage own posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can view own posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.scheduled_posts;

SELECT public._install_own_row_policies(
  'public.scheduled_posts', 'user_id', 'posts',
  true, true, true, true
);

-- ---------------------------------------------------------------------------
-- smart_calendar, social_connections, n8n_post_queue, brand_data, profiles
-- ---------------------------------------------------------------------------
SELECT public._install_own_row_policies(
  'public.smart_calendar', 'user_id', 'smart_calendar',
  true, true, true, true
);

DROP POLICY IF EXISTS "Users can manage own social connections" ON public.social_connections;
DROP POLICY IF EXISTS "Service can manage social connections" ON public.social_connections;

SELECT public._install_own_row_policies(
  'public.social_connections', 'user_id', 'social connections',
  true, true, true, true
);

DROP POLICY IF EXISTS "Users can manage own post queue" ON public.n8n_post_queue;
DROP POLICY IF EXISTS "Service can manage post queue" ON public.n8n_post_queue;

SELECT public._install_own_row_policies(
  'public.n8n_post_queue', 'user_id', 'post queue',
  true, true, true, true
);

SELECT public._install_own_row_policies(
  'public.brand_data', 'user_id', 'brand_data',
  true, true, true, true
);

-- profiles.id references auth.users(id)
SELECT public._install_own_row_policies(
  'public.profiles', 'id', 'auth profile',
  true, true, true, true
);

-- ---------------------------------------------------------------------------
-- user_publishes: client INSERT from PublishModal. SELECT own rows.
-- Full own-row write is still scoped to auth.uid() = user_id.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own publishes" ON public.user_publishes;
DROP POLICY IF EXISTS "Users can insert own publishes" ON public.user_publishes;
DROP POLICY IF EXISTS "Users can update own publishes" ON public.user_publishes;
DROP POLICY IF EXISTS "Users can delete own publishes" ON public.user_publishes;
DROP POLICY IF EXISTS "Service can manage all publishes" ON public.user_publishes;

SELECT public._install_own_row_policies(
  'public.user_publishes', 'user_id', 'publishes',
  true, true, true, true
);

-- ---------------------------------------------------------------------------
-- user_feedback / cancellation_feedback: insert + read own rows.
-- cancellation_feedback is written by api/submit-cancellation-feedback.js
-- with the service role (bypasses RLS); these policies cover any future
-- client path and match docs/setup/supabase-cancellation-feedback-schema.sql.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Service can view all feedback" ON public.user_feedback;

SELECT public._install_own_row_policies(
  'public.user_feedback', 'user_id', 'user_feedback',
  true, true, false, false
);

DROP POLICY IF EXISTS "Users can insert own cancellation feedback" ON public.cancellation_feedback;
DROP POLICY IF EXISTS "Users can view own cancellation feedback" ON public.cancellation_feedback;

SELECT public._install_own_row_policies(
  'public.cancellation_feedback', 'user_id', 'cancellation feedback',
  true, true, false, false
);

-- ---------------------------------------------------------------------------
-- notifications: client SELECT + UPDATE (read / dismiss). INSERT is
-- server-side only (notificationsService.js). No client INSERT/DELETE.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- bonus_credit_ledger: users may read their own ledger rows. Writes stay
-- service_role-only (no INSERT/UPDATE/DELETE policy for authenticated).
-- ---------------------------------------------------------------------------
ALTER TABLE public.bonus_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bonus_credit_ledger" ON public.bonus_credit_ledger;
DROP POLICY IF EXISTS "Users can view own ledger" ON public.bonus_credit_ledger;

SELECT public._install_own_row_policies(
  'public.bonus_credit_ledger', 'user_id', 'bonus_credit_ledger',
  true, false, false, false
);

-- ---------------------------------------------------------------------------
-- user_daily_insights.user_id FKs to user_profile(id), which is a random
-- uuid, not auth.uid(). Own-row must go through user_profile.user_id.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_daily_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own user_daily_insights" ON public.user_daily_insights;
DROP POLICY IF EXISTS "Users can insert own user_daily_insights" ON public.user_daily_insights;
DROP POLICY IF EXISTS "Users can update own user_daily_insights" ON public.user_daily_insights;
DROP POLICY IF EXISTS "Users can delete own user_daily_insights" ON public.user_daily_insights;
DROP POLICY IF EXISTS "Users can view own daily insights" ON public.user_daily_insights;
DROP POLICY IF EXISTS "Users can insert own daily insights" ON public.user_daily_insights;
DROP POLICY IF EXISTS "Users can update own daily insights" ON public.user_daily_insights;
DROP POLICY IF EXISTS "Users can delete own daily insights" ON public.user_daily_insights;

CREATE POLICY "Users can view own daily insights"
  ON public.user_daily_insights
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profile up
      WHERE up.id = user_daily_insights.user_id
        AND up.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own daily insights"
  ON public.user_daily_insights
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profile up
      WHERE up.id = user_daily_insights.user_id
        AND up.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own daily insights"
  ON public.user_daily_insights
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profile up
      WHERE up.id = user_daily_insights.user_id
        AND up.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profile up
      WHERE up.id = user_daily_insights.user_id
        AND up.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own daily insights"
  ON public.user_daily_insights
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profile up
      WHERE up.id = user_daily_insights.user_id
        AND up.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- social_updates: shared platform-changelog feed. Client reads it
-- (SocialUpdates.jsx, dashboardCacheService). No user_id.
-- ---------------------------------------------------------------------------
ALTER TABLE public.social_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read social updates" ON public.social_updates;
DROP POLICY IF EXISTS "Service can manage social updates" ON public.social_updates;
DROP POLICY IF EXISTS "Service can insert social updates" ON public.social_updates;
DROP POLICY IF EXISTS "Service can update social updates" ON public.social_updates;
DROP POLICY IF EXISTS "Service can delete social updates" ON public.social_updates;

CREATE POLICY "Anyone can read social updates"
  ON public.social_updates
  FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- Remove the installer so it is not left in the public schema.
-- ---------------------------------------------------------------------------
DROP FUNCTION public._install_own_row_policies(regclass, text, text, boolean, boolean, boolean, boolean);
