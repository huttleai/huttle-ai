-- Reconcile 2026-08-25 out-of-band production changes.
--
-- SUPERSEDES the dashboard_metadata DROP in
-- 20260719014640_reconcile_production_cache_schema_baseline.sql (lines 27-28).
-- That DROP asserted dashboard_metadata was "confirmed absent from production."
-- As of 2026-08-25 that assertion is FALSE: direct production queries confirm
-- the column EXISTS (added out-of-band on 2026-08-25) and it is actively
-- selected by src/services/dashboardCacheService.js:2017 (fullSelect).
-- The DROP in 20260719014640 has been commented out in place; this migration
-- re-asserts the column so repo migration history is the source of truth.
--
-- Also applied out-of-band to production on 2026-08-25 and re-asserted here:
--   subscriptions.trial_start, subscriptions.trial_end
--
-- Also created here because it is still missing from production:
--   public.trial_email_reminders. Migration 20260311180000 was only partially
--   applied to production: its subscriptions columns are present (out-of-band),
--   its table is not. ("trial_reminders" in the 2026-08-25 audit refers to this
--   table; api/_utils/trialReminderUtils.js reads and writes
--   trial_email_reminders.)
--
-- Every statement is guarded, so this migration is idempotent and a logical
-- no-op wherever state already matches.

-- (a) Re-assert the out-of-band columns.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_start timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end   timestamptz;

CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end
  ON public.subscriptions (trial_end) WHERE status = 'trialing';

ALTER TABLE public.daily_dashboard_cache
  ADD COLUMN IF NOT EXISTS dashboard_metadata jsonb;

-- (b) Create the trial reminders table missing from production. Definition
-- copied verbatim from
-- 20260311180000_add_trial_reminders_and_subscription_trial_fields.sql,
-- including its columns, index, RLS policies, and grants. The reminder_type
-- CHECK constraint is intentionally widened afterward in section (c).
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

-- (c) Widen the reminder_type CHECK constraint. The original allows only
-- ('trial_2_days', 'trial_1_day'), but api/_utils/trialReminderUtils.js:118
-- intentionally writes 'trial_3_days' for the 3-day reminder. The constraint
-- is what is wrong, not the application code. The drop-then-add pair keeps
-- this idempotent whether the table was just created above or already existed,
-- and it is non-destructive: the constraint is immediately replaced with a
-- strict superset of the allowed values, so no existing row can be invalidated.
DO $$
BEGIN
  IF to_regclass('public.trial_email_reminders') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.trial_email_reminders
    DROP CONSTRAINT IF EXISTS trial_email_reminders_reminder_type_check;

  ALTER TABLE public.trial_email_reminders
    ADD CONSTRAINT trial_email_reminders_reminder_type_check
    CHECK (reminder_type IN ('trial_3_days', 'trial_2_days', 'trial_1_day'));
END
$$;
