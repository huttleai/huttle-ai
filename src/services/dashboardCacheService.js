import { supabase, trackUsage } from '../config/supabase';
import { API_TIMEOUTS } from '../config/apiConfig';
import { normalizeNiche, buildCacheKey } from '../utils/normalizeNiche';
import { retryFetch } from '../utils/retryFetch';
import { buildBrandContext as buildCreatorBrandBlock } from '../utils/buildBrandContext'; // HUTTLE AI: brand context injected

const DASHBOARD_CACHE_TABLE = 'daily_dashboard_cache';
const GROK_PROXY_URL = '/api/ai/grok';
const PERPLEXITY_PROXY_URL = '/api/ai/perplexity';
const DEFAULT_NICHE = 'small business';
const DEFAULT_PLATFORM = 'instagram';
const DEFAULT_CITY = 'global';
const DEFAULT_AUDIENCE = '';
const BRAND_VOICE_NUDGE_COPY = 'Set your Brand Voice for niche-specific trends →';
const SUPPORTED_DASHBOARD_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'twitter'];
const GENERIC_TRENDING_NICHES = new Set([
  '',
  'lifestyle',
  'general',
  'personal',
  'content creator',
  'content_creator',
  'influencer',
  'social media',
]);
const MOMENTUM_VALUES = new Set(['rising', 'peaking', 'steady', 'declining']);
const REACH_VALUES = new Set(['high', 'medium', 'niche']);
const INSIGHT_CATEGORIES = new Set(['Strategy', 'Timing', 'Audience', 'Platform', 'Content Type']);
const TRENDING_FALLBACK = [
  {
    title: 'Client transformation stories',
    description: 'Before and after content drives high engagement and saves for service businesses.',
    momentum: 'rising',
    category: 'promotion',
  },
  {
    title: 'Behind the scenes',
    description: 'Day-in-the-life content builds trust and humanizes your brand.',
    momentum: 'steady',
    category: 'community',
  },
  {
    title: 'Quick tip videos',
    description: 'Educational short-form content consistently outperforms promotional posts.',
    momentum: 'peaking',
    category: 'education',
  },
  {
    title: 'Customer testimonials',
    description: 'Social proof content has strong conversion rates across all platforms.',
    momentum: 'steady',
    category: 'promotion',
  },
  {
    title: 'Seasonal promotions',
    description: 'Limited time offers with clear CTAs drive immediate booking and inquiries.',
    momentum: 'rising',
    category: 'promotion',
  },
];
const HASHTAG_FALLBACK = [
  { tag: '#contentcreator', volume: 'HIGH', status: 'Trending', type: 'hashtag' },
  { tag: '#creatortips', volume: 'MEDIUM', status: 'Trending', type: 'hashtag' },
  { tag: '#socialmediatips', volume: 'HIGH', status: 'Trending', type: 'hashtag' },
  { tag: '#reelsstrategy', volume: 'MEDIUM', status: 'Niche', type: 'hashtag' },
  { tag: '#audiencegrowth', volume: 'MEDIUM', status: 'Trending', type: 'hashtag' },
  { tag: '#digitalcreator', volume: 'HIGH', status: 'Trending', type: 'hashtag' },
  { tag: '#personalbrand', volume: 'MEDIUM', status: 'Niche', type: 'hashtag' },
  { tag: '#creatorjourney', volume: 'NICHE', status: 'Niche', type: 'hashtag' },
];

function getUtcDateString(date = new Date()) { // HUTTLE AI: cache fix
  const year = date.getUTCFullYear(); // HUTTLE AI: cache fix
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // HUTTLE AI: cache fix
  const day = String(date.getUTCDate()).padStart(2, '0'); // HUTTLE AI: cache fix
  return `${year}-${month}-${day}`; // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix

function getCurrentMonthYear(date = new Date()) {
  return {
    month: date.toLocaleString('en-US', { month: 'long' }),
    year: date.getFullYear(),
  };
}

function normalizeTextValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .find(Boolean) || '';
  }
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePlatformValue(platform) {
  const value = normalizeTextValue(platform).toLowerCase();
  if (value === 'x') return 'twitter';
  return value;
}

function formatPlatformLabel(platform) {
  const value = normalizePlatformValue(platform);
  if (value === 'instagram') return 'Instagram';
  if (value === 'facebook') return 'Facebook';
  if (value === 'tiktok') return 'TikTok';
  if (value === 'youtube') return 'YouTube';
  if (value === 'linkedin') return 'LinkedIn';
  if (value === 'twitter') return 'X';
  return platform || 'Instagram';
}

function normalizeCity(rawCity) {
  const city = normalizeTextValue(rawCity).toLowerCase();
  return city ? city.replace(/\s+/g, '_') : DEFAULT_CITY;
}

function getBrandVoiceNiche(brandVoice = {}) {
  return normalizeTextValue(brandVoice?.niche || brandVoice?.contentFocus || brandVoice?.content_focus);
}

function getBrandVoiceGrowthStage(brandVoice = {}) {
  return normalizeTextValue(brandVoice?.growthStage || brandVoice?.growth_stage).toLowerCase();
}

function getBrandVoiceCreatorType(brandVoice = {}) {
  const explicitCreatorType = normalizeTextValue(brandVoice?.creatorType || brandVoice?.creator_type).toLowerCase();
  if (explicitCreatorType) {
    if (explicitCreatorType === 'creator') return 'solo_creator';
    if (explicitCreatorType === 'brand' || explicitCreatorType === 'business') return 'brand_business';
    return explicitCreatorType.replace(/\s+/g, '_');
  }

  const profileType = normalizeTextValue(brandVoice?.profileType || brandVoice?.profile_type).toLowerCase();
  if (profileType === 'creator') return 'solo_creator';
  if (profileType === 'brand' || profileType === 'business') return 'brand_business';
  return null;
}

function isGenericTrendingNiche(niche) {
  const normalizedNiche = normalizeTextValue(niche).toLowerCase();
  return !normalizedNiche || GENERIC_TRENDING_NICHES.has(normalizedNiche);
}

function getTrendingMode(brandVoice = {}) {
  const niche = getBrandVoiceNiche(brandVoice);
  const growthStage = getBrandVoiceGrowthStage(brandVoice);

  const hasSpecificNiche = Boolean(niche) && !isGenericTrendingNiche(niche);
  const isJustStarting = growthStage === 'just_starting_out';

  if (!hasSpecificNiche || isJustStarting) {
    return 'platform_wide';
  }

  return 'niche_specific';
}

function parseStructuredJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  const trimmed = rawText.trim();

  const tryParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const direct = tryParse(trimmed);
  if (direct) return direct;

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    const fenced = tryParse(fencedMatch[1].trim());
    if (fenced) return fenced;
  }

  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    const arrayValue = tryParse(trimmed.slice(arrayStart, arrayEnd + 1));
    if (arrayValue) return arrayValue;
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return tryParse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  return null;
}

function parsePerplexityResponse(text) {
  if (Array.isArray(text)) {
    return text;
  }

  if (!text || typeof text !== 'string') {
    if (text != null) {
      console.warn('[Perplexity] Response is not an array:', typeof text);
    }
    return null;
  }

  try {
    let cleaned = text.trim();
    cleaned = cleaned
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      console.warn('[Perplexity] Response is not an array:', typeof parsed);
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn(
      '[Perplexity] JSON parse failed:',
      err.message,
      '\nRaw text:',
      text.substring(0, 200)
    );
    return null;
  }
}

function parseTrendingResponse(raw) {
  try {
    if (Array.isArray(raw)) {
      return raw;
    }

    if (raw && typeof raw === 'object') {
      const keys = ['topics', 'trending', 'trends', 'results', 'data', 'items'];
      for (const key of keys) {
        if (Array.isArray(raw[key])) return raw[key];
      }

      console.warn('[Trending] Got object not array, wrapping:', Object.keys(raw));
      return [raw];
    }

    let text = typeof raw === 'string' ? raw.trim() : '';
    text = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) return parsed;

    const keys = ['topics', 'trending', 'trends', 'results', 'data', 'items'];
    for (const key of keys) {
      if (Array.isArray(parsed?.[key])) return parsed[key];
    }

    if (typeof parsed === 'object' && parsed !== null) {
      console.warn('[Trending] Got object not array, wrapping:', Object.keys(parsed));
      return [parsed];
    }

    console.warn('[Trending] Unparseable response shape:', typeof parsed);
    return null;
  } catch (err) {
    const rawPreview = typeof raw === 'string'
      ? raw.substring(0, 300)
      : JSON.stringify(raw ?? null)?.substring(0, 300);
    console.warn('[Trending] JSON parse failed:', err.message, '\nRaw (first 300):', rawPreview);
    return null;
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getDashboardSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session || null;
  } catch (error) {
    console.warn('[Dashboard] Session lookup failed, skipping cache read:', error.message);
    return null;
  }
}

