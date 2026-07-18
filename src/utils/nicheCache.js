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
      // Prod schema truth: niche_content_cache has generated_date and cache_date
      // (no generated_at; created_at is unconfirmed — do not depend on it).
      generatedAt: result.generated_date || result.cache_date,
      cached: true,
    };
  } catch {
    return null;
  }
}

// Cache writes happen server-side only in api/ai/perplexity.js.
