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

function normalizeCacheToken(value, fallback = '') {
  const normalized = sanitizeCacheKeyPart(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
}

function isDateKeyPart(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

function buildStableHash(value) {
  let hash = 0;

  for (const char of String(value || '')) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function normalizeNicheIntelToken(token) {
  const trimmed = String(token || '').trim().toLowerCase();
  if (!trimmed) return '';

  const isHandle = trimmed.startsWith('@');
  const normalized = trimmed
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) return '';
  return isHandle ? `handle_${normalized}` : normalized;
}

function normalizeCacheKeyParts(parts) {
  if (parts.length === 5) {
    const [niche, platform, city, date, type] = parts;

    return [
      normalizeNiche(sanitizeCacheKeyPart(niche)),
      normalizeCacheToken(platform, 'instagram'),
      normalizeCacheToken(city || 'global', 'global'),
      sanitizeCacheKeyPart(date),
      normalizeCacheToken(type),
    ].filter(Boolean);
  }

  if (parts.length === 4) {
    const [niche, platform, dateOrScope, type] = parts;

    if (isDateKeyPart(dateOrScope)) {
      return [
        normalizeNiche(sanitizeCacheKeyPart(niche)),
        normalizeCacheToken(platform, 'instagram'),
        sanitizeCacheKeyPart(dateOrScope),
        normalizeCacheToken(type),
      ].filter(Boolean);
    }
  }

  if (parts.length === 3) {
    const [niche, platform, type] = parts;

    return [
      normalizeNiche(sanitizeCacheKeyPart(niche)),
      normalizeCacheToken(platform, 'all'),
      normalizeCacheToken(type),
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

export function buildNicheIntelQuerySignature(rawQuery) {
  const tokens = String(rawQuery || '')
    .split(',')
    .map(normalizeNicheIntelToken)
    .filter(Boolean)
    .sort();

  const joinedTokens = tokens.join(CACHE_KEY_DELIMITER) || 'general';
  if (joinedTokens.length <= 72) {
    return joinedTokens;
  }

  return `${joinedTokens.slice(0, 40)}_${buildStableHash(joinedTokens)}`;
}

export function buildNicheIntelCacheKey({ niche, platform = 'instagram', query, date }) {
  return buildCacheKey([
    niche,
    platform,
    buildNicheIntelQuerySignature(query),
    date,
    'niche_intel',
  ]);
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
