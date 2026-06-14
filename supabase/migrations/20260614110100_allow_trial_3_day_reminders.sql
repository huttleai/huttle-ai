ALTER TABLE public.trial_email_reminders
  DROP CONSTRAINT IF EXISTS trial_email_reminders_reminder_type_check;

ALTER TABLE public.trial_email_reminders
  ADD CONSTRAINT trial_email_reminders_reminder_type_check
  CHECK (reminder_type IN ('trial_3_days', 'trial_2_days', 'trial_1_day'));
