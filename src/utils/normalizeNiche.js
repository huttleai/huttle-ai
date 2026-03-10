const NICHE_VARIANTS = {
  med_spa: ['med spa', 'medspa', 'medical spa'],
  fitness_coach: ['fitness coach', 'fitness coaching', 'personal trainer'],
  small_business: ['small business'],
  content_creator: ['solo content creator', 'content creator', 'solopreneur'],
};

export function normalizeNiche(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw.toLowerCase().trim();
  for (const [normalized, variants] of Object.entries(NICHE_VARIANTS)) {
    if (variants.includes(cleaned)) return normalized;
  }
  return cleaned.replace(/\s+/g, '_');
}

export function buildCacheKey(parts) {
  return parts.filter(Boolean).join(':');
}

export function extractFromCacheKey(cacheKey) {
  const parts = cacheKey.split(':');
  const feature = parts[parts.length - 1] || '';
  return {
    niche: parts[0] || '',
    platform: parts[1] || '',
    feature,
  };
}
