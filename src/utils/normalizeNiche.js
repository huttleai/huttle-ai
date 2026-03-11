const NICHE_VARIANTS = {
  med_spa: ['med spa', 'medspa', 'medical spa'],
  fitness_coach: ['fitness coach', 'fitness coaching', 'personal trainer'],
  small_business: ['small business'],
  content_creator: ['solo content creator', 'content creator', 'solopreneur'],
};
const CACHE_KEY_DELIMITER = '__';

function resolveCacheKeyInput(input) {
  return input.length === 1 && Array.isArray(input[0]) ? input[0] : input;
}

function sanitizeCacheKeyPart(value) {
  return String(value ?? '').trim().replace(/:/g, '_');
}

function normalizeCacheKeyParts(parts) {
  if (parts.length === 5) {
    const [niche, platform, city, date, type] = parts;

    return [
      normalizeNiche(sanitizeCacheKeyPart(niche)),
      sanitizeCacheKeyPart(platform).toLowerCase().replace(/\s+/g, '_'),
      (sanitizeCacheKeyPart(city || 'global').toLowerCase().replace(/\s+/g, '_') || 'global'),
      sanitizeCacheKeyPart(date),
      sanitizeCacheKeyPart(type).toLowerCase().replace(/\s+/g, '_'),
    ].filter(Boolean);
  }

  return parts
    .filter(Boolean)
    .map((part) => sanitizeCacheKeyPart(part));
}

function formatCacheKey(parts) {
  return normalizeCacheKeyParts(parts).join(CACHE_KEY_DELIMITER);
}

function runCacheKeyFormatAssertions() {
  const testKey = formatCacheKey(['Med Spa', 'instagram', 'Atlanta', '2026-03-11', 'trending']);

  console.assert(
    testKey === 'med_spa__instagram__atlanta__2026-03-11__trending',
    'Cache key format is wrong:',
    testKey
  );
  console.assert(
    !testKey.includes(':'),
    'Cache key still contains colons!',
    testKey
  );
}

export function normalizeNiche(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw.toLowerCase().trim();
  for (const [normalized, variants] of Object.entries(NICHE_VARIANTS)) {
    if (variants.includes(cleaned)) return normalized;
  }
  return cleaned.replace(/\s+/g, '_');
}

export function buildCacheKey(...input) {
  const cacheKey = formatCacheKey(resolveCacheKeyInput(input));
  console.log('[Cache Key]', cacheKey);
  return cacheKey;
}

export function extractFromCacheKey(cacheKey) {
  const parts = cacheKey.split(CACHE_KEY_DELIMITER);
  const feature = parts[parts.length - 1] || '';
  return {
    niche: parts[0] || '',
    platform: parts[1] || '',
    feature,
  };
}

if (import.meta.env?.DEV) {
  runCacheKeyFormatAssertions();
}
