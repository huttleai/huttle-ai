-- CANCELLATION FEEDBACK SCHEMA
-- This table stores user feedback when they cancel their subscription
-- Used for analytics to understand churn reasons and improve the product

-- Create cancellation_feedback table
CREATE TABLE IF NOT EXISTS public.cancellation_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier TEXT NOT NULL,
  cancellation_reason TEXT NOT NULL,
  custom_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comment to table
COMMENT ON TABLE public.cancellation_feedback IS 'Stores user feedback when canceling subscriptions for churn analysis';

-- Add comments to columns
COMMENT ON COLUMN public.cancellation_feedback.id IS 'Unique identifier for feedback entry';
COMMENT ON COLUMN public.cancellation_feedback.user_id IS 'Reference to the user who cancelled';
COMMENT ON COLUMN public.cancellation_feedback.subscription_tier IS 'The tier they were on when canceling (essentials, pro)';
COMMENT ON COLUMN public.cancellation_feedback.cancellation_reason IS 'Preset reason selected from dropdown';
COMMENT ON COLUMN public.cancellation_feedback.custom_feedback IS 'Optional custom feedback text';
COMMENT ON COLUMN public.cancellation_feedback.created_at IS 'Timestamp when feedback was submitted';

-- Enable Row Level Security
ALTER TABLE public.cancellation_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert own cancellation feedback"
  ON public.cancellation_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Policy: Users can view their own feedback (optional)
CREATE POLICY "Users can view own cancellation feedback"
  ON public.cancellation_feedback
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cancellation_feedback_user_id 
  ON public.cancellation_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_cancellation_feedback_created_at 
  ON public.cancellation_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cancellation_feedback_reason 
  ON public.cancellation_feedback(cancellation_reason);

CREATE INDEX IF NOT EXISTS idx_cancellation_feedback_tier 
  ON public.cancellation_feedback(subscription_tier);

-- ANALYTICS QUERIES (run these separately after table is created)

-- Get cancellation reasons summary
-- SELECT 
--   cancellation_reason, 
--   COUNT(*) as count,
--   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
-- FROM cancellation_feedback
-- GROUP BY cancellation_reason
-- ORDER BY count DESC;

-- Get cancellation breakdown by tier
-- SELECT 
--   subscription_tier,
--   cancellation_reason,
--   COUNT(*) as count
-- FROM cancellation_feedback
-- GROUP BY subscription_tier, cancellation_reason
-- ORDER BY subscription_tier, count DESC;

-- Get recent feedback with custom text
-- SELECT 
--   subscription_tier,
--   cancellation_reason,
--   custom_feedback,
--   created_at
-- FROM cancellation_feedback
-- WHERE custom_feedback IS NOT NULL AND custom_feedback != ''
-- ORDER BY created_at DESC
-- LIMIT 20;

-- Get cancellation trends over time
-- SELECT 
--   DATE_TRUNC('month', created_at) as month,
--   COUNT(*) as cancellations
-- FROM cancellation_feedback
-- GROUP BY month
-- ORDER BY month DESC;

