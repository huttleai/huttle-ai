-- Fix 1: calculate_engagement_rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
  p_likes INTEGER,
  p_comments INTEGER,
  p_shares INTEGER,
  p_impressions INTEGER
)
RETURNS DECIMAL(5, 2)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF p_impressions = 0 OR p_impressions IS NULL THEN
    RETURN 0.00;
  END IF;
  
  RETURN ROUND(
    ((p_likes + p_comments + p_shares)::DECIMAL / p_impressions::DECIMAL) * 100,
    2
  );
END;
$$;

-- Fix 2: get_analytics_summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_user_id UUID,
  p_platform TEXT DEFAULT 'all',
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  platform TEXT,
  total_posts INTEGER,
  total_views BIGINT,
  total_engagement BIGINT,
  avg_engagement_rate DECIMAL(5, 2),
  best_performing_post_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.platform,
    COUNT(DISTINCT sa.id)::INTEGER as total_posts,
    SUM(sa.views)::BIGINT as total_views,
    SUM(sa.likes + sa.comments + sa.shares)::BIGINT as total_engagement,
    AVG(sa.engagement_rate) as avg_engagement_rate,
    (
      SELECT id FROM public.social_analytics
      WHERE user_id = p_user_id
        AND (p_platform = 'all' OR platform = p_platform)
        AND post_date >= NOW() - (p_days || ' days')::INTERVAL
      ORDER BY engagement_rate DESC
      LIMIT 1
    ) as best_performing_post_id
  FROM public.social_analytics sa
  WHERE sa.user_id = p_user_id
    AND (p_platform = 'all' OR sa.platform = p_platform)
    AND sa.post_date >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY sa.platform;
END;
$$;

-- Fix 3: update_analytics_updated_at
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix 4: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix 5: get_connected_platforms
CREATE OR REPLACE FUNCTION get_connected_platforms(user_uuid UUID)
RETURNS TABLE(platform TEXT, username TEXT, connected_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sc.platform,
    sc.platform_username,
    sc.connected_at
  FROM public.social_connections sc
  WHERE sc.user_id = user_uuid
    AND sc.is_connected = true
  ORDER BY sc.platform;
$$;

-- Fix 6: is_platform_connected
CREATE OR REPLACE FUNCTION is_platform_connected(user_uuid UUID, platform_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.social_connections
    WHERE user_id = user_uuid
      AND platform = LOWER(platform_name)
      AND is_connected = true
  );
$$;

-- Fix 7: update_social_updates_updated_at
CREATE OR REPLACE FUNCTION update_social_updates_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix 8: update_post_status_change
CREATE OR REPLACE FUNCTION update_post_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_status_change = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Fix 9: update_user_preferences_updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

