ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end
ON public.subscriptions (trial_end)
WHERE status = 'trialing';

CREATE TABLE IF NOT EXISTS public.trial_email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('trial_2_days', 'trial_1_day')),
  trial_end_at TIMESTAMPTZ NOT NULL,
  resend_email_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stripe_subscription_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_trial_email_reminders_user_id
ON public.trial_email_reminders (user_id);

ALTER TABLE public.trial_email_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own trial reminders" ON public.trial_email_reminders;
CREATE POLICY "Users can read own trial reminders"
ON public.trial_email_reminders
FOR SELECT
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Service can manage trial reminders" ON public.trial_email_reminders;
CREATE POLICY "Service can manage trial reminders"
ON public.trial_email_reminders
FOR ALL
USING ((select auth.role()) = 'service_role')
WITH CHECK ((select auth.role()) = 'service_role');

GRANT SELECT ON public.trial_email_reminders TO authenticated;
GRANT ALL ON public.trial_email_reminders TO service_role;
