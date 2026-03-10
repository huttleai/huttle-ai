import { supabase } from '../config/supabase';

const DEFAULT_TTL_HOURS = 24;

export async function getCachedResult(cacheKey) {
  try {
    const { data, error } = await supabase
      .from('niche_content_cache')
      .select('result_data, generated_at, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) return null;
    return { data: data.result_data, generatedAt: data.generated_at, cached: true };
  } catch {
    return null;
  }
}

export async function setCacheResult(cacheKey, resultData, metadata = {}, ttlHours = DEFAULT_TTL_HOURS) {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const { error } = await supabase
      .from('niche_content_cache')
      .upsert({
        cache_key: cacheKey,
        niche: metadata.niche || null,
        platform: metadata.platform || null,
        feature: metadata.feature || null,
        user_type: metadata.userType || null,
        result_data: resultData,
        generated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'cache_key' });

    if (error) console.warn('Cache write failed:', error.message);
  } catch {
    // Cache write failures should not break the app
  }
}

export async function getCachedOrFetch(cacheKey, fetchFn, metadata = {}, ttlHours = DEFAULT_TTL_HOURS) {
  const cached = await getCachedResult(cacheKey);
  if (cached) return cached;

  const freshData = await fetchFn();
  if (freshData) {
    setCacheResult(cacheKey, freshData, metadata, ttlHours);
  }
  return { data: freshData, cached: false };
}
