-- Restrict get_user_tier so a PostgREST caller can only look up their own
-- tier. The function is SECURITY DEFINER, so without this check any role
-- with EXECUTE could read another user's subscription tier.
--
-- Allowed:
--   * JWT role service_role (admin / server)
--   * JWT role authenticated or anon, only when auth.uid() = user_uuid
--   * Direct SQL with no JWT (dashboard / migrations / triggers)
--
-- EXECUTE is revoked from PUBLIC and anon so unauthenticated Data API
-- callers cannot invoke it.

CREATE OR REPLACE FUNCTION public.get_user_tier(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text := COALESCE((SELECT auth.role()), '');
  caller_uid uuid := (SELECT auth.uid());
  resolved_tier text;
BEGIN
  IF caller_role = 'service_role' THEN
    NULL;
  ELSIF caller_role IN ('authenticated', 'anon') THEN
    IF caller_uid IS DISTINCT FROM user_uuid THEN
      RAISE EXCEPTION 'not authorized to read another user''s tier'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT s.tier
    INTO resolved_tier
    FROM public.subscriptions s
    WHERE s.user_id = user_uuid
      AND s.status IN ('active', 'trialing', 'past_due')
    ORDER BY s.current_period_end DESC NULLS LAST, s.updated_at DESC NULLS LAST
    LIMIT 1;

  RETURN COALESCE(resolved_tier, 'free');
END;
$$;

COMMENT ON FUNCTION public.get_user_tier(uuid) IS
  'Returns the caller''s subscription tier. SECURITY DEFINER; PostgREST callers may only look up auth.uid().';

REVOKE ALL ON FUNCTION public.get_user_tier(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_tier(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_tier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tier(uuid) TO service_role;
