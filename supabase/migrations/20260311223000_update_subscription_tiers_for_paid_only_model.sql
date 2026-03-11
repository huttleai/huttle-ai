DELETE FROM public.subscriptions
WHERE tier = 'free';

ALTER TABLE public.subscriptions
ALTER COLUMN tier DROP DEFAULT;

ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_tier_check
CHECK (tier IN ('founder', 'builder', 'essentials', 'pro'));

CREATE OR REPLACE FUNCTION get_user_tier(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tier
  FROM subscriptions
  WHERE user_id = user_uuid
    AND status IN ('active', 'trialing', 'past_due')
  ORDER BY current_period_end DESC NULLS LAST, updated_at DESC NULLS LAST
  LIMIT 1;
$$;
