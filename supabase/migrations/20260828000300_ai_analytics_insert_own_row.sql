-- ai_analytics INSERT was named "Service role can insert analytics" but had
-- WITH CHECK (true) and no TO clause, so any role with INSERT (including
-- authenticated) could attribute a row to any user_id.
--
-- service_role bypasses RLS, so it does not need an INSERT policy.
-- Authenticated clients may insert only their own user_id.

DROP POLICY IF EXISTS "Service role can insert analytics" ON public.ai_analytics;
DROP POLICY IF EXISTS "Users can insert own analytics" ON public.ai_analytics;

CREATE POLICY "Users can insert own analytics"
  ON public.ai_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
