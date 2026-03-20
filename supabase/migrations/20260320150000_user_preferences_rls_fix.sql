-- Migration: Ensure user_preferences has full RLS coverage for authenticated users.
-- INSERT policy is required for upsert to create rows for new users who have
-- never had a preferences row — without it the upsert returns a silent 403.
-- SELECT policy ensures brand context can read back preferences after saving.
-- Safe to run multiple times (DROP IF EXISTS + IF EXISTS table check).

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_preferences'
  ) THEN
    DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
    CREATE POLICY "Users can insert own preferences" ON public.user_preferences
      FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

    DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
    CREATE POLICY "Users can view own preferences" ON public.user_preferences
      FOR SELECT USING ((select auth.uid()) = user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
