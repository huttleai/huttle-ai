-- ============================================================================
-- ADD FOUNDER TIER TO SUBSCRIPTIONS TABLE
-- Run this in your Supabase SQL Editor BEFORE launch
-- Required for Founders Club $199/year payments to process correctly
-- ============================================================================

-- Step 1: Drop the existing check constraint on the tier column
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

-- Step 2: Add new check constraint that includes 'founder' tier
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_tier_check 
CHECK (tier IN ('free', 'essentials', 'pro', 'founder'));

-- Step 3: Update the get_user_tier function to handle founder tier
CREATE OR REPLACE FUNCTION get_user_tier(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT tier FROM subscriptions 
     WHERE user_id = user_uuid 
     AND status IN ('active', 'trialing')
     LIMIT 1),
    'free'
  );
$$;

-- Verify: Check the constraint was updated
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.subscriptions'::regclass 
-- AND conname = 'subscriptions_tier_check';
