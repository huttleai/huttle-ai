-- Migration: RLS Performance Fix for user_profile
-- Replaces auth.uid() with (select auth.uid()) in RLS policies.
-- This prevents the auth function from being evaluated per-row, which
-- can cause significant slowdowns on tables with many columns (post brand-voice expansion).
-- Safe to run multiple times (drops + recreates).

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (IF EXISTS for idempotency)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profile;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profile;

-- Recreate with optimized (select auth.uid()) pattern
CREATE POLICY "Users can view own profile" ON public.user_profile
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profile
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profile
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own profile" ON public.user_profile
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Also fix user_preferences if it exists (same pattern)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences') THEN
    ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
    DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
    DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;

    CREATE POLICY "Users can view own preferences" ON public.user_preferences
      FOR SELECT USING ((select auth.uid()) = user_id);
    CREATE POLICY "Users can insert own preferences" ON public.user_preferences
      FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
    CREATE POLICY "Users can update own preferences" ON public.user_preferences
      FOR UPDATE USING ((select auth.uid()) = user_id);
  END IF;
END $$;
