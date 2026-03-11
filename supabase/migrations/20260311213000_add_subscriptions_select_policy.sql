ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
      AND policyname = 'Users can read own subscription'
  ) THEN
    CREATE POLICY "Users can read own subscription"
    ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);
  END IF;
END
$$;
