-- ============================================================================
-- Expand subscriptions.status check constraint to cover all Stripe statuses.
--
-- The original constraint only permitted 'active', 'cancelled', 'expired'.
-- Stripe also emits 'past_due', 'trialing', 'unpaid', 'incomplete', and
-- 'incomplete_expired' — these must be storable so webhook handlers and the
-- billing hardening layer can record accurate subscription state.
-- ============================================================================

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'active',
    'cancelled',
    'expired',
    'past_due',
    'trialing',
    'unpaid',
    'incomplete',
    'incomplete_expired'
  ));