function buildDashboardBrandContext(brandProfile) {
  const rawNiche = getBrandVoiceNiche(brandProfile);
  const niche = rawNiche || DEFAULT_NICHE;
  const selectedPlatforms = ensureArray(brandProfile?.platforms)
    .map(normalizePlatformValue)
    .filter((platform, index, array) => platform && array.indexOf(platform) === index)
    .filter((platform) => SUPPORTED_DASHBOARD_PLATFORMS.includes(platform));
  const hasCompletePlatforms = selectedPlatforms.length > 0;
  const hasCompleteNiche = Boolean(rawNiche);
  const hasCompleteBrandVoice = hasCompletePlatforms && hasCompleteNiche;
  const trendingMode = getTrendingMode(brandProfile);
  const cacheNiche = trendingMode === 'platform_wide'
    ? 'platform_wide'
    : normalizeNiche(niche || DEFAULT_NICHE);
  const primaryPlatform = hasCompletePlatforms ? selectedPlatforms[0] : DEFAULT_PLATFORM;

  return {
    rawNiche,
    niche,
    normalizedNiche: normalizeNiche(niche || DEFAULT_NICHE),
    cacheNiche,
    selectedPlatforms: hasCompletePlatforms ? selectedPlatforms : [DEFAULT_PLATFORM],
    primaryPlatform,
    primaryPlatformLabel: formatPlatformLabel(primaryPlatform),
    city: normalizeTextValue(brandProfile?.city) || null,
    normalizedCity: normalizeCity(brandProfile?.city),
    targetAudience: normalizeTextValue(brandProfile?.targetAudience) || DEFAULT_AUDIENCE,
    trendingMode,
    showPlatformWideNicheNudge: trendingMode === 'platform_wide' && !rawNiche,
    showBrandVoiceNudge: !hasCompleteBrandVoice,
    brandVoiceNudgeCopy: BRAND_VOICE_NUDGE_COPY,
    brandProfile, // HUTTLE AI: brand context injected — pass through for AI insight personalization
  };
}

function buildPerPlatformCacheKey(context, platform, type, generatedDate) {
  return buildCacheKey(
    context.cacheNiche,
    normalizePlatformValue(platform),
    context.normalizedCity,
    generatedDate,
    type,
  );
}

async function getWarmPlatformCache(cacheKey, platform, type) {
  const session = await getDashboardSession();
  if (!session) {
    console.warn('[Dashboard] No auth session, skipping user data fetch');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('niche_content_cache')
      .select('payload, hit_count')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.warn('[Cache Read Skipped]', error.message, error.code, cacheKey);
      return null;
    }

    if (data) {
      console.log('[Cache HIT]', cacheKey);
      return data.payload;
    }

    console.log('[Cache MISS]', cacheKey);
    return null;
  } catch {
    return null;
  }
}

async function getPreviousDayPlatformCache(context, platform, type, generatedDate) {
  const session = await getDashboardSession();
  if (!session) {
    console.warn('[Dashboard] No auth session, skipping user data fetch');
    return null;
  }

  try {
    const currentPlatform = normalizePlatformValue(platform);
    const currentDateStart = new Date(`${generatedDate}T00:00:00.000Z`).toISOString();
    const cacheKeyPattern = `${context.cacheNiche}__${currentPlatform}__${context.normalizedCity}__*__${type}`;
    const { data, error } = await supabase
      .from('niche_content_cache')
      .select('cache_key, payload, generated_at')
      .eq('niche', context.cacheNiche)
      .eq('platform', currentPlatform)
      .eq('feature', type)
      .like('cache_key', cacheKeyPattern)
      .lt('generated_at', currentDateStart)
      .order('generated_at', { ascending: false })
      .limit(1);

    if (error || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const [previousCache] = data;
    console.log('[Cache HIT]', platform, type, previousCache.cache_key);
    return previousCache;
  } catch {
    return null;
  }
}

async function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.warn('Could not get auth session for dashboard cache:', error);
  }

  return headers;
}

function getPlatformWideTrendingPrompt(platform) {
  const platformKey = normalizePlatformValue(platform);
  const platformLabel = formatPlatformLabel(platform);
  const { month, year } = getCurrentMonthYear();
  const platformSpecificFocus = platformKey === 'tiktok'
    ? `- Viral sounds and audio trends
- Trending challenges and duet formats
- Popular content formats (#fyp, #foryou style)
- Trending hashtag categories
- POV, storytime, transformation formats that are peaking`
    : platformKey === 'instagram'
      ? `- Trending Reel formats and styles
- What content is getting the most saves and shares
- Trending audio on Reels
- Popular carousel formats
- Hashtag categories driving reach`
      : platformKey === 'facebook'
        ? `- Content formats getting the most shares
- Topics driving community discussion
- Video formats performing well
- What types of posts are reaching beyond followers`
        : platformKey === 'youtube'
          ? `- Video formats trending in the algorithm
- Thumbnail and title styles getting clicks
- Content lengths performing best
- Topics with growing search volume`
          : platformKey === 'linkedin'
            ? `- Post formats getting the most impressions
- Topics driving professional discussion
- Content styles outperforming on the feed`
            : `- Trending topics and hashtags
- Thread formats getting engagement
- Content styles being retweeted most`;

  return `You are a social media trend analyst with real-time knowledge of viral content.

What is trending RIGHT NOW on ${platformLabel} as of ${month} ${year}?

Return a JSON array of 5 trending topics or content formats that are getting the most reach and engagement on ${platformLabel} today — regardless of niche or industry.

Focus on:
${platformSpecificFocus}

Each item must have exactly these fields:
{
  "title": "Trend or format name (3-6 words)",
  "description": "Why this is blowing up right now (1-2 sentences)",
  "momentum": "rising" | "peaking" | "steady",
  "category": "education" | "entertainment" | "community" | "promotion"
}

Rules:
- Return ONLY the JSON array, no markdown, no other text
- These must be PLATFORM-WIDE trends, not niche-specific
- Base on actual current ${platformLabel} algorithm and viral patterns
- momentum must be exactly: rising, peaking, or steady

Return the JSON array now:`;
}

function buildNicheSpecificTrendingMessages(context, platform) {
  const platformLabel = formatPlatformLabel(platform);
  const creatorTypeLabel = context.brandProfile?.creatorType || context.brandProfile?.profileType || 'content creator';
  const targetAudience = context.targetAudience;
  const city = context.city;

  const trendingPrompt = `You are a real-time social media trend researcher. Find trending topics specifically relevant to a ${creatorTypeLabel} in the "${context.niche}" niche posting on ${platformLabel}.
${targetAudience ? `\nTarget audience: ${targetAudience}` : ''}${city ? `\nLocation: ${city} (include local or regional trends when relevant)` : ''}

Return ONLY trends that someone in this niche would actually post about. Do NOT return generic trending topics like celebrity gossip or political news unless they directly relate to the niche.

Return a JSON array of 5 trending content topics. Each item must have exactly these fields:
{
  "title": "Short topic name (3-6 words)",
  "description": "Why this is trending right now and why it matters for this niche (1-2 sentences)",
  "momentum": "rising" | "peaking" | "steady",
  "category": "education" | "promotion" | "entertainment" | "community"
}

Rules:
- Return ONLY the JSON array, no other text, no markdown fences
- All 5 items must be directly relevant to the ${context.niche} niche
- Base topics on current real social media trends, not generic advice
- momentum must be exactly one of: rising, peaking, steady
- category must be exactly one of: education, promotion, entertainment, community

Example of correct format:
[
  {
    "title": "Before and after results",
    "description": "Transformation content is resonating strongly in this space as audiences seek proof of real outcomes.",
    "momentum": "rising",
    "category": "promotion"
  }
]

Return the JSON array now:`;

  return [
    {
      role: 'system',
      content: `You are a real-time social media trend analyst specialized in the ${context.niche} niche. You surface only trends directly relevant to this creator's specific audience and content focus — never generic viral topics.`,
    },
    {
      role: 'user',
      content: trendingPrompt,
    },
  ];
}

function buildPlatformWideTrendingMessages(platform) {
  return [
    {
      role: 'system',
      content: 'You are a social media trend analyst with real-time knowledge of viral content.',
    },
    {
      role: 'user',
      content: getPlatformWideTrendingPrompt(platform),
    },
  ];
}

function buildTrendingMessages(context, platform) {
  return context.trendingMode === 'platform_wide'
    ? buildPlatformWideTrendingMessages(platform)
    : buildNicheSpecificTrendingMessages(context, platform);
}

