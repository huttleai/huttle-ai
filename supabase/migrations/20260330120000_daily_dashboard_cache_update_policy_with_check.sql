-- UPSERT (ON CONFLICT DO UPDATE) requires UPDATE rows to pass WITH CHECK when RLS is enabled.
-- Without WITH CHECK, PostgREST can return 400 on upsert even when INSERT policy passes.
DROP POLICY IF EXISTS "Users can update own dashboard cache" ON public.daily_dashboard_cache;

CREATE POLICY "Users can update own dashboard cache"
  ON public.daily_dashboard_cache
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
