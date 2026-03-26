import { supabase } from '../config/supabase';
import { sanitizeNicheContentCacheKey } from './normalizeNiche';

export async function getCachedResult(cacheKey) {
  try {
    const safeKey = sanitizeNicheContentCacheKey(cacheKey);
    if (!safeKey) return null;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const nowIso = new Date().toISOString();
    const userId = session.user?.id;

    let result = null;

    if (userId) {
      const { data, error } = await supabase
        .from('niche_content_cache')
        .select('*')
        .eq('cache_key', safeKey)
        .eq('user_id', userId)
        .gt('expires_at', nowIso)
        .maybeSingle();

      if (!error && data) {
        result = data;
      }
    }

    if (!result) {
      const { data, error } = await supabase
        .from('niche_content_cache')
        .select('*')
        .eq('cache_key', safeKey)
        .is('user_id', null)
        .gt('expires_at', nowIso)
        .maybeSingle();

      if (!error && data) {
        result = data;
      }
    }

    if (!result) return null;
    return {
      data: result.payload ?? result.result_data,
      generatedAt: result.generated_at,
      cached: true,
    };
  } catch {
    return null;
  }
}

// Cache writes happen server-side only in api/ai/perplexity.js.
