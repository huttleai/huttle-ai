-- ============================================================================
-- NOT READ BY ANY APPLICATION CODE as of 2026-08-26. FEATURE_RUN_CAPS in
-- src/config/creditConfig.js is the live enforcement source. This table exists
-- in production and is captured here for history only. Do not add enforcement
-- logic against it without a deliberate decision.
-- ============================================================================
--
-- public.tier_feature_limits exists in production (verified 2026-08-25) but no
-- repo migration created it. This captures the live production shape so a
-- from-scratch migration run converges on production. CREATE TABLE IF NOT
-- EXISTS makes this a no-op against production itself. No rows are seeded.

CREATE TABLE IF NOT EXISTS public.tier_feature_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,
  feature_key text NOT NULL,
  monthly_limit integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier, feature_key)
);