function buildNicheSpecificHashtagPromptByPlatform(context, platform) {
  const platformLabel = formatPlatformLabel(platform);

  return `You are a social media hashtag researcher. Generate hashtags for a content creator in the "${context.niche}" niche posting on ${platformLabel}.
${context.city ? `Location: ${context.city}` : ''}

Return EXACTLY 10 hashtags as a JSON array. Each hashtag object must contain:
{
  "tag": "#hashtag",
  "volume": "HIGH" | "MEDIUM" | "NICHE",
  "engagement": number between 1-100,
  "category": "niche" | "growth"
}

IMPORTANT: Return EXACTLY 5 niche hashtags and 5 growth hashtags.

Niche hashtags (5, category: "niche"): Must be directly relevant to the ${context.niche} niche. These are hashtags that people in this specific niche search for and follow.${context.city ? ` You may include 1-2 location-specific niche tags for ${context.city}.` : ''}

Growth hashtags (5, category: "growth"): Must be broadly popular hashtags that any creator uses to reach new audiences. These work across niches — e.g., #ContentCreator, #SmallBusiness, #Trending, #Viral.

Volume rules:
- HIGH: millions of posts (broad reach)
- MEDIUM: 100k–1M posts
- NICHE: under 100k posts (targeted)

Rules:
- Return ONLY the JSON array, no markdown, no other text
- Only include real, actively-used hashtags you can verify exist
- Niche tags should feel specific and relevant — not generic

Return the JSON array now:`;
}

function buildPlatformWideHashtagPromptByPlatform(platform) {
  const platformKey = normalizePlatformValue(platform);
  const platformLabel = formatPlatformLabel(platform);
  const { month, year } = getCurrentMonthYear();
  const platformSpecificGuidance = platformKey === 'tiktok'
    ? `Include a mix of:
- Discovery tags: #fyp, #foryou, #foryoupage, #viral, #trending
- Format tags: #storytime, #pov, #transformation, #duet
- Growth tags currently performing well on TikTok`
    : platformKey === 'instagram'
      ? `Include a mix of:
- Reach tags: #reels, #explore, #viral, #trending
- Discovery tags currently boosted by Instagram algorithm
- Community tags with high engagement rates`
      : platformKey === 'facebook'
        ? 'Include tags that increase post distribution and shareability'
        : platformKey === 'youtube'
          ? 'Include search keywords and tags that boost video discovery'
          : platformKey === 'linkedin'
            ? 'Include tags that boost impressions on the LinkedIn feed'
            : 'Include discovery hashtags and formats that amplify reach on X right now';

  return `You are a social media hashtag analyst with real-time knowledge of viral content.

Return a JSON array of 10 hashtags that are getting the most reach on ${platformLabel} right now in ${month} ${year}.

These should be the hashtags a creator would use to reach the MAXIMUM number of people — not niche-specific tags.

${platformSpecificGuidance}

Each item must have exactly these fields:
{
  "tag": "#hashtag",
  "volume": "HIGH" | "MEDIUM" | "NICHE",
  "engagement": number between 1-100
}

Volume distribution:
- 4-5 items: HIGH (massive reach tags like #fyp, #viral)
- 3-4 items: MEDIUM (strong reach, less saturated)
- 1-2 items: NICHE (targeted but growing fast)

Rules:
- Return ONLY the JSON array, no markdown
- These are PLATFORM-WIDE reach tags, not niche tags
- Include the platform's most powerful discovery hashtags

Return the JSON array now:`;
}

function buildHashtagMessages(context, platform) {
  return [
    {
      role: 'system',
      content: 'You are a real-time hashtag and keyword researcher for social media. You have live web access. Only return hashtags or keywords you can verify are real and actively used right now. Never invent hashtags.',
    },
    {
      role: 'user',
      content: `${context.trendingMode === 'platform_wide'
        ? buildPlatformWideHashtagPromptByPlatform(platform)
        : buildNicheSpecificHashtagPromptByPlatform(context, platform)}

Exclude any tag you cannot verify exists with real active volume.`,
    },
  ];
}

async function requestPerplexityWidgetData(type, platform, context, headers, options, cacheKey, messages) {
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await retryFetch(
        PERPLEXITY_PROXY_URL,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'sonar',
            temperature: 0.2,
            messages,
            cache: {
              key: cacheKey,
              niche: context.cacheNiche,
              platform: normalizePlatformValue(platform),
              city: context.city || DEFAULT_CITY,
              type,
              ttlHours: 24,
              forceRefresh: (type === 'hashtags' || type === 'trending_hashtags_widget')
                ? Boolean(options.forceRefreshHashtags)
                : Boolean(options.forceRefreshTrending),
            },
          }),
        },
        {
          timeoutMs: API_TIMEOUTS.STANDARD,
          maxRetries: 0,
        }
      );

      if (response.ok) {
        return response;
      }

      if (response.status === 429) {
        if (attempt === MAX_RETRIES) {
          console.warn('[Perplexity] Max retries reached for', platform, type, '- giving up');
          return null;
        }

        const delayMs = attempt === 0 ? 2000 : 4000;
        console.warn(`[Perplexity] Rate limited, retrying in ${delayMs / 1000}s...`, platform);
        await sleep(delayMs);
        continue;
      }

      console.warn('[Perplexity] Non-429 response, using fallback:', response.status, platform, type);
      return null;
    } catch (error) {
      console.warn('[Perplexity] Request failed, using fallback:', error, platform, type);
      return null;
    }
  }

  return null;
}

function normalizeTrendingMomentum(momentum) {
  const value = normalizeTextValue(momentum).toLowerCase();
  return MOMENTUM_VALUES.has(value) ? value : 'rising';
}

function mapHashtagVolume(volume) {
  const value = normalizeTextValue(volume).toLowerCase();
  if (REACH_VALUES.has(value)) return value;
  return 'medium';
}

function buildHashtagFallbackItems(platform) {
  const platformLabel = formatPlatformLabel(platform);

  return HASHTAG_FALLBACK.map((item) => ({
    ...item,
    platform: platformLabel,
  }));
}

function normalizeTrendItem(item, platform, fromCache = false, generatedAt = null) {
  const title = normalizeTextValue(item?.title || item?.topic);
  const summary = normalizeTextValue(item?.summary || item?.description);
  const whyItMatters = normalizeTextValue(item?.why_it_matters || item?.context || item?.description);
  const contentIdea = normalizeTextValue(item?.content_idea);

  if (!title || !summary || !whyItMatters) {
    return null;
  }

  return {
    topic: title,
    context: whyItMatters,
    description: summary,
    momentum: normalizeTrendingMomentum(item?.momentum),
    relevant_platform: formatPlatformLabel(item?.platform || platform),
    content_angles: contentIdea ? [contentIdea] : [],
    from_cache: fromCache,
    from_yesterday: false,
    generated_at: generatedAt,
  };
}

