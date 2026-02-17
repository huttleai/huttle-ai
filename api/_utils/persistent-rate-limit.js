import { createClient } from '@supabase/supabase-js';
import { logWarn } from './observability.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const fallbackStore = new Map();

function fallbackRateLimit(userKey, maxRequests, windowSeconds) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const current = fallbackStore.get(userKey) || { count: 0, resetAt: now + windowMs };

  if (now > current.resetAt) {
    current.count = 0;
    current.resetAt = now + windowMs;
  }

  current.count += 1;
  fallbackStore.set(userKey, current);

  return {
    allowed: current.count <= maxRequests,
    remaining: Math.max(0, maxRequests - current.count),
    resetAt: current.resetAt,
  };
}

export async function checkPersistentRateLimit({
  userKey,
  route,
  maxRequests,
  windowSeconds = 60,
}) {
  if (!supabase || !userKey || !route) {
    return fallbackRateLimit(`${route}:${userKey || 'anon'}`, maxRequests, windowSeconds);
  }

  try {
    const { data, error } = await supabase.rpc('increment_api_rate_limit', {
      p_user_key: userKey,
      p_route: route,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests,
    });

    if (error || !Array.isArray(data) || data.length === 0) {
      if (error) {
        logWarn('rate_limit.rpc_failed', { route, userKey, error: error.message });
      }
      return fallbackRateLimit(`${route}:${userKey}`, maxRequests, windowSeconds);
    }

    const result = data[0];
    return {
      allowed: Boolean(result.allowed),
      remaining: Number(result.remaining || 0),
      resetAt: new Date(result.reset_at).getTime(),
    };
  } catch (error) {
    logWarn('rate_limit.unexpected_error', { route, userKey, error: error.message });
    return fallbackRateLimit(`${route}:${userKey}`, maxRequests, windowSeconds);
  }
}
