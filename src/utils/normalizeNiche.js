const ALIASES = {
  // Med Spa
  med_spa: [
    'medspa', 'medical_spa', 'medical spa', 'aesthetics_spa',
    'aesthetics', 'med spa', 'medi_spa', 'medi spa',
    'aesthetic clinic', 'aesthetic_clinic',
  ],
  // Fitness
  fitness: [
    'fitness_coach', 'fitness coach', 'personal_trainer',
    'personal trainer', 'personal_training', 'gym',
    'fitness_coaching', 'health_coach', 'health coach',
    'crossfit', 'yoga', 'pilates', 'bootcamp',
  ],
  // Real Estate
  real_estate: [
    'realtor', 'real estate', 'real_estate_agent',
    'real estate agent', 'property', 'realty',
    'real_estate_investor', 'real estate investor', 'mortgage',
  ],
  // Restaurant / Food
  restaurant: [
    'food', 'cafe', 'bakery', 'coffee_shop', 'coffee shop',
    'eatery', 'bar', 'bistro', 'food_blogger', 'food blogger',
    'catering', 'food truck', 'food_truck',
  ],
  // Ecommerce
  ecommerce: [
    'online_store', 'online store', 'online_shop', 'online shop',
    'dropshipping', 'etsy', 'shopify', 'product_business',
    'product business', 'amazon seller', 'amazon_seller',
  ],
  // Photography / Videography
  photography: [
    'photographer', 'photo', 'videographer', 'videography',
    'content_photography', 'brand_photography', 'wedding photographer',
    'wedding_photographer', 'portrait photographer',
  ],
  // Coaching / Consulting
  coaching: [
    'life_coach', 'life coach', 'business_coach', 'business coach',
    'coach', 'consultant', 'consulting', 'executive_coach',
    'executive coach', 'mindset coach', 'mindset_coach',
  ],
  // Fashion
  fashion: [
    'style', 'clothing', 'boutique', 'streetwear', 'apparel',
    'fashion_blogger', 'fashion blogger', 'stylist',
    'personal stylist', 'personal_stylist',
  ],
  // Beauty
  beauty: [
    'makeup', 'skincare', 'hair', 'nail', 'lash', 'brow',
    'beauty_salon', 'beauty salon', 'hair_salon', 'hair salon',
    'esthetician', 'cosmetologist', 'nail tech', 'nail_tech',
    'lash tech', 'lash_tech', 'microblading',
  ],
  // Health / Wellness
  health: [
    'wellness', 'nutrition', 'nutritionist', 'dietitian',
    'holistic', 'naturopath', 'mental_health', 'therapist',
    'chiropractor', 'acupuncture', 'functional medicine',
  ],
  // Solo Creator / Personal Brand
  // IMPORTANT: Many Huttle users are creators without a
  // specific business niche — they just want to grow on social.
  creator: [
    'content_creator', 'content creator', 'influencer',
    'ugc', 'ugc_creator', 'ugc creator', 'social_media',
    'social media', 'social_media_creator', 'social media creator',
    'viral', 'grow_my_following', 'grow my following',
    'personal_brand', 'personal brand', 'brand',
    'lifestyle', 'lifestyle_blogger', 'lifestyle blogger',
    'blogger', 'vlogger', 'tiktoker', 'instagrammer',
    'youtube', 'youtuber', 'podcaster', 'podcast',
  ],
};

const CACHE_KEY_DELIMITER = '__';

/**
 * Sanitize any string used as (or embedded in) a niche_content_cache key for Supabase lookups.
 * Lowercase, spaces → underscores, then strip everything except a-z, 0-9, underscore, hyphen.
 */
export function sanitizeNicheContentCacheKey(key) {
  if (key == null) return '';
  return String(key)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');
}

