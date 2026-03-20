-- Upsert (INSERT ... ON CONFLICT DO UPDATE) requires UPDATE policies to include
-- WITH CHECK so the post-update row is allowed. Without it, PostgREST can return
-- 403 on user_profile / user_preferences upserts that target user_id.

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profile;
CREATE POLICY "Users can update own profile" ON public.user_profile
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_preferences'
  ) THEN
    DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
    CREATE POLICY "Users can update own preferences" ON public.user_preferences
      FOR UPDATE
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;
