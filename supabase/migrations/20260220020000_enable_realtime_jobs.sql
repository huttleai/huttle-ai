-- ============================================================================
-- Enable Realtime for the Plan Builder 'jobs' table
--
-- Required for AIPlanBuilder.jsx Realtime subscription to receive updates
-- when n8n completes a job (writes status='completed' via service role key).
-- Without this, the Realtime channel never fires even though the row is updated.
--
-- Run this in Supabase SQL Editor or via supabase db push.
-- ============================================================================

-- Add the jobs table to the supabase_realtime publication
-- This allows Realtime subscriptions to receive postgres_changes events
-- NOTE: If this errors with "already member of publication", the table is already
-- enabled for Realtime — skip this line and run the RLS verification below.
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;

-- ============================================================================
-- Verify RLS policies exist (idempotent — these were created in
-- 20260214_fix_jobs_rls_policies.sql but we verify they're present)
-- ============================================================================

-- Users can SELECT their own jobs (required for Realtime subscriptions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jobs'
      AND policyname = 'Users can view own jobs'
  ) THEN
    CREATE POLICY "Users can view own jobs"
      ON public.jobs
      FOR SELECT
      TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- Users can INSERT their own jobs (required for frontend job creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jobs'
      AND policyname = 'Users can create own jobs'
  ) THEN
    CREATE POLICY "Users can create own jobs"
      ON public.jobs
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;