export function normalizeNiche(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    console.log('[NicheCache] Key lookup', {
      rawNiche: rawInput,
      normalizedKey: 'general',
      aliasMatch: false,
    });
    return 'general';
  }

  // Step 1: clean the raw input (cache-safe charset for niche_content_cache keys)
  const cleaned = sanitizeNicheContentCacheKey(rawInput)
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40); // cap length for DB safety

  if (!cleaned) {
    console.log('[NicheCache] Key lookup', {
      rawNiche: rawInput,
      normalizedKey: 'general',
      aliasMatch: false,
    });
    return 'general';
  }

  // Step 2: check ALIASES (Layer 1)
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    const normalizedAliases = aliases.map((a) => sanitizeNicheContentCacheKey(a)
      .replace(/_+/g, '_'));
    if (cleaned === canonical || normalizedAliases.includes(cleaned)) {
      console.log('[NicheCache] Key lookup', {
        rawNiche: rawInput,
        normalizedKey: canonical,
        aliasMatch: true,
      });
      return canonical;
    }
  }

  // Step 3: algorithmic fallback (Layer 2)
  // Works for ANY niche — "axe throwing venue" → "axe_throwing_venue"
  console.log('[NicheCache] Key lookup', {
    rawNiche: rawInput,
    normalizedKey: cleaned,
    aliasMatch: false,
  });
  return cleaned;
}

// Reverse lookup for display in UI
export function normalizeNicheForDisplay(key) {
  if (!key) return '';
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/*
NORMALIZATION CONTRACT — edge case reference:
normalizeNiche('Med Spa')                  → 'med_spa'
normalizeNiche('MedSpa')                   → 'med_spa'
normalizeNiche('medical spa')              → 'med_spa'
normalizeNiche('UGC Creator')              → 'creator'
normalizeNiche('content creator')          → 'creator'
normalizeNiche('grow my following')        → 'creator'
normalizeNiche('influencer')               → 'creator'
normalizeNiche('vintage motorcycle shop')  → 'vintage_motorcycle_shop'
normalizeNiche('axe throwing venue')       → 'axe_throwing_venue'
normalizeNiche('Tattoo Artist')            → 'tattoo_artist'
normalizeNiche('Wedding Planner')          → 'wedding_planner'
normalizeNiche('Law Firm')                 → 'law_firm'
normalizeNiche(null)                       → 'general'
normalizeNiche('')                         → 'general'
*/

function resolveCacheKeyInput(input) {
  return input.length === 1 && Array.isArray(input[0]) ? input[0] : input;
}

function sanitizeCacheKeyPart(value) {
  return sanitizeNicheContentCacheKey(String(value ?? '').trim().replace(/:/g, '_'));
}

function normalizeCacheToken(value, fallback = '') {
  const normalized = sanitizeNicheContentCacheKey(value)
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
  const normalized = sanitizeNicheContentCacheKey(trimmed.replace(/^@/, ''))
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
  const joined = normalizeCacheKeyParts(parts).join(CACHE_KEY_DELIMITER);
  return sanitizeNicheContentCacheKey(joined);
}

function runCacheKeyFormatAssertions() {
  const testKey = formatCacheKey(['Med Spa', 'instagram', 'Atlanta', '2026-03-11', 'trending']);

  console.assert(
    testKey === 'med_spa__instagram__atlanta__2026-03-11__trending',
    'Cache key format is wrong:',
    testKey,
  );
  console.assert(
    !testKey.includes(':'),
    'Cache key still contains colons!',
    testKey,
  );
}

/**
 * Shared niche_content_cache key segments for dashboard "For you" hashtags (user-scoped).
 * Niche segment always passes through {@link normalizeNiche}.
 */
export function buildDashboardForYouCacheKey(userId, generatedDate, rawNiche, platform) {
  const nicheKey = normalizeNiche(rawNiche) || 'general';
  const platformKey = String(platform || 'instagram').toLowerCase();
  const raw = `dashboard_for_you__${userId}__${generatedDate}__${nicheKey}__${platformKey}__foryou_v2`;
  return sanitizeNicheContentCacheKey(raw);
}

export function buildCacheKey(...input) {
  const cacheKey = formatCacheKey(resolveCacheKeyInput(input));
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
