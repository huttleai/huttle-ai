-- ============================================================================
-- Create daily dashboard cache table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_dashboard_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  generated_date date NOT NULL,
  trending_topics jsonb,
  hashtags_of_day jsonb,
  ai_insight jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, generated_date)
);

ALTER TABLE public.daily_dashboard_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own dashboard cache" ON public.daily_dashboard_cache;
DROP POLICY IF EXISTS "Users can insert own dashboard cache" ON public.daily_dashboard_cache;
DROP POLICY IF EXISTS "Users can update own dashboard cache" ON public.daily_dashboard_cache;
DROP POLICY IF EXISTS "Users can delete own dashboard cache" ON public.daily_dashboard_cache;

CREATE POLICY "Users can read own dashboard cache"
  ON public.daily_dashboard_cache
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own dashboard cache"
  ON public.daily_dashboard_cache
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own dashboard cache"
  ON public.daily_dashboard_cache
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own dashboard cache"
  ON public.daily_dashboard_cache
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_cache_user_date
  ON public.daily_dashboard_cache(user_id, generated_date);
