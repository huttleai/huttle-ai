import { supabase, trackUsage } from '../config/supabase';
import { API_TIMEOUTS } from '../config/apiConfig';
import { normalizeNiche, buildCacheKey } from '../utils/normalizeNiche';
import { retryFetch } from '../utils/retryFetch';

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

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  if (profileType === 'brand') return 'brand_business';
  return null;
}

function isGenericTrendingNiche(niche) {
  const normalizedNiche = normalizeTextValue(niche).toLowerCase();
  return !normalizedNiche || GENERIC_TRENDING_NICHES.has(normalizedNiche);
}

function getTrendingMode(brandVoice = {}) {
  const niche = getBrandVoiceNiche(brandVoice);
  const growthStage = getBrandVoiceGrowthStage(brandVoice);
  const creatorType = getBrandVoiceCreatorType(brandVoice) || 'solo_creator';

  const hasSpecificNiche = Boolean(niche) && !isGenericTrendingNiche(niche);
  const isJustStarting = growthStage === 'just_starting_out';
  const isSoloCreatorWithGenericNiche = creatorType === 'solo_creator' && !hasSpecificNiche;

  if (!hasSpecificNiche || isJustStarting || isSoloCreatorWithGenericNiche) {
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
      console.error('[Perplexity] Response is not an array:', typeof text);
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
      console.error('[Perplexity] Response is not an array:', typeof parsed);
      return null;
    }

    return parsed;
  } catch (err) {
    console.error(
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

    console.error('[Trending] Unparseable response shape:', typeof parsed);
    return null;
  } catch (err) {
    const rawPreview = typeof raw === 'string'
      ? raw.substring(0, 300)
      : JSON.stringify(raw ?? null)?.substring(0, 300);
    console.error('[Trending] JSON parse failed:', err.message, '\nRaw (first 300):', rawPreview);
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
    console.error('[Cache Read FAILED]', error.message, error.code, cacheKey);
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
      console.error('[Cache Read FAILED]', error.message, error.code, cacheKey);
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
    const cacheKeyPattern = `${context.cacheNiche}__${currentPlatform}__${context.normalizedCity}__%__${type}`;
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
  const trendingPrompt = `You are a social media trend analyst.

Return a JSON array of 5 trending content topics for ${context.niche} businesses on ${platformLabel} right now.

Each item must have exactly these fields:
{
  "title": "Short topic name (3-6 words)",
  "description": "Why this is trending right now (1-2 sentences)",
  "momentum": "rising" | "peaking" | "steady",
  "category": "education" | "promotion" | "entertainment" | "community"
}

Rules:
- Return ONLY the JSON array, no other text, no markdown fences
- All 5 items must be relevant to ${context.niche} businesses
- Base topics on current social media trends, not generic advice
- momentum must be exactly one of: rising, peaking, steady
- category must be exactly one of: education, promotion, entertainment, community

Example of correct format:
[
  {
    "title": "Before and after results",
    "description": "Transformation content is seeing 40% higher saves this month as audiences seek proof of results.",
    "momentum": "rising",
    "category": "promotion"
  }
]

Return the JSON array now:`;

  return [
    {
      role: 'system',
      content: 'You are a social media trend analyst.',
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

  return `You are a social media hashtag analyst.

Return a JSON array of 10 hashtags for ${context.niche} businesses on ${platformLabel}.

Each item must have exactly these fields:
{
  "tag": "#hashtag",
  "volume": "HIGH" | "MEDIUM" | "NICHE",
  "engagement": number between 1-100
}

Volume distribution rules you MUST follow:
- Exactly 3-4 items with volume: "HIGH"
  (broad, well-known tags with millions of posts)
- Exactly 3-4 items with volume: "MEDIUM"
  (mid-tier tags with 100k-1M posts)
- Exactly 2-3 items with volume: "NICHE"
  (specific, targeted tags under 100k posts)

Rules:
- Return ONLY the JSON array, no markdown, no other text
- Tags must be relevant to ${context.niche} businesses on ${platformLabel}
- HIGH tags: broad industry tags (#skincare, #beauty, #botox)
- MEDIUM tags: more specific (#medspalife, #skincarespecialist)
- NICHE tags: hyper-specific (#atlantamedspa, #hydrafacialresults)
- engagement score should reflect relative popularity
${context.city ? `- Include up to 1-2 location-aware NICHE tags relevant to ${context.city} when they are realistic for ${platformLabel}` : ''}

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
              forceRefresh: type === 'hashtags'
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

      console.error('[Perplexity] Non-429 error:', response.status, platform, type);
      return null;
    } catch (error) {
      console.error('[Perplexity] Non-429 error:', error, platform, type);
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
  const rawType = normalizeTextValue(item?.type).toLowerCase();
  const isSearchKeyword = rawType === 'search_keyword' || normalizePlatformValue(platform) === 'youtube';
  const rawTag = normalizeTextValue(item?.tag);

  if (!rawTag) {
    return null;
  }

  const tagValue = isSearchKeyword
    ? rawTag.replace(/^#/, '')
    : (rawTag.startsWith('#') ? rawTag : `#${rawTag.replace(/^#*/, '')}`);
  const status = normalizeTextValue(item?.status) || 'Niche';
  const platformLabel = formatPlatformLabel(item?.platform || platform);

  return {
    hashtag: tagValue,
    relevance: `${platformLabel} discovery term for ${platform === 'youtube' ? 'searchers' : 'active content discovery'}`,
    estimated_reach: mapHashtagVolume(item?.volume),
    type: status.toLowerCase() === 'trending' ? 'trending' : 'niche',
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
  const generatedDate = getLocalDateString();
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
          ? (console.error('[Perplexity] Response is not an array:', typeof payload.structuredData), null)
          : parsePerplexityResponse(payload?.content || '');

    if (!Array.isArray(parsed)) {
      throw new Error(`Perplexity ${type} response was not a valid JSON array.`);
    }

    return {
      items: parsed,
      fromCache: Boolean(payload?.cached),
      fromYesterday: false,
      generatedAt: payload?.generatedAt || new Date().toISOString(),
      fallbackMessage: '',
    };
  } catch (error) {
    console.error(`[Dashboard] Failed to load ${type} for ${platform}:`, error);

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
      items: [],
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
      console.error(`[Dashboard] Failed to load ${platform}:`, error);
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
      content: 'You are a cautious social media strategist. You provide platform-aware recommendations, never fabricated statistics, and you frame all recommendations as benchmarks to test rather than guaranteed outcomes. Return valid JSON only.',
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

async function getCachedAIInsights(userId, generatedDate) {
  const session = await getDashboardSession();
  if (!session) {
    console.warn('[Dashboard] No auth session, skipping user data fetch');
    return null;
  }

  const { data, error } = await supabase
    .from(DASHBOARD_CACHE_TABLE)
    .select('generated_date, ai_insights, ai_insight, created_at')
    .eq('user_id', userId)
    .eq('generated_date', generatedDate)
    .maybeSingle();

  if (error) {
    console.error('Error reading cached AI insights:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  const insights = normalizeInsights(data.ai_insights);
  if (insights.length === 0 && data.ai_insight) {
    const legacyInsight = normalizeInsights([data.ai_insight]);
    if (legacyInsight.length > 0) {
      return { insights: legacyInsight, createdAt: data.created_at, fromCache: true };
    }
  }

  return insights.length > 0
    ? { insights, createdAt: data.created_at, fromCache: true }
    : null;
}

async function generateAIInsights(userId, context, headers, generatedDate) {
  const cachedInsights = await getCachedAIInsights(userId, generatedDate);
  if (cachedInsights) {
    return cachedInsights;
  }

  const fallbackInsights = buildFallbackAIInsights(context);

  try {
    const response = await retryFetch(
      GROK_PROXY_URL,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'grok-4-1-fast-reasoning',
          temperature: 0.2,
          messages: buildAIInsightsMessages(context),
        }),
      },
      {
        timeoutMs: API_TIMEOUTS.STANDARD,
      }
    );

    if (!response.ok) {
      throw new Error('Grok insights request failed.');
    }

    const payload = await response.json();
    const parsed = parseStructuredJson(payload?.content || '');
    const normalizedInsights = normalizeInsights(parsed);
    const insights = normalizedInsights.length > 0 ? normalizedInsights : fallbackInsights;
    const createdAt = new Date().toISOString();

    const { error: upsertError } = await supabase
      .from(DASHBOARD_CACHE_TABLE)
      .upsert({
        user_id: userId,
        generated_date: generatedDate,
        ai_insights: insights,
        ai_insight: insights[0] || null,
        created_at: createdAt,
      }, {
        onConflict: 'user_id,generated_date',
      });

    if (upsertError) {
      console.error('Error upserting AI insights cache:', upsertError);
    }

    return {
      insights,
      createdAt,
      fromCache: false,
      usedFallback: normalizedInsights.length === 0,
    };
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return {
      insights: fallbackInsights,
      createdAt: new Date().toISOString(),
      fromCache: false,
      usedFallback: true,
    };
  }
}

export async function getDashboardCache(userId, brandProfile, options = {}) {
  return generateDashboardData(userId, brandProfile, options);
}

export async function generateDashboardData(userId, brandProfile, options = {}) {
  if (!userId) {
    return { success: false, errorType: 'auth_error', errorMessage: 'User is not authenticated.' };
  }

  const session = await getDashboardSession();
  if (!session) {
    console.warn('[Dashboard] No auth session, skipping user data fetch');
    return {
      success: false,
      errorType: 'auth_error',
      errorMessage: 'No active auth session.',
    };
  }

  const generatedDate = getLocalDateString();
  const headers = await getAuthHeaders();
  const context = buildDashboardBrandContext(brandProfile);
  console.log('[Dashboard] Brand Voice loaded:', {
    niche: context.niche,
    trendingMode: context.trendingMode,
    platforms: context.selectedPlatforms,
    city: context.city || DEFAULT_CITY,
  });

  try {
    const platformResults = await fetchAllPlatformWidgets(context.selectedPlatforms, context, headers, options);
    const aiInsightsResult = await generateAIInsights(userId, context, headers, generatedDate);

    const trendingTopics = platformResults.flatMap(({ platform, trendingResult }) =>
      ensureArray(trendingResult.items)
        .map((item) => normalizeTrendItem(item, platform, trendingResult.fromCache, trendingResult.generatedAt))
        .filter(Boolean)
    );

    const hashtagsOfDay = platformResults.flatMap(({ platform, hashtagResult }) =>
      ensureArray(hashtagResult.items)
        .map((item) => normalizeHashtagItem(item, platform, hashtagResult.fromCache, hashtagResult.generatedAt, hashtagResult.fromYesterday))
        .filter(Boolean)
    );
    const trendingFallbackMessage = trendingTopics.length === 0
      ? platformResults.find(({ trendingResult }) => trendingResult.fallbackMessage)?.trendingResult?.fallbackMessage || 'Trends are refreshing — check back in a few minutes.'
      : '';
    const hashtagsFallbackMessage = hashtagsOfDay.length === 0
      ? platformResults.find(({ hashtagResult }) => hashtagResult.fallbackMessage)?.hashtagResult?.fallbackMessage || 'Hashtags loading — refresh in a moment.'
      : '';
    const hashtagsFromPreviousDay = hashtagsOfDay.some((item) => item.from_yesterday);

    const createdAt = [
      aiInsightsResult?.createdAt,
      ...platformResults.flatMap(({ trendingResult, hashtagResult }) => [trendingResult.generatedAt, hashtagResult.generatedAt]),
    ].filter(Boolean).sort().slice(-1)[0] || new Date().toISOString();

    const shouldTrackUsage =
      platformResults.some(({ trendingResult, hashtagResult }) =>
        (ensureArray(trendingResult.items).length > 0 && !trendingResult.fromCache)
        || (ensureArray(hashtagResult.items).length > 0 && !hashtagResult.fromCache && !hashtagResult.fromYesterday)
      )
      || !aiInsightsResult?.fromCache;

    console.log('[Dashboard] All platforms loaded, rendering...');

    return {
      success: true,
      isFallback: Boolean(aiInsightsResult?.usedFallback),
      generatedDate,
      shouldTrackUsage,
      data: {
        trending_topics: trendingTopics,
        hashtags_of_day: hashtagsOfDay,
        ai_insights: aiInsightsResult?.insights || [],
        ai_insight: aiInsightsResult?.insights?.[0] || null,
        created_at: createdAt,
        selected_platforms: context.selectedPlatforms.map(formatPlatformLabel),
        trending_fallback_message: trendingFallbackMessage,
        hashtags_fallback_message: hashtagsFallbackMessage,
        hashtags_from_previous_day: hashtagsFromPreviousDay,
        trending_mode: context.trendingMode,
        primary_platform_label: context.primaryPlatformLabel,
        show_platform_wide_niche_nudge: context.showPlatformWideNicheNudge,
        show_brand_voice_nudge: context.showBrandVoiceNudge,
        brand_voice_nudge_copy: context.brandVoiceNudgeCopy,
      },
    };
  } catch (error) {
    console.error('Error generating dashboard data:', error);
    const fallbackInsights = buildFallbackAIInsights(context);

    return {
      success: true,
      isFallback: true,
      generatedDate,
      shouldTrackUsage: false,
      data: {
        trending_topics: [],
        hashtags_of_day: [],
        ai_insights: fallbackInsights,
        ai_insight: fallbackInsights[0] || null,
        created_at: new Date().toISOString(),
        selected_platforms: context.selectedPlatforms.map(formatPlatformLabel),
        trending_fallback_message: 'Trends are refreshing — check back in a few minutes.',
        hashtags_fallback_message: 'Hashtags loading — refresh in a moment.',
        hashtags_from_previous_day: false,
        trending_mode: context.trendingMode,
        primary_platform_label: context.primaryPlatformLabel,
        show_platform_wide_niche_nudge: context.showPlatformWideNicheNudge,
        show_brand_voice_nudge: context.showBrandVoiceNudge,
        brand_voice_nudge_copy: context.brandVoiceNudgeCopy,
      },
    };
  }
}

export async function deleteDashboardCache(userId) {
  if (!userId) {
    return { success: false, errorType: 'auth_error', errorMessage: 'User is not authenticated.' };
  }

  const generatedDate = getLocalDateString();

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
