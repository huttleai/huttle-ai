-- ============================================================================
-- Fix: Add missing RLS policies on 'jobs' table
-- Issue: "new row violates row-level security policy for table 'jobs'"
-- Root cause: RLS is enabled but INSERT/SELECT/UPDATE policies were never applied
-- ============================================================================

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can create own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Service role full access on jobs" ON public.jobs;

-- Users can SELECT their own jobs
CREATE POLICY "Users can view own jobs"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Users can INSERT their own jobs (user_id must match auth.uid())
CREATE POLICY "Users can create own jobs"
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can UPDATE their own jobs (status changes, etc.)
CREATE POLICY "Users can update own jobs"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Service role has full access (for n8n/backend job updates)
CREATE POLICY "Service role full access on jobs"
  ON public.jobs
  FOR ALL
  TO service_role
  USING (true);

-- Also fix job_notifications table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'job_notifications') THEN
    ALTER TABLE public.job_notifications ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view own notifications" ON public.job_notifications;
    DROP POLICY IF EXISTS "Users can update own notifications" ON public.job_notifications;
    
    CREATE POLICY "Users can view own notifications"
      ON public.job_notifications
      FOR SELECT
      TO authenticated
      USING ((SELECT auth.uid()) = user_id);
    
    CREATE POLICY "Users can update own notifications"
      ON public.job_notifications
      FOR UPDATE
      TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;