function normalizeHashtagItem(item, platform, fromCache = false, generatedAt = null, fromYesterday = false) {
  const isStringItem = typeof item === 'string';
  const rawType = normalizeTextValue(
    isStringItem
      ? ''
      : (item?.type || item?.result_type || item?.kind)
  ).toLowerCase();
  const isSearchKeyword = rawType === 'search_keyword' || normalizePlatformValue(platform) === 'youtube';
  const rawTag = normalizeTextValue(
    isStringItem
      ? item
      : (
        item?.tag
        || item?.hashtag
        || item?.keyword
        || item?.term
        || item?.name
        || item?.label
      )
  );

  if (!rawTag) {
    return null;
  }

  const tagValue = isSearchKeyword
    ? rawTag.replace(/^#/, '')
    : (rawTag.startsWith('#') ? rawTag : `#${rawTag.replace(/^#*/, '')}`);
  const status = normalizeTextValue(
    isStringItem
      ? ''
      : (item?.status || item?.display_type_label || item?.type_label)
  ) || 'Niche';
  const platformLabel = formatPlatformLabel((isStringItem ? '' : item?.platform) || platform);

  const rawCategory = isStringItem ? '' : normalizeTextValue(item?.category).toLowerCase();
  const hashtagCategory = rawCategory === 'niche' || rawCategory === 'growth' ? rawCategory : null;

  const descriptionText = !isStringItem && item?.description
    ? normalizeTextValue(item.description)
    : '';

  return {
    hashtag: tagValue,
    relevance: descriptionText
      || `${platformLabel} discovery term for ${platform === 'youtube' ? 'searchers' : 'active content discovery'}`,
    estimated_reach: mapHashtagVolume(
      isStringItem
        ? ''
        : (item?.volume || item?.estimated_reach || item?.reach)
    ),
    type: status.toLowerCase() === 'trending' ? 'trending' : 'niche',
    category: hashtagCategory,
    relevant_platforms: [platformLabel],
    platform: platformLabel,
    result_type: isSearchKeyword ? 'search_keyword' : 'hashtag',
    display_type_label: isSearchKeyword ? 'Search Keyword' : status,
    status,
    from_cache: fromCache,
    from_yesterday: fromYesterday,
    generated_at: generatedAt,
  };
}

function normalizeInsights(rawInsights) {
  return ensureArray(rawInsights)
    .map((item) => ({
      headline: normalizeTextValue(item?.headline),
      detail: normalizeTextValue(item?.detail),
      category: normalizeTextValue(item?.category),
    }))
    .filter((item) => item.headline && item.detail)
    .map((item) => ({
      ...item,
      category: INSIGHT_CATEGORIES.has(item.category) ? item.category : 'Strategy',
    }))
    .slice(0, 3);
}

function buildFallbackAIInsights(context) {
  const platformLabels = context.selectedPlatforms.map(formatPlatformLabel);
  const primaryPlatform = platformLabels[0] || 'Instagram';

  return [
    {
      headline: `Test your ${primaryPlatform} timing`,
      detail: `Research from Sprout Social and Buffer shows mid-week posting windows often perform well. Use that as a starting point, then refine with your own account Insights.`,
      category: 'Timing',
    },
    {
      headline: 'Match format to platform',
      detail: `${platformLabels.join(', ')} reward different habits and content rhythms. Treat this week as a test window and compare what earns the strongest watch time, saves, or replies.`,
      category: 'Platform',
    },
    {
      headline: `Teach one ${context.niche} takeaway`,
      detail: `Lead with a practical audience pain point, keep the format native to the platform, and review which version gets the strongest quality engagement before doubling down.`,
      category: 'Content Type',
    },
  ];
}

async function fetchPerPlatformWidgetData(type, platform, context, headers, options = {}) {
  const generatedDate = getUtcDateString(); // HUTTLE AI: cache fix
  const cacheKey = buildPerPlatformCacheKey(context, platform, type, generatedDate);
  const forceRefresh = type === 'hashtags' ? Boolean(options.forceRefreshHashtags) : Boolean(options.forceRefreshTrending);
  const messages = type === 'trending'
    ? buildTrendingMessages(context, platform)
    : buildHashtagMessages(context, platform);

  try {
    if (!forceRefresh) {
      const cachedResult = await getWarmPlatformCache(cacheKey, platform, type);
      if (cachedResult) {
        const cachedItems = type === 'trending'
          ? parseTrendingResponse(cachedResult)
          : ensureArray(cachedResult);
        return {
          items: Array.isArray(cachedItems) ? cachedItems : [],
          fromCache: true,
          fromYesterday: false,
          generatedAt: new Date().toISOString(),
          fallbackMessage: '',
        };
      }
    }

    console.log('[Cache MISS] Calling Perplexity for', platform, type);
    const response = await requestPerplexityWidgetData(type, platform, context, headers, options, cacheKey, messages);

    if (!response) {
      throw new Error(`Perplexity ${type} request failed.`);
    }

    if (!response.ok) {
      throw new Error(`Perplexity ${type} request failed.`);
    }

    const payload = await response.json();
    const parsed = type === 'trending'
      ? (() => {
          const perplexityResponse = payload?.structuredData ?? payload?.content ?? null;
          const rawResponse = JSON.stringify(perplexityResponse ?? null);
          console.log('[Trending RAW response]', rawResponse.substring(0, 500));
          const parsedResult = parseTrendingResponse(perplexityResponse);
          const trendingData = parsedResult?.length > 0
            ? parsedResult
            : TRENDING_FALLBACK;
          return trendingData;
        })()
      : Array.isArray(payload?.structuredData)
        ? payload.structuredData
        : payload?.structuredData
          ? (console.warn('[Perplexity] Response is not an array, using parser fallback:', typeof payload.structuredData), null)
          : parsePerplexityResponse(payload?.content || '');

    if (!Array.isArray(parsed)) {
      throw new Error(`Perplexity ${type} response was not a valid JSON array.`);
    }

    const items = type === 'hashtags' && parsed.length === 0
      ? buildHashtagFallbackItems(platform)
      : parsed;

    return {
      items,
      fromCache: Boolean(payload?.cached),
      fromYesterday: false,
      generatedAt: payload?.generatedAt || new Date().toISOString(),
      fallbackMessage: '',
    };
  } catch (error) {
    console.warn(`[Dashboard] Failed to load ${type} for ${platform}, using fallback:`, error);

    if (type === 'hashtags') {
      const previousDayCache = await getPreviousDayPlatformCache(context, platform, type, generatedDate);
      if (previousDayCache) {
        return {
          items: ensureArray(previousDayCache.payload),
          fromCache: false,
          fromYesterday: true,
          generatedAt: previousDayCache.generated_at || null,
          fallbackMessage: 'From yesterday — updating now',
        };
      }
    }

    return {
      items: type === 'hashtags' ? buildHashtagFallbackItems(platform) : [],
      fromCache: false,
      fromYesterday: false,
      generatedAt: null,
      fallbackMessage: type === 'trending'
        ? 'Trends are refreshing — check back in a few minutes.'
        : 'Hashtags loading — refresh in a moment.',
    };
  }
}

async function fetchAllPlatformWidgets(platforms, context, headers, options = {}) {
  const results = [];

  console.log('[Dashboard] Starting sequential fetch for:', platforms);

  for (const [index, platform] of platforms.entries()) {

    try {
      const trendingResult = await fetchPerPlatformWidgetData('trending', platform, context, headers, options);
      const hashtagResult = await fetchPerPlatformWidgetData('hashtags', platform, context, headers, options);

      results.push({
        platform,
        trendingResult,
        hashtagResult,
      });
    } catch (error) {
      console.warn(`[Dashboard] Failed to load ${platform}, using fallback widgets:`, error);
      results.push({
        platform,
        trendingResult: {
          items: [],
          fromCache: false,
          fromYesterday: false,
          generatedAt: null,
          fallbackMessage: 'Trends are refreshing — check back in a few minutes.',
        },
        hashtagResult: {
          items: [],
          fromCache: false,
          fromYesterday: false,
          generatedAt: null,
          fallbackMessage: 'Hashtags loading — refresh in a moment.',
        },
      });
    }

    if (index < platforms.length - 1) {
      await sleep(800);
    }
  }

  return results;
}

function buildAIInsightsMessages(context) {
  const platformLabels = context.selectedPlatforms.map(formatPlatformLabel);
  const brandBlock = buildCreatorBrandBlock(context.brandProfile, context.brandProfile); // HUTTLE AI: brand context injected
  const instagramInstruction = context.selectedPlatforms.includes('instagram')
    ? '- If Instagram is selected, discuss Reels versus carousels as a reach/engagement tradeoff without inventing performance multipliers.'
    : '';
  const tiktokInstruction = context.selectedPlatforms.includes('tiktok')
    ? '- If TikTok is selected, focus on hook speed, retention, repeatable short-form series, and testing volume.'
    : '';
  const linkedinInstruction = context.selectedPlatforms.includes('linkedin')
    ? '- If LinkedIn is selected, focus on professional cadence, point-of-view expertise, and conversation quality.'
    : '';

  return [
    {
      role: 'system',
      content: `${brandBlock}You are a cautious social media strategist. You provide platform-aware recommendations, never fabricated statistics, and you frame all recommendations as benchmarks to test rather than guaranteed outcomes. Return valid JSON only.`, // HUTTLE AI: brand context injected
    },
    {
      role: 'user',
      content: `Create 3 AI insight cards for this dashboard user.

Niche: ${context.niche}
Selected platforms: ${platformLabels.join(', ')}
${context.city ? `City: ${context.city}\n` : ''}${context.targetAudience ? `Target audience: ${context.targetAudience}\n` : ''}Return ONLY a valid JSON array:
[
  {
    "headline": "string",
    "detail": "string",
    "category": "Timing" | "Platform" | "Content Type" | "Audience" | "Strategy"
  }
]

Rules:
- Exactly 3 cards.
- Advice must only reference these selected platforms: ${platformLabels.join(', ')}.
- Never mention a platform that is not in the selected list.
- Never invent percentages, lifts, conversion rates, or engagement multipliers.
- Replace invented stats with benchmark language like: "Research from Sprout Social and Buffer shows mid-week posts (Tue-Thu) tend to see stronger engagement - use your own account Insights to find your personal peak times."
- Every recommendation must be framed as a starting point to test, not a guarantee.
- One card must be category "Timing".
- One card must be category "Platform".
- The third card should be "Content Type", "Audience", or "Strategy" based on what is most useful for this niche.
${instagramInstruction}
${tiktokInstruction}
${linkedinInstruction}
- If the user only selected TikTok, do not mention Instagram tactics.
- If the user only selected LinkedIn, do not mention creator-first consumer tactics.`,
    },
  ];
}

async function generateAIInsights(context, headers) { // HUTTLE AI: cache fix
  const fallbackInsights = buildFallbackAIInsights(context); // HUTTLE AI: cache fix

  try { // HUTTLE AI: cache fix
    const response = await retryFetch( // HUTTLE AI: cache fix
      GROK_PROXY_URL, // HUTTLE AI: cache fix
      { // HUTTLE AI: cache fix
        method: 'POST', // HUTTLE AI: cache fix
        headers, // HUTTLE AI: cache fix
        body: JSON.stringify({ // HUTTLE AI: cache fix
          model: 'grok-4-1-fast-reasoning', // HUTTLE AI: cache fix
          temperature: 0.2, // HUTTLE AI: cache fix
          messages: buildAIInsightsMessages(context), // HUTTLE AI: cache fix
        }), // HUTTLE AI: cache fix
      }, // HUTTLE AI: cache fix
      { // HUTTLE AI: cache fix
        timeoutMs: API_TIMEOUTS.STANDARD, // HUTTLE AI: cache fix
      } // HUTTLE AI: cache fix
    ); // HUTTLE AI: cache fix

    if (!response.ok) { // HUTTLE AI: cache fix
      throw new Error('Grok insights request failed.'); // HUTTLE AI: cache fix
    } // HUTTLE AI: cache fix

    const payload = await response.json(); // HUTTLE AI: cache fix
    const parsed = parseStructuredJson(payload?.content || ''); // HUTTLE AI: cache fix
    const normalizedInsights = normalizeInsights(parsed); // HUTTLE AI: cache fix
    const insights = normalizedInsights.length > 0 ? normalizedInsights : fallbackInsights; // HUTTLE AI: cache fix

    return { // HUTTLE AI: cache fix
      insights, // HUTTLE AI: cache fix
      createdAt: new Date().toISOString(), // HUTTLE AI: cache fix
      fromCache: false, // HUTTLE AI: cache fix
      usedFallback: normalizedInsights.length === 0, // HUTTLE AI: cache fix
    }; // HUTTLE AI: cache fix
  } catch (error) { // HUTTLE AI: cache fix
    console.warn('Error generating AI insights, using fallback insights:', error); // HUTTLE AI: cache fix
    return { // HUTTLE AI: cache fix
      insights: fallbackInsights, // HUTTLE AI: cache fix
      createdAt: new Date().toISOString(), // HUTTLE AI: cache fix
      fromCache: false, // HUTTLE AI: cache fix
      usedFallback: true, // HUTTLE AI: cache fix
    }; // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix

const FOR_YOU_HASHTAG_CAP = 10;
const TRENDING_WIDGET_HASHTAG_CAP = 10;

function buildDashboardTrendingHashtagUserPrompt(platform) {
  const platformLabel = formatPlatformLabel(normalizePlatformValue(platform));
  return `You are a social media hashtag researcher. Return the top 8 universally popular hashtags that any content creator uses on ${platformLabel} to maximize reach and discoverability. These must be generic growth hashtags — NOT specific to any niche or industry.

Focus on: broad trending hashtags, platform-specific discovery hashtags (like #fyp for TikTok, #explorepage for Instagram), general small business and creator growth hashtags.

Platform: ${platformLabel}

Return as a JSON array of objects:
[{ "hashtag": "#fyp", "volume": "high", "description": "TikTok's main discovery feed hashtag" }]

Respond with ONLY the JSON array, no other text.`;
}

function formatCreatorTypeLabel(creatorType, profileType) {
  const t = normalizeTextValue(creatorType).toLowerCase();
  if (t) {
    if (t === 'creator') return 'content creator';
    return t.replace(/_/g, ' ');
  }
  if (normalizeTextValue(profileType).toLowerCase() === 'creator') return 'content creator';
  return 'business or creator';
}

function buildDashboardForYouHashtagUserPrompt(personalization, platform) {
  const platformLabel = formatPlatformLabel(normalizePlatformValue(platform));
  const niche = normalizeTextValue(personalization?.niche) || 'your niche';
  const creatorType = formatCreatorTypeLabel(personalization?.creatorType, personalization?.profileType);
  const subNiche = normalizeTextValue(personalization?.subNiche);
  const city = normalizeTextValue(personalization?.city);
  const industry = normalizeTextValue(personalization?.industry);

  return `You are a social media hashtag researcher. Return 8 hashtags specifically relevant to a ${creatorType} in the "${niche}" niche on ${platformLabel}.
${subNiche ? `Sub-niche: ${subNiche}` : ''}
${city ? `Location: ${city}` : ''}
${industry ? `Industry: ${industry}` : ''}

These must be hashtags that someone in this SPECIFIC niche would use — not generic growth hashtags. Include a mix of:
- Industry-specific hashtags (3-4)
- Treatment/service/topic-specific hashtags (2-3)
${city ? '- Local/city-specific hashtags (1-2) combining the city with the niche' : ''}

Return as a JSON array of objects:
[{ "hashtag": "#medspa", "volume": "high", "description": "Primary industry hashtag for medical spas" }]

Respond with ONLY the JSON array, no other text.`;
}

/**
 * Generic platform-wide hashtags for the dashboard "Trending" tab (separate cache from niche For You).
 * @returns {Promise<{ items: object[], fromCache: boolean }>}
 */
export async function fetchDashboardTrendingHashtags({
  primaryPlatform,
  userId,
  generatedDate,
  forceRefresh = false,
}) {
  if (!userId) {
    return { items: [], fromCache: false };
  }

  const headers = await getAuthHeaders();
  const platform = normalizePlatformValue(primaryPlatform || 'instagram');
  const cacheKey = buildCacheKey('platform_wide', platform, 'global', generatedDate, 'trending_hashtags_widget');
  const cacheContext = {
    cacheNiche: 'platform_wide',
    normalizedCity: 'global',
    city: null,
  };

  const messages = [
    {
      role: 'system',
      content: 'You are a social media hashtag researcher. Follow instructions exactly. Return only a JSON array, no markdown.',
    },
    {
      role: 'user',
      content: buildDashboardTrendingHashtagUserPrompt(platform),
    },
  ];

  try {
    if (!forceRefresh) {
      const cachedPayload = await getWarmPlatformCache(cacheKey, platform, 'trending_hashtags_widget');
      if (cachedPayload) {
        const arr = Array.isArray(cachedPayload) ? cachedPayload : ensureArray(cachedPayload);
        const generatedAt = new Date().toISOString();
        const items = arr
          .map((item) => normalizeHashtagItem(
            { ...item, category: 'growth' },
            platform,
            true,
            generatedAt,
            false
          ))
          .filter(Boolean)
          .slice(0, TRENDING_WIDGET_HASHTAG_CAP);
        if (items.length > 0) {
          return { items, fromCache: true };
        }
      }
    }

    const response = await requestPerplexityWidgetData(
      'trending_hashtags_widget',
      platform,
      cacheContext,
      headers,
      { forceRefreshHashtags: forceRefresh },
      cacheKey,
      messages,
    );

    if (!response || !response.ok) {
      throw new Error('Trending hashtags request failed');
    }

    const payload = await response.json();
    const parsed = Array.isArray(payload?.structuredData)
      ? payload.structuredData
      : parsePerplexityResponse(payload?.content || '');

    const arr = Array.isArray(parsed) ? parsed : [];
    const generatedAt = payload?.generatedAt || new Date().toISOString();

    const items = arr
      .map((item) => normalizeHashtagItem(
        { ...item, category: 'growth' },
        platform,
        Boolean(payload?.cached),
        generatedAt,
        false
      ))
      .filter(Boolean)
      .slice(0, TRENDING_WIDGET_HASHTAG_CAP);

    return {
      items,
      fromCache: Boolean(payload?.cached),
    };
  } catch (error) {
    console.warn('[Dashboard] Trending widget hashtags failed:', error?.message || error);
    const fallback = buildHashtagFallbackItems(platform)
      .map((raw) => normalizeHashtagItem({ ...raw, category: 'growth' }, platform, false, new Date().toISOString(), false))
      .filter(Boolean)
      .slice(0, TRENDING_WIDGET_HASHTAG_CAP);
    return { items: fallback, fromCache: false };
  }
}

/**
 * Personalized "For you" hashtags via Grok (server-cached in niche_content_cache, user-scoped).
 * @returns {Promise<{ items: object[], fromCache: boolean }>}
 */
export async function fetchDashboardForYouHashtags({
  personalization,
  primaryPlatform,
  userId,
  generatedDate,
  forceRefresh = false,
}) {
  if (!userId || !personalization?.niche) {
    return { items: [], fromCache: false };
  }

  const headers = await getAuthHeaders();
  const platform = normalizePlatformValue(primaryPlatform || 'instagram');
  const nicheKey = normalizeNiche(personalization.niche) || 'general';
  const cacheKey = `dashboard_for_you__${userId}__${generatedDate}__${nicheKey}__${platform}__foryou_v2`;

  try {
    const response = await retryFetch(
      GROK_PROXY_URL,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'grok-4.1-fast-reasoning',
          temperature: 0.35,
          personalized: true,
          forceCacheRefresh: Boolean(forceRefresh),
          messages: [
            {
              role: 'system',
              content: 'You are a social media hashtag strategist. Follow the user instructions exactly. Return only a JSON array, no markdown or commentary.',
            },
            {
              role: 'user',
              content: buildDashboardForYouHashtagUserPrompt(personalization, platform),
            },
          ],
          cache: {
            key: cacheKey,
            niche: nicheKey,
            platform,
            type: 'dashboard_hashtags_for_you',
            ttlHours: 24,
          },
        }),
      },
      {
        timeoutMs: API_TIMEOUTS.STANDARD,
      }
    );

    if (!response.ok) {
      throw new Error('For-you hashtags request failed');
    }

    const payload = await response.json();
    const parsed = parseStructuredJson(payload?.content || '');
    const arr = Array.isArray(parsed) ? parsed : [];
    const generatedAt = payload?.generatedAt || new Date().toISOString();

    const items = arr
      .map((item) => normalizeHashtagItem(
        {
          ...item,
          tag: item.tag || item.hashtag,
          category: 'niche',
        },
        platform,
        Boolean(payload?.cached),
        generatedAt,
        false
      ))
      .filter(Boolean)
      .slice(0, FOR_YOU_HASHTAG_CAP);

    return {
      items,
      fromCache: Boolean(payload?.cached),
    };
  } catch (error) {
    console.warn('[Dashboard] For-you hashtags failed:', error?.message || error);
    return { items: [], fromCache: false };
  }
}

