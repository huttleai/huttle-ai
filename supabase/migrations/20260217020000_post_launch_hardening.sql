-- ============================================================================
-- Post-launch hardening: persistent API rate limits + Stripe idempotency
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_rate_limit_counters (
  user_key text NOT NULL,
  route text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_key, route, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limit_updated_at
  ON public.api_rate_limit_counters (updated_at DESC);

CREATE OR REPLACE FUNCTION public.increment_api_rate_limit(
  p_user_key text,
  p_route text,
  p_window_seconds integer,
  p_max_requests integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  reset_at timestamptz,
  request_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_reset_at timestamptz;
  v_count integer;
BEGIN
  IF p_window_seconds IS NULL OR p_window_seconds <= 0 THEN
    p_window_seconds := 60;
  END IF;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_reset_at := v_window_start + make_interval(secs => p_window_seconds);

  INSERT INTO public.api_rate_limit_counters (user_key, route, window_start, request_count, updated_at)
  VALUES (p_user_key, p_route, v_window_start, 1, now())
  ON CONFLICT (user_key, route, window_start)
  DO UPDATE SET
    request_count = public.api_rate_limit_counters.request_count + 1,
    updated_at = now()
  RETURNING public.api_rate_limit_counters.request_count INTO v_count;

  -- Keep table bounded without requiring a separate cron job
  DELETE FROM public.api_rate_limit_counters
  WHERE updated_at < (now() - interval '2 days');

  RETURN QUERY
  SELECT
    (v_count <= p_max_requests) AS allowed,
    GREATEST(0, p_max_requests - v_count) AS remaining,
    v_reset_at AS reset_at,
    v_count AS request_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_api_rate_limit(text, text, integer, integer) TO service_role;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
