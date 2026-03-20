-- ============================================================================
-- Billing hardening migration
-- Run in Supabase SQL Editor
--
-- What this does:
--  1. Re-adds 'free' to the subscriptions.tier check constraint so the
--     stripe-webhook can reset deleted subscriptions to tier='free'.
--  2. Adds updated_at column (noop if it already exists) + auto-update trigger.
--  3. Adds explicit RLS policies that block direct INSERT/UPDATE/DELETE from
--     authenticated (client-side) users. The service role bypasses RLS and is
--     unaffected — webhooks and API endpoints still work normally.
--  4. Adds 'canceled' to the subscriptions.status allowed values so that
--     customer.subscription.deleted events can be recorded properly.
-- ============================================================================

-- 1. Drop the existing tier constraint and recreate it with 'free' allowed.
--    Migration 20260311223000 removed 'free'; we need it back so the webhook
--    can downgrade deleted subscriptions gracefully.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier IN ('free', 'essentials', 'pro', 'founder', 'builder'));

-- 2. updated_at column — add if missing so webhook writes don't fail silently.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Auto-update trigger (idempotent CREATE OR REPLACE + DROP IF EXISTS on trigger).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_set_updated_at ON public.subscriptions;

CREATE TRIGGER trg_subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Ensure RLS is on (noop if already enabled).
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Block authenticated users from inserting new subscription rows directly.
-- Only the service role (webhook/API) may create subscription records.
DROP POLICY IF EXISTS "block_authenticated_insert" ON public.subscriptions;
CREATE POLICY "block_authenticated_insert"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Block authenticated users from updating subscription rows directly.
DROP POLICY IF EXISTS "block_authenticated_update" ON public.subscriptions;
CREATE POLICY "block_authenticated_update"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (false);

-- Block authenticated users from deleting subscription rows directly.
DROP POLICY IF EXISTS "block_authenticated_delete" ON public.subscriptions;
CREATE POLICY "block_authenticated_delete"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (false);

-- Ensure the SELECT policy exists (idempotent).
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
    USING ((SELECT auth.uid()) = user_id);
  END IF;
END
$$;

-- 4. Update get_user_tier to return 'free' when no active subscription found.
CREATE OR REPLACE FUNCTION public.get_user_tier(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT tier
      FROM subscriptions
      WHERE user_id = user_uuid
        AND status IN ('active', 'trialing', 'past_due')
      ORDER BY current_period_end DESC NULLS LAST, updated_at DESC NULLS LAST
      LIMIT 1
    ),
    'free'
  );
$$;
