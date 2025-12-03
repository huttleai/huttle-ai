-- Jobs table for async AI operations
-- This table stores job records for long-running AI tasks like Plan Builder

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'plan_builder', 'content_generation', etc.
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed'
  input JSONB NOT NULL, -- Job configuration/parameters
  result JSONB, -- Final output data
  error TEXT, -- Error message if failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON public.jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);

-- RLS Policies
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view own jobs"
  ON public.jobs
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- Users can insert their own jobs
CREATE POLICY "Users can create own jobs"
  ON public.jobs
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Note: Updates should be done via service role key (n8n will use service role)
-- For RLS, we allow users to update their own jobs, but n8n will bypass RLS
CREATE POLICY "Users can update own jobs"
  ON public.jobs
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS jobs_updated_at_trigger ON public.jobs;
CREATE TRIGGER jobs_updated_at_trigger
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();

-- Optional: Notifications table for user alerts
CREATE TABLE IF NOT EXISTS public.job_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_notifications_user_id ON public.job_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_notifications_read ON public.job_notifications(read);
CREATE INDEX IF NOT EXISTS idx_job_notifications_job_id ON public.job_notifications(job_id);

ALTER TABLE public.job_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.job_notifications
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.job_notifications
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