function buildDashboardMetadata(context, overrides = {}) { // HUTTLE AI: cache fix
  return { // HUTTLE AI: cache fix
    selected_platforms: context.selectedPlatforms.map(formatPlatformLabel), // HUTTLE AI: cache fix
    trending_fallback_message: overrides.trendingFallbackMessage ?? 'Trends are refreshing — check back in a few minutes.', // HUTTLE AI: cache fix
    hashtags_fallback_message: overrides.hashtagsFallbackMessage ?? 'Hashtags loading — refresh in a moment.', // HUTTLE AI: cache fix
    hashtags_from_previous_day: overrides.hashtagsFromPreviousDay ?? false, // HUTTLE AI: cache fix
    trending_mode: context.trendingMode, // HUTTLE AI: cache fix
    primary_platform_label: context.primaryPlatformLabel, // HUTTLE AI: cache fix
    show_platform_wide_niche_nudge: context.showPlatformWideNicheNudge, // HUTTLE AI: cache fix
    show_brand_voice_nudge: context.showBrandVoiceNudge, // HUTTLE AI: cache fix
    brand_voice_nudge_copy: context.brandVoiceNudgeCopy, // HUTTLE AI: cache fix
  }; // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix

function buildDashboardDataPayload(context, payload = {}) { // HUTTLE AI: cache fix
  const metadata = buildDashboardMetadata(context, { // HUTTLE AI: cache fix
    trendingFallbackMessage: payload.trendingFallbackMessage, // HUTTLE AI: cache fix
    hashtagsFallbackMessage: payload.hashtagsFallbackMessage, // HUTTLE AI: cache fix
    hashtagsFromPreviousDay: payload.hashtagsFromPreviousDay, // HUTTLE AI: cache fix
  }); // HUTTLE AI: cache fix

  return { // HUTTLE AI: cache fix
    trending_topics: ensureArray(payload.trendingTopics), // HUTTLE AI: cache fix
    hashtags_of_day: ensureArray(payload.hashtagsOfDay), // HUTTLE AI: cache fix
    ai_insights: normalizeInsights(payload.aiInsights), // HUTTLE AI: cache fix
    ai_insight: normalizeInsights(payload.aiInsights)[0] || null, // HUTTLE AI: cache fix
    daily_alerts: ensureArray(payload.dailyAlerts), // HUTTLE AI: cache fix
    created_at: payload.createdAt || new Date().toISOString(), // HUTTLE AI: cache fix
    ...metadata, // HUTTLE AI: cache fix
  }; // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix

function normalizeDashboardCacheRow(row, context) { // HUTTLE AI: cache fix
  const metadata = row?.dashboard_metadata && typeof row.dashboard_metadata === 'object' ? row.dashboard_metadata : {}; // HUTTLE AI: cache fix
  const normalizedInsights = normalizeInsights(row?.ai_insights); // HUTTLE AI: cache fix
  const legacyInsights = normalizedInsights.length === 0 && row?.ai_insight ? normalizeInsights([row.ai_insight]) : []; // HUTTLE AI: cache fix
  const insights = normalizedInsights.length > 0 ? normalizedInsights : legacyInsights; // HUTTLE AI: cache fix

  return { // HUTTLE AI: cache fix
    trending_topics: ensureArray(row?.trending_topics), // HUTTLE AI: cache fix
    hashtags_of_day: ensureArray(row?.hashtags_of_day), // HUTTLE AI: cache fix
    ai_insights: insights, // HUTTLE AI: cache fix
    ai_insight: insights[0] || null, // HUTTLE AI: cache fix
    daily_alerts: ensureArray(row?.daily_alerts), // HUTTLE AI: cache fix
    created_at: row?.created_at || new Date().toISOString(), // HUTTLE AI: cache fix
    ...buildDashboardMetadata(context, { // HUTTLE AI: cache fix
      trendingFallbackMessage: metadata.trending_fallback_message, // HUTTLE AI: cache fix
      hashtagsFallbackMessage: metadata.hashtags_fallback_message, // HUTTLE AI: cache fix
      hashtagsFromPreviousDay: metadata.hashtags_from_previous_day, // HUTTLE AI: cache fix
    }), // HUTTLE AI: cache fix
    selected_platforms: Array.isArray(metadata.selected_platforms) ? metadata.selected_platforms : context.selectedPlatforms.map(formatPlatformLabel), // HUTTLE AI: cache fix
    trending_mode: metadata.trending_mode || context.trendingMode, // HUTTLE AI: cache fix
    primary_platform_label: metadata.primary_platform_label || context.primaryPlatformLabel, // HUTTLE AI: cache fix
    show_platform_wide_niche_nudge: typeof metadata.show_platform_wide_niche_nudge === 'boolean' ? metadata.show_platform_wide_niche_nudge : context.showPlatformWideNicheNudge, // HUTTLE AI: cache fix
    show_brand_voice_nudge: typeof metadata.show_brand_voice_nudge === 'boolean' ? metadata.show_brand_voice_nudge : context.showBrandVoiceNudge, // HUTTLE AI: cache fix
    brand_voice_nudge_copy: metadata.brand_voice_nudge_copy || context.brandVoiceNudgeCopy, // HUTTLE AI: cache fix
  }; // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix

function isMissingDashboardCacheColumnError(error) { // HUTTLE AI: cache fix
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase(); // HUTTLE AI: cache fix
  return error?.code === '42703' || error?.code === 'PGRST204' || message.includes('daily_alerts') || message.includes('dashboard_metadata'); // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix

async function fetchDailyAlerts() { // HUTTLE AI: cache fix
  try { // HUTTLE AI: cache fix
    const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // HUTTLE AI: cache fix
    const { data, error } = await supabase // HUTTLE AI: cache fix
      .from('social_updates') // HUTTLE AI: cache fix
      .select('id, platform, update_title, update_summary, impact_level, fetched_at') // HUTTLE AI: cache fix
      .gte('fetched_at', cutoffDate) // HUTTLE AI: cache fix
      .order('fetched_at', { ascending: false }) // HUTTLE AI: cache fix
      .limit(2); // HUTTLE AI: cache fix

    if (error) { // HUTTLE AI: cache fix
      console.warn('[Dashboard] Failed to load daily alerts:', error); // HUTTLE AI: cache fix
      return []; // HUTTLE AI: cache fix
    } // HUTTLE AI: cache fix

    return Array.isArray(data) ? data : []; // HUTTLE AI: cache fix
  } catch (error) { // HUTTLE AI: cache fix
    console.warn('[Dashboard] Failed to load daily alerts:', error); // HUTTLE AI: cache fix
    return []; // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix

async function readDailyDashboardCache(userId, generatedDate) { // HUTTLE AI: cache fix
  const { data, error } = await supabase // HUTTLE AI: cache fix
    .from(DASHBOARD_CACHE_TABLE) // HUTTLE AI: cache fix
    .select('generated_date, trending_topics, hashtags_of_day, ai_insight, ai_insights, daily_alerts, dashboard_metadata, created_at') // HUTTLE AI: cache fix
    .eq('user_id', userId) // HUTTLE AI: cache fix
    .eq('generated_date', generatedDate) // HUTTLE AI: cache fix
    .maybeSingle(); // HUTTLE AI: cache fix

  if (error && isMissingDashboardCacheColumnError(error)) { // HUTTLE AI: cache fix
    const fallbackResult = await supabase // HUTTLE AI: cache fix
      .from(DASHBOARD_CACHE_TABLE) // HUTTLE AI: cache fix
      .select('generated_date, trending_topics, hashtags_of_day, ai_insight, ai_insights, created_at') // HUTTLE AI: cache fix
      .eq('user_id', userId) // HUTTLE AI: cache fix
      .eq('generated_date', generatedDate) // HUTTLE AI: cache fix
      .maybeSingle(); // HUTTLE AI: cache fix

    if (fallbackResult.error) { // HUTTLE AI: cache fix
      console.warn('[Dashboard] Failed to read daily dashboard cache:', fallbackResult.error); // HUTTLE AI: cache fix
      return null; // HUTTLE AI: cache fix
    } // HUTTLE AI: cache fix

    return fallbackResult.data || null; // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix

  if (error) { // HUTTLE AI: cache fix
    console.warn('[Dashboard] Failed to read daily dashboard cache:', error); // HUTTLE AI: cache fix
    return null; // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix

  return data || null; // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix

async function writeDailyDashboardCache(userId, generatedDate, dashboardData) { // HUTTLE AI: cache fix
  const dashboardMetadata = { // HUTTLE AI: cache fix
    selected_platforms: dashboardData.selected_platforms, // HUTTLE AI: cache fix
    trending_fallback_message: dashboardData.trending_fallback_message, // HUTTLE AI: cache fix
    hashtags_fallback_message: dashboardData.hashtags_fallback_message, // HUTTLE AI: cache fix
    hashtags_from_previous_day: dashboardData.hashtags_from_previous_day, // HUTTLE AI: cache fix
    trending_mode: dashboardData.trending_mode, // HUTTLE AI: cache fix
    primary_platform_label: dashboardData.primary_platform_label, // HUTTLE AI: cache fix
    show_platform_wide_niche_nudge: dashboardData.show_platform_wide_niche_nudge, // HUTTLE AI: cache fix
    show_brand_voice_nudge: dashboardData.show_brand_voice_nudge, // HUTTLE AI: cache fix
    brand_voice_nudge_copy: dashboardData.brand_voice_nudge_copy, // HUTTLE AI: cache fix
  }; // HUTTLE AI: cache fix

  try { // HUTTLE AI: cache fix
    const { error } = await supabase // HUTTLE AI: cache fix
      .from(DASHBOARD_CACHE_TABLE) // HUTTLE AI: cache fix
      .upsert({ // HUTTLE AI: cache fix
        user_id: userId, // HUTTLE AI: cache fix
        generated_date: generatedDate, // HUTTLE AI: cache fix
        trending_topics: dashboardData.trending_topics, // HUTTLE AI: cache fix
        hashtags_of_day: dashboardData.hashtags_of_day, // HUTTLE AI: cache fix
        ai_insights: dashboardData.ai_insights, // HUTTLE AI: cache fix
        ai_insight: dashboardData.ai_insight, // HUTTLE AI: cache fix
        daily_alerts: dashboardData.daily_alerts, // HUTTLE AI: cache fix
        dashboard_metadata: dashboardMetadata, // HUTTLE AI: cache fix
        created_at: dashboardData.created_at, // HUTTLE AI: cache fix
      }, { // HUTTLE AI: cache fix
        onConflict: 'user_id,generated_date', // HUTTLE AI: cache fix
      }); // HUTTLE AI: cache fix

    if (error && isMissingDashboardCacheColumnError(error)) { // HUTTLE AI: cache fix
      const fallbackResult = await supabase // HUTTLE AI: cache fix
        .from(DASHBOARD_CACHE_TABLE) // HUTTLE AI: cache fix
        .upsert({ // HUTTLE AI: cache fix
          user_id: userId, // HUTTLE AI: cache fix
          generated_date: generatedDate, // HUTTLE AI: cache fix
          trending_topics: dashboardData.trending_topics, // HUTTLE AI: cache fix
          hashtags_of_day: dashboardData.hashtags_of_day, // HUTTLE AI: cache fix
          ai_insights: dashboardData.ai_insights, // HUTTLE AI: cache fix
          ai_insight: dashboardData.ai_insight, // HUTTLE AI: cache fix
          created_at: dashboardData.created_at, // HUTTLE AI: cache fix
        }, { // HUTTLE AI: cache fix
          onConflict: 'user_id,generated_date', // HUTTLE AI: cache fix
        }); // HUTTLE AI: cache fix

      if (fallbackResult.error) { // HUTTLE AI: cache fix
        console.warn('[Dashboard] Failed to write daily dashboard cache:', fallbackResult.error); // HUTTLE AI: cache fix
        return false; // HUTTLE AI: cache fix
      } // HUTTLE AI: cache fix

      return true; // HUTTLE AI: cache fix
    } // HUTTLE AI: cache fix

    if (error) { // HUTTLE AI: cache fix
      console.warn('[Dashboard] Failed to write daily dashboard cache:', error); // HUTTLE AI: cache fix
      return false; // HUTTLE AI: cache fix
    } // HUTTLE AI: cache fix

    return true; // HUTTLE AI: cache fix
  } catch (error) { // HUTTLE AI: cache fix
    console.warn('[Dashboard] Failed to write daily dashboard cache:', error); // HUTTLE AI: cache fix
    return false; // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix

export function getDashboardGeneratedDate(date = new Date()) { // HUTTLE AI: cache fix
  return getUtcDateString(date); // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix

export async function getDashboardCache(userId, brandProfile, options = {}) { // HUTTLE AI: cache fix
  if (!userId) { // HUTTLE AI: cache fix
    return { success: false, cacheHit: false, errorType: 'auth_error', errorMessage: 'User is not authenticated.' }; // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix

  const session = await getDashboardSession(); // HUTTLE AI: cache fix
  if (!session) { // HUTTLE AI: cache fix
    console.warn('[Dashboard] No auth session, skipping user data fetch'); // HUTTLE AI: cache fix
    return { // HUTTLE AI: cache fix
      success: false, // HUTTLE AI: cache fix
      cacheHit: false, // HUTTLE AI: cache fix
      errorType: 'auth_error', // HUTTLE AI: cache fix
      errorMessage: 'No active auth session.', // HUTTLE AI: cache fix
    }; // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix

  const generatedDate = options.generatedDate || getUtcDateString(); // HUTTLE AI: cache fix
  const context = buildDashboardBrandContext(brandProfile); // HUTTLE AI: cache fix
  const cachedRow = await readDailyDashboardCache(userId, generatedDate); // HUTTLE AI: cache fix

  if (!cachedRow) { // HUTTLE AI: cache fix
    return { success: true, cacheHit: false, generatedDate, data: null }; // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix

  return { // HUTTLE AI: cache fix
    success: true, // HUTTLE AI: cache fix
    cacheHit: true, // HUTTLE AI: cache fix
    generatedDate, // HUTTLE AI: cache fix
    data: normalizeDashboardCacheRow(cachedRow, context), // HUTTLE AI: cache fix
  }; // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix

export async function generateDashboardData(userId, brandProfile, options = {}) { // HUTTLE AI: cache fix
  if (!userId) { // HUTTLE AI: cache fix
    return { success: false, errorType: 'auth_error', errorMessage: 'User is not authenticated.' }; // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix

  const forceRefresh = Boolean(options.forceRefresh); // HUTTLE AI: cache fix
  const normalizedOptions = { // HUTTLE AI: cache fix
    ...options, // HUTTLE AI: cache fix
    forceRefreshTrending: forceRefresh || Boolean(options.forceRefreshTrending), // HUTTLE AI: cache fix
    forceRefreshHashtags: forceRefresh || Boolean(options.forceRefreshHashtags), // HUTTLE AI: cache fix
  }; // HUTTLE AI: cache fix

  if (!forceRefresh && !normalizedOptions.skipCacheLookup) { // HUTTLE AI: cache fix
    const cachedResult = await getDashboardCache(userId, brandProfile, normalizedOptions); // HUTTLE AI: cache fix
    if (cachedResult.success && cachedResult.cacheHit) { // HUTTLE AI: cache fix
      return { // HUTTLE AI: cache fix
        success: true, // HUTTLE AI: cache fix
        cacheHit: true, // HUTTLE AI: cache fix
        generatedDate: cachedResult.generatedDate, // HUTTLE AI: cache fix
        shouldTrackUsage: false, // HUTTLE AI: cache fix
        data: cachedResult.data, // HUTTLE AI: cache fix
      }; // HUTTLE AI: cache fix
    } // HUTTLE AI: cache fix

    if (!cachedResult.success && cachedResult.errorType === 'auth_error') { // HUTTLE AI: cache fix
      return cachedResult; // HUTTLE AI: cache fix
    } // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix

  const session = await getDashboardSession(); // HUTTLE AI: cache fix
  if (!session) { // HUTTLE AI: cache fix
    console.warn('[Dashboard] No auth session, skipping user data fetch'); // HUTTLE AI: cache fix
    return { // HUTTLE AI: cache fix
      success: false, // HUTTLE AI: cache fix
      errorType: 'auth_error', // HUTTLE AI: cache fix
      errorMessage: 'No active auth session.', // HUTTLE AI: cache fix
    }; // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix

  const generatedDate = normalizedOptions.generatedDate || getUtcDateString(); // HUTTLE AI: cache fix
  const headers = await getAuthHeaders(); // HUTTLE AI: cache fix
  const context = buildDashboardBrandContext(brandProfile); // HUTTLE AI: cache fix
  console.log('[Dashboard] Brand Voice loaded:', { // HUTTLE AI: cache fix
    niche: context.niche, // HUTTLE AI: cache fix
    trendingMode: context.trendingMode, // HUTTLE AI: cache fix
    platforms: context.selectedPlatforms, // HUTTLE AI: cache fix
    city: context.city || DEFAULT_CITY, // HUTTLE AI: cache fix
  }); // HUTTLE AI: cache fix

  try { // HUTTLE AI: cache fix
    const platformResults = await fetchAllPlatformWidgets(context.selectedPlatforms, context, headers, normalizedOptions); // HUTTLE AI: cache fix
    const [aiInsightsResult, dailyAlerts] = await Promise.all([ // HUTTLE AI: cache fix
      generateAIInsights(context, headers), // HUTTLE AI: cache fix
      fetchDailyAlerts(), // HUTTLE AI: cache fix
    ]); // HUTTLE AI: cache fix

    const trendingTopics = platformResults.flatMap(({ platform, trendingResult }) => // HUTTLE AI: cache fix
      ensureArray(trendingResult.items) // HUTTLE AI: cache fix
        .map((item) => normalizeTrendItem(item, platform, trendingResult.fromCache, trendingResult.generatedAt)) // HUTTLE AI: cache fix
        .filter(Boolean) // HUTTLE AI: cache fix
    ); // HUTTLE AI: cache fix

    let hashtagsOfDay = platformResults.flatMap(({ platform, hashtagResult }) => // HUTTLE AI: cache fix
      ensureArray(hashtagResult.items) // HUTTLE AI: cache fix
        .map((item) => normalizeHashtagItem(item, platform, hashtagResult.fromCache, hashtagResult.generatedAt, hashtagResult.fromYesterday)) // HUTTLE AI: cache fix
        .filter(Boolean) // HUTTLE AI: cache fix
    ); // HUTTLE AI: cache fix

    if (hashtagsOfDay.length === 0) { // HUTTLE AI: cache fix
      hashtagsOfDay = buildHashtagFallbackItems(context.primaryPlatform) // HUTTLE AI: cache fix
        .map((item) => normalizeHashtagItem(item, context.primaryPlatform, false, new Date().toISOString(), false)) // HUTTLE AI: cache fix
        .filter(Boolean); // HUTTLE AI: cache fix
    } // HUTTLE AI: cache fix

    const trendingFallbackMessage = trendingTopics.length === 0 // HUTTLE AI: cache fix
      ? platformResults.find(({ trendingResult }) => trendingResult.fallbackMessage)?.trendingResult?.fallbackMessage || 'Trends are refreshing — check back in a few minutes.' // HUTTLE AI: cache fix
      : ''; // HUTTLE AI: cache fix
    const hashtagsFallbackMessage = platformResults.find(({ hashtagResult }) => hashtagResult.fallbackMessage)?.hashtagResult?.fallbackMessage || 'Hashtags loading — refresh in a moment.'; // HUTTLE AI: cache fix
    const hashtagsFromPreviousDay = hashtagsOfDay.some((item) => item.from_yesterday); // HUTTLE AI: cache fix

    const createdAt = [ // HUTTLE AI: cache fix
      aiInsightsResult?.createdAt, // HUTTLE AI: cache fix
      ...platformResults.flatMap(({ trendingResult, hashtagResult }) => [trendingResult.generatedAt, hashtagResult.generatedAt]), // HUTTLE AI: cache fix
    ].filter(Boolean).sort().slice(-1)[0] || new Date().toISOString(); // HUTTLE AI: cache fix

    const shouldTrackUsage = // HUTTLE AI: cache fix
      platformResults.some(({ trendingResult, hashtagResult }) => // HUTTLE AI: cache fix
        (ensureArray(trendingResult.items).length > 0 && !trendingResult.fromCache) // HUTTLE AI: cache fix
        || (ensureArray(hashtagResult.items).length > 0 && !hashtagResult.fromCache && !hashtagResult.fromYesterday) // HUTTLE AI: cache fix
      ) // HUTTLE AI: cache fix
      || !aiInsightsResult?.fromCache; // HUTTLE AI: cache fix

    const dashboardData = buildDashboardDataPayload(context, { // HUTTLE AI: cache fix
      trendingTopics, // HUTTLE AI: cache fix
      hashtagsOfDay, // HUTTLE AI: cache fix
      aiInsights: aiInsightsResult?.insights || [], // HUTTLE AI: cache fix
      dailyAlerts, // HUTTLE AI: cache fix
      createdAt, // HUTTLE AI: cache fix
      trendingFallbackMessage, // HUTTLE AI: cache fix
      hashtagsFallbackMessage, // HUTTLE AI: cache fix
      hashtagsFromPreviousDay, // HUTTLE AI: cache fix
    }); // HUTTLE AI: cache fix

    await writeDailyDashboardCache(userId, generatedDate, dashboardData); // HUTTLE AI: cache fix
    console.log('[Dashboard] All platforms loaded, rendering...'); // HUTTLE AI: cache fix

    return { // HUTTLE AI: cache fix
      success: true, // HUTTLE AI: cache fix
      cacheHit: false, // HUTTLE AI: cache fix
      isFallback: Boolean(aiInsightsResult?.usedFallback), // HUTTLE AI: cache fix
      generatedDate, // HUTTLE AI: cache fix
      shouldTrackUsage, // HUTTLE AI: cache fix
      data: dashboardData, // HUTTLE AI: cache fix
    }; // HUTTLE AI: cache fix
  } catch (error) { // HUTTLE AI: cache fix
    console.error('Error generating dashboard data:', error); // HUTTLE AI: cache fix
    const fallbackInsights = buildFallbackAIInsights(context); // HUTTLE AI: cache fix
    const dashboardData = buildDashboardDataPayload(context, { // HUTTLE AI: cache fix
      trendingTopics: [], // HUTTLE AI: cache fix
      hashtagsOfDay: [], // HUTTLE AI: cache fix
      aiInsights: fallbackInsights, // HUTTLE AI: cache fix
      dailyAlerts: [], // HUTTLE AI: cache fix
      createdAt: new Date().toISOString(), // HUTTLE AI: cache fix
      trendingFallbackMessage: 'Trends are refreshing — check back in a few minutes.', // HUTTLE AI: cache fix
      hashtagsFallbackMessage: 'Hashtags loading — refresh in a moment.', // HUTTLE AI: cache fix
      hashtagsFromPreviousDay: false, // HUTTLE AI: cache fix
    }); // HUTTLE AI: cache fix

    return { // HUTTLE AI: cache fix
      success: true, // HUTTLE AI: cache fix
      cacheHit: false, // HUTTLE AI: cache fix
      isFallback: true, // HUTTLE AI: cache fix
      generatedDate, // HUTTLE AI: cache fix
      shouldTrackUsage: false, // HUTTLE AI: cache fix
      data: dashboardData, // HUTTLE AI: cache fix
    }; // HUTTLE AI: cache fix
  } // HUTTLE AI: cache fix
} // HUTTLE AI: cache fix

export async function deleteDashboardCache(userId) {
  if (!userId) {
    return { success: false, errorType: 'auth_error', errorMessage: 'User is not authenticated.' };
  }

  const generatedDate = getUtcDateString(); // HUTTLE AI: cache fix

  try {
    const { error } = await supabase
      .from(DASHBOARD_CACHE_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('generated_date', generatedDate);

    if (error) {
      console.error('Error deleting dashboard cache:', error);
      return { success: false, errorType: 'db_error', errorMessage: 'Could not refresh dashboard cache.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting dashboard cache:', error);
    return { success: false, errorType: 'unknown_error', errorMessage: 'Could not refresh dashboard cache.' };
  }
}

export async function trackDashboardGenerationUsage(userId, source = 'dashboard_daily_generation') {
  if (!userId) return false;
  return trackUsage(userId, 'aiGenerations', { source, createdBy: 'dashboard_cache_service' });
}
