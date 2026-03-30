-- Add idempotency guard for the "Secure My Account" password-setup email.
-- Before sending the Supabase invite/password-setup email, check this flag.
-- After sending, set it to true. This prevents duplicate emails on repeated
-- checkout.session.completed webhook calls or any other re-trigger path.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS secure_account_email_sent BOOLEAN DEFAULT false;
