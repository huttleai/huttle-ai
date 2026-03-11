import { supabase } from '../config/supabase';

export async function getCachedResult(cacheKey) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from('niche_content_cache')
      .select('payload, generated_at, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) return null;
    return { data: data.payload, generatedAt: data.generated_at, cached: true };
  } catch {
    return null;
  }
}

// Cache writes happen server-side only in api/ai/perplexity.js.
