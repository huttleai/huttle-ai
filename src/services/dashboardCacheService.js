import { supabase, trackUsage } from '../config/supabase';
import { API_TIMEOUTS } from '../config/apiConfig';
import { normalizeNiche, buildCacheKey } from '../utils/normalizeNiche';
import { retryFetch } from '../utils/retryFetch';
import { buildBrandContext as buildCreatorBrandBlock } from '../utils/buildBrandContext'; // HUTTLE AI: brand context injected

let _cachedTrends = null;

/** @param {object[]|null} trends */
export function setCachedTrends(trends) {
  _cachedTrends = Array.isArray(trends) && trends.length ? trends : null;
}

export function getCachedTrends() {
  return _cachedTrends;
}

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
    category: 'format_trend',
    format_type: 'before/after transition reel',
    why_its_working: 'High save rates signal value to ranking systems.',
    confidence: 'medium',
  },
  {
    title: 'Behind the scenes',
    description: 'Day-in-the-life content builds trust and humanizes your brand.',
    momentum: 'steady',
    category: 'format_trend',
    format_type: 'day-in-the-life montage',
    why_its_working: 'Authenticity increases watch time and profile visits.',
    confidence: 'medium',
  },
  {
    title: 'Quick tip videos',
    description: 'Educational short-form content consistently outperforms promotional posts.',
    momentum: 'peaking',
    category: 'engagement_pattern',
    format_type: 'talking head with B-roll',
    why_its_working: 'Saves and shares boost distribution in discovery feeds.',
    confidence: 'medium',
  },
  {
    title: 'Customer testimonials',
    description: 'Social proof content has strong conversion rates across all platforms.',
    momentum: 'steady',
    category: 'viral_moment',
    format_type: 'testimonial compilation',
    why_its_working: 'Trust signals improve comment quality and conversions.',
    confidence: 'medium',
  },
];

const TRENDING_SAMPLE_FALLBACK = [
  {
    title: 'Sample: educational carousel',
    description: 'Carousel posts with clear takeaways often earn strong saves when niche-specific. (Sample trend — live data unavailable.)',
    momentum: 'steady',
    category: 'format_trend',
    format_type: 'carousel with text',
    niche_angle: 'Turn one client question into 5 slides: problem, myth, fix, proof, CTA.',
    hook_starter: 'Save this if you want clearer content without more hours.',
    why_its_working: 'Saves train algorithms to show your posts to similar viewers.',
    confidence: 'medium',
    trend_type: 'global',
    _isSampleTrend: true,
  },
  {
    title: 'Sample: talking head tips',
    description: 'Short expert tips with a strong first line still perform when execution is tight. (Sample trend — live data unavailable.)',
    momentum: 'rising',
    category: 'engagement_pattern',
    format_type: 'talking head with B-roll cuts',
    niche_angle: 'Film one tip per clip and batch 3 hooks from the same setup.',
    hook_starter: 'This one tweak changed how my audience engages.',
    why_its_working: 'Hook retention in the first 2 seconds drives more distribution.',
    confidence: 'medium',
    trend_type: 'global',
    _isSampleTrend: true,
  },
  {
    title: 'Sample: POV skit',
    description: 'POV formats reward clear characters and fast pacing. (Sample trend — live data unavailable.)',
    momentum: 'peaking',
    category: 'viral_moment',
    format_type: 'POV skit',
    niche_angle: 'Use a single relatable scenario your audience hits weekly.',
    hook_starter: 'POV: you finally fixed the thing that was costing you clients.',
    why_its_working: 'Relatable POV drives comments, which can expand reach.',
    confidence: 'medium',
    trend_type: 'niche',
    _isSampleTrend: true,
  },
  {
    title: 'Sample: process timelapse',
    description: 'Satisfying process videos can earn repeat views. (Sample trend — live data unavailable.)',
    momentum: 'steady',
    category: 'format_trend',
    format_type: 'satisfying process video',
    niche_angle: 'Show the real workflow with tight cuts and one payoff moment.',
    hook_starter: 'Watch the full process — the last 3 seconds are the point.',
    why_its_working: 'Loops and replays increase watch time signals.',
    confidence: 'medium',
    trend_type: 'global',
    _isSampleTrend: true,
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

const DASHBOARD_SCHEDULE_TZ = 'America/New_York';
/** Hour (0–23) in Eastern time; before this, the dashboard "day" is the previous calendar date. */
const DASHBOARD_DAY_START_HOUR_ET = 6;

function getEasternWallClockParts(date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: DASHBOARD_SCHEDULE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map = Object.fromEntries(
    parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  );
  return {
    y: Number(map.year),
    m: Number(map.month),
    d: Number(map.day),
    h: Number(map.hour),
  };
}

function subtractOneCalendarDay(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
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
      return data.payload;
    }

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

function getPlatformWideTrendingPrompt(platform, today) {
  const platformLabel = formatPlatformLabel(platform);
  return {
    role: 'system',
    content: `You are a real-time social media trend analyst who tracks viral content formats and engagement patterns. Today is ${today}.

Search for what is ACTUALLY trending on ${platformLabel} RIGHT NOW — content from the last 7 days only. Focus on:

1. VIRAL CONTENT FORMATS — the specific production style (lip-sync + text overlay, talking head with B-roll, before/after transition, POV skit, GRWM, carousel with text, duet reaction, tutorial with hook, photo dump aesthetic, day-in-the-life montage)
2. TRENDING AUDIO/SOUNDS — specific sounds being widely adopted by creators
3. ENGAGEMENT PATTERNS — what the algorithm is currently rewarding (comment-bait, save-worthy educational content, share-triggering hot takes, watch-time hooks)

For EACH trend, return:
- "title": catchy name, 5 words max
- "description": what the trend IS and what makes it distinctive, 2-3 sentences
- "format_type": the specific content FORMAT (e.g., "lip-sync + text overlay", "talking head with B-roll cuts", "before/after transition reel", "POV skit")
- "momentum": "rising" (early adoption, under ~20K uses) | "peaking" (mass adoption) | "steady" (established but still performing)
- "why_its_working": ONE sentence explaining the algorithmic or psychological reason this format gets reach right now. Be specific — reference the platform mechanic (e.g., "Reels algorithm is boosting lip-sync content under 40K audio uses" or "Comment-bait format drives 3x engagement which triggers Explore placement")
- "confidence": "high" if you found multiple recent creator examples | "medium" if based on limited signals
- "category": "viral_moment" | "format_trend" | "audio_trend" | "engagement_pattern" | "platform_shift"

STRICT RULES:
- Return ONLY trends you found evidence of in the last 7 days
- Prefer fewer high-quality trends over padding with uncertain ones — return 4-5 max
- If a trend is older than 7 days, do NOT include it
- Every description must reference what makes this trend DISTINCTIVE, not generic
- NEVER fabricate trend names or post counts

Return ONLY a JSON array. No other text, no markdown, no explanation.`,
  };
}

function brandDataFromTrendingContext(context) {
  const bp = context.brandProfile || {};
  return {
    niche: context.niche,
    subNiche: normalizeTextValue(bp.subNiche),
    targetAudience: context.targetAudience,
    city: context.city,
    tone: normalizeTextValue(bp.tone || bp.brandVoice),
    creatorType: bp.creatorType || bp.profileType,
    industry: normalizeTextValue(bp.industry),
    growth_stage: bp.growthStage || bp.growth_stage,
  };
}

function buildNicheSpecificTrendingMessages(platform, brandData, today) {
  const {
    niche,
    subNiche,
    targetAudience,
    city,
    tone,
    creatorType,
    industry,
    growth_stage,
  } = brandData;

  const platformLabel = formatPlatformLabel(platform);
  const nicheLabel = niche || 'your niche';
  const medSpaExample = niche === 'Med Spa' || niche === 'Beauty'
    || nicheLabel === 'Med Spa'
    || nicheLabel === 'Beauty';

  return [
    {
      role: 'system',
      content: `You are a social media content strategist who specializes in the "${nicheLabel}" niche. Today is ${today}.

You research what creators and brands in "${nicheLabel}" are posting on ${platformLabel} RIGHT NOW that is getting unusually high engagement. You understand this niche deeply — you know the audience, the pain points, the content styles that resonate, and the formats that convert.

User profile:
- Creator type: ${creatorType || 'content creator'}
- Niche: ${nicheLabel}${subNiche ? ` (sub-niche: ${subNiche})` : ''}
- Target audience: ${targetAudience || 'not specified'}
- Brand voice/tone: ${tone || 'professional and approachable'}
- Growth stage: ${growth_stage || 'building momentum'}
${city ? `- Location: ${city}` : ''}
${industry ? `- Industry: ${industry}` : ''}`,
    },
    {
      role: 'user',
      content: `Find 3-4 content trends specifically relevant to a ${creatorType || 'content creator'} in the "${nicheLabel}" niche on ${platformLabel} right now.

For EACH trend, return:
- "title": catchy name, 5 words max
- "description": what it is and why it's resonating specifically in ${nicheLabel}, 2-3 sentences. Reference specific creator behaviors or audience reactions you found.
- "format_type": the content FORMAT being used (e.g., "client transformation reel", "day-in-the-life", "myth-busting talking head", "satisfying process video", "testimonial compilation")
- "niche_angle": ONE specific sentence explaining how a ${creatorType || 'creator'} in "${nicheLabel}" should adapt this. Be HYPER-SPECIFIC to "${nicheLabel}" — mention actual content scenarios, not generic advice. ${medSpaExample ? 'Example: "Med spas are filming satisfying extraction close-ups with ASMR audio, driving 4x saves vs standard posts."' : `Example for ${nicheLabel}: describe an actual content scenario a ${nicheLabel} creator would film.`}
- "hook_starter": A scroll-stopping opening line (max 15 words) written in a ${tone || 'conversational'} tone for ${targetAudience || 'their target audience'}. This must be COPY-PASTE READY as the first line of a caption or text overlay on a Reel. Do NOT make it generic — it must clearly relate to "${nicheLabel}".
- "why_its_working": ONE sentence explaining why this specific angle is performing well in ${nicheLabel} right now. Reference the audience behavior or platform mechanic.
- "momentum": "rising" | "peaking" | "steady"
- "confidence": "high" | "medium"

STRICT RULES:
- Every trend MUST be specific to "${nicheLabel}" — not general social media advice
- hook_starter must be ready to copy and paste, not a template with brackets
- Prefer fewer HIGH-QUALITY niche trends over padding — 3-4 max
- If you cannot find real niche-specific trends, return fewer items rather than fabricating

Return ONLY a JSON array. No other text.`,
    },
  ];
}

function buildPlatformWideTrendingMessages(platform, today) {
  return [
    getPlatformWideTrendingPrompt(platform, today),
    {
      role: 'user',
      content: 'Return ONLY the JSON array. No markdown or commentary.',
    },
  ];
}

function mergeAndRankTrends(globalTrends, nicheTrends, platform) {
  const tagged = [
    ...ensureArray(globalTrends).map((t) => normalizeTrendItem(t, 'global', platform)),
    ...ensureArray(nicheTrends).map((t) => normalizeTrendItem(t, 'niche', platform)),
  ].filter(Boolean);

  const seen = new Set();
  const unique = tagged.filter((t) => {
    const key = String(t.title || t.topic || '')
      .toLowerCase()
      .split(' ')
      .slice(0, 3)
      .join(' ');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const momentumScore = { peaking: 3, rising: 2, steady: 1, declining: 0 };
  const typeScore = { niche: 3, hybrid: 2, global: 1 };

  unique.sort((a, b) => {
    const aScore = (momentumScore[a.momentum] || 1) + (typeScore[a.trend_type] || 1);
    const bScore = (momentumScore[b.momentum] || 1) + (typeScore[b.trend_type] || 1);
    return bScore - aScore;
  });

  const nichePick = unique.filter((t) => t.trend_type === 'niche').slice(0, 3);
  const globalPick = unique.filter((t) => t.trend_type === 'global').slice(0, 3);
  const rest = unique.filter((t) => !nichePick.includes(t) && !globalPick.includes(t)).slice(0, 2);

  return [...nichePick, ...globalPick, ...rest].slice(0, 8);
}

async function adaptGlobalTrendForNiche(trend, brandData) {
  if (trend.niche_angle && trend.hook_starter) return trend;

  const title = trend.title || trend.topic || '';
  const prompt = `You are a content strategist. A ${brandData.creatorType || 'content creator'} in the "${brandData.niche}" niche wants to use this trending format:

Trend: "${title}"
Format: "${trend.format_type || 'video'}"
Description: "${trend.description || ''}"
Their audience: ${brandData.targetAudience || 'general'}
Their tone: ${brandData.tone || 'conversational'}

Write:
1. "niche_angle" — ONE sentence on how someone in "${brandData.niche}" specifically adapts this trend. Be concrete — describe an actual content scenario they would create.
2. "hook_starter" — A copy-paste ready opening line (max 15 words) in a ${brandData.tone || 'conversational'} voice.

Return ONLY JSON: { "niche_angle": "...", "hook_starter": "..." }`;

  try {
    const headers = await getAuthHeaders();
    const response = await retryFetch(
      GROK_PROXY_URL,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'grok-4.1-fast-reasoning',
          temperature: 0.2,
          messages: [{ role: 'user', content: prompt }],
        }),
      },
      { timeoutMs: API_TIMEOUTS.STANDARD },
    );

    if (!response.ok) return trend;

    const payload = await response.json();
    const parsed = parseStructuredJson(payload?.content || '');
    if (!parsed || typeof parsed !== 'object') return trend;

    return {
      ...trend,
      niche_angle: parsed.niche_angle || trend.niche_angle,
      hook_starter: parsed.hook_starter || trend.hook_starter,
      trend_type: 'hybrid',
    };
  } catch {
    return trend;
  }
}

async function enrichTrendsWithGrokAdaptation(merged, context) {
  const brandData = brandDataFromTrendingContext(context);
  let adaptCount = 0;
  const out = [];

  for (const t of merged) {
    if (t.trend_type === 'global' && (!t.niche_angle || !t.hook_starter) && adaptCount < 3) {
      adaptCount += 1;
      out.push(await adaptGlobalTrendForNiche(t, brandData));
    } else {
      out.push(t);
    }
  }

  return out;
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

async function requestPerplexityWidgetData(type, platform, context, headers, options = {}, cacheKey, messages) {
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
            ...(options?.searchContextSize ? { search_context_size: options.searchContextSize } : {}),
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

function normalizeTrendItem(item, trendType = 'global', platform = 'instagram', fromCache = false, generatedAt = null) {
  const title = normalizeTextValue(item?.title || item?.topic || item?.name || 'Untitled Trend');
  const description = normalizeTextValue(item?.summary || item?.description);
  const whyLine = normalizeTextValue(
    item?.why_its_working || item?.why_it_matters || item?.why_trending || item?.algorithm_reason || ''
  );
  const contentIdea = normalizeTextValue(item?.content_idea);
  const hookStarter = normalizeTextValue(
    item?.hook_starter || item?.hook || item?.content_idea || (Array.isArray(item?.content_ideas) ? item.content_ideas[0] : '') || (Array.isArray(item?.how_to_use) ? item.how_to_use[0] : '')
  );

  if (!title) return null;
  if (!description && !whyLine && !hookStarter) return null;

  const descFinal = description || whyLine || hookStarter;
  const platformLabel = formatPlatformLabel(item?.platform || platform);

  const angles = [];
  if (hookStarter) angles.push(hookStarter);
  if (contentIdea && contentIdea !== hookStarter) angles.push(contentIdea);

  return {
    topic: title,
    title,
    context: descFinal,
    description: descFinal,
    momentum: normalizeTrendingMomentum(item?.momentum),
    relevant_platform: platformLabel,
    platform: normalizePlatformValue(platform),
    content_angles: angles.length ? angles : [],
    format_type: item?.format_type || item?.format || item?.content_format || null,
    niche_angle: item?.niche_angle || item?.relevance_to_niche || item?.niche_relevance || null,
    hook_starter: hookStarter || null,
    why_its_working: whyLine || null,
    confidence: normalizeTextValue(item?.confidence).toLowerCase() === 'high' ? 'high' : 'medium',
    trend_type: item?.trend_type || trendType,
    category: item?.category || item?.type || 'viral_moment',
    from_cache: fromCache,
    from_yesterday: false,
    generated_at: generatedAt,
    _isSampleTrend: Boolean(item?._isSampleTrend),
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

async function fetchSingleTrendingSlice(variant, platform, context, headers, options, generatedDate) {
  const today = generatedDate || getDashboardGeneratedDate();
  const messages = variant === 'global'
    ? buildPlatformWideTrendingMessages(platform, today)
    : buildNicheSpecificTrendingMessages(platform, brandDataFromTrendingContext(context), today);
  const cacheKey = buildPerPlatformCacheKey(
    context,
    platform,
    variant === 'global' ? 'trending_v2_global' : 'trending_v2_niche',
    generatedDate,
  );
  const forceRefresh = Boolean(options.forceRefreshTrending);

  if (!forceRefresh) {
    const cachedResult = await getWarmPlatformCache(cacheKey, platform, 'trending');
    if (cachedResult) {
      const parsed = parseTrendingResponse(cachedResult);
      return {
        items: Array.isArray(parsed) ? parsed : [],
        fromCache: true,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  const response = await requestPerplexityWidgetData(
    'trending',
    platform,
    context,
    headers,
    { ...options, searchContextSize: 'medium' },
    cacheKey,
    messages,
  );

  if (!response || !response.ok) {
    return { items: [], fromCache: false, generatedAt: null };
  }

  const payload = await response.json();
  const perplexityResponse = payload?.structuredData ?? payload?.content ?? null;
  const parsedResult = parseTrendingResponse(perplexityResponse);
  const items = parsedResult?.length > 0 ? parsedResult : TRENDING_FALLBACK;

  return {
    items,
    fromCache: Boolean(payload?.cached),
    generatedAt: payload?.generatedAt || new Date().toISOString(),
  };
}

async function fetchMergedTrendingForPlatform(platform, context, headers, options, generatedDate) {
  const includeNiche = context.trendingMode === 'niche_specific';

  try {
    const globalRes = await fetchSingleTrendingSlice('global', platform, context, headers, options, generatedDate);
    let nicheRes = { items: [], fromCache: true, generatedAt: globalRes.generatedAt };

    if (includeNiche) {
      nicheRes = await fetchSingleTrendingSlice('niche', platform, context, headers, options, generatedDate);
    }

    let mergedRaw = includeNiche
      ? mergeAndRankTrends(globalRes.items, nicheRes.items, platform)
      : ensureArray(globalRes.items)
        .map((item) => normalizeTrendItem(item, 'global', platform, globalRes.fromCache, globalRes.generatedAt))
        .filter(Boolean);

    mergedRaw = await enrichTrendsWithGrokAdaptation(mergedRaw, context);

    const fromCache = globalRes.fromCache && (!includeNiche || nicheRes.fromCache);
    const generatedAt = nicheRes.generatedAt || globalRes.generatedAt || new Date().toISOString();

    const items = mergedRaw.map((t) => ({
      ...t,
      from_cache: fromCache,
      generated_at: t.generated_at || generatedAt,
    }));

    if (items.length === 0) {
      const sample = TRENDING_SAMPLE_FALLBACK.map((raw) =>
        normalizeTrendItem(raw, raw.trend_type || 'global', platform, false, generatedAt)
      ).filter(Boolean);
      return {
        items: sample,
        fromCache: false,
        fromYesterday: false,
        generatedAt,
        fallbackMessage: 'Sample trends — live data unavailable. Retry for fresh data.',
      };
    }

    return {
      items,
      fromCache,
      fromYesterday: false,
      generatedAt,
      fallbackMessage: '',
    };
  } catch (error) {
    console.warn('[Dashboard] Trending merge failed:', error);
    const previousDayCache = await getPreviousDayPlatformCache(context, platform, 'trending', generatedDate);
    if (previousDayCache?.payload) {
      const parsed = parseTrendingResponse(previousDayCache.payload);
      const merged = ensureArray(parsed)
        .map((item) => normalizeTrendItem(item, 'global', platform, false, previousDayCache.generated_at))
        .filter(Boolean);
      if (merged.length) {
        return {
          items: merged,
          fromCache: false,
          fromYesterday: true,
          generatedAt: previousDayCache.generated_at,
          fallbackMessage: 'Last updated from cache — tap refresh for latest.',
        };
      }
    }
    const sample = TRENDING_SAMPLE_FALLBACK.map((raw) =>
      normalizeTrendItem(raw, raw.trend_type || 'global', platform, false, null)
    ).filter(Boolean);
    return {
      items: sample,
      fromCache: false,
      fromYesterday: false,
      generatedAt: null,
      fallbackMessage: 'Sample trends — live data unavailable.',
    };
  }
}

async function fetchPerPlatformWidgetData(type, platform, context, headers, options = {}) {
  const generatedDate = options.generatedDate || getDashboardGeneratedDate(); // HUTTLE AI: cache fix

  if (type === 'trending') {
    return fetchMergedTrendingForPlatform(platform, context, headers, options, generatedDate);
  }

  const cacheKey = buildPerPlatformCacheKey(context, platform, type, generatedDate);
  const forceRefresh = Boolean(options.forceRefreshHashtags);
  const messages = buildHashtagMessages(context, platform);

  try {
    if (!forceRefresh) {
      const cachedResult = await getWarmPlatformCache(cacheKey, platform, type);
      if (cachedResult) {
        const cachedItems = ensureArray(cachedResult);
        return {
          items: Array.isArray(cachedItems) ? cachedItems : [],
          fromCache: true,
          fromYesterday: false,
          generatedAt: new Date().toISOString(),
          fallbackMessage: '',
        };
      }
    }

    const response = await requestPerplexityWidgetData(type, platform, context, headers, options, cacheKey, messages);

    if (!response) {
      throw new Error(`Perplexity ${type} request failed.`);
    }

    if (!response.ok) {
      throw new Error(`Perplexity ${type} request failed.`);
    }

    const payload = await response.json();
    const parsed = Array.isArray(payload?.structuredData)
      ? payload.structuredData
      : payload?.structuredData
        ? (console.warn('[Perplexity] Response is not an array, using parser fallback:', typeof payload.structuredData), null)
        : parsePerplexityResponse(payload?.content || '');

    if (!Array.isArray(parsed)) {
      throw new Error(`Perplexity ${type} response was not a valid JSON array.`);
    }

    const items = parsed.length === 0
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

    return {
      items: buildHashtagFallbackItems(platform),
      fromCache: false,
      fromYesterday: false,
      generatedAt: null,
      fallbackMessage: 'Hashtags loading — refresh in a moment.',
    };
  }
}

async function fetchAllPlatformWidgets(platforms, context, headers, options = {}) {
  const results = [];

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
          model: 'grok-4.1-fast-reasoning', // HUTTLE AI: cache fix
          temperature: 0.2, // HUTTLE AI: cache fix
          messages: buildAIInsightsMessages(context), // HUTTLE AI: cache fix
        }), // HUTTLE AI: cache fix
      }, // HUTTLE AI: cache fix
      { // HUTTLE AI: cache fix
        timeoutMs: API_TIMEOUTS.STANDARD, // HUTTLE AI: cache fix
      } // HUTTLE AI: cache fix
    ); // HUTTLE AI: cache fix

    if (!response.ok) { // HUTTLE AI: cache fix
      const errJson = await response.json().catch(() => ({})); // HUTTLE AI: cache fix
      throw new Error( // HUTTLE AI: cache fix
        (errJson?.message && typeof errJson.message === 'string' && errJson.message) // HUTTLE AI: cache fix
          || 'Grok insights request failed.', // HUTTLE AI: cache fix
      ); // HUTTLE AI: cache fix
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

/**
 * YYYY-MM-DD key for daily dashboard cache: Eastern calendar date, rolling at 6:00 AM America/New_York.
 * @param {Date} [date]
 * @returns {string}
 */
export function getDashboardGeneratedDate(date = new Date()) {
  let { y, m, d, h } = getEasternWallClockParts(date);
  if (h < DASHBOARD_DAY_START_HOUR_ET) {
    ({ y, m, d } = subtractOneCalendarDay(y, m, d));
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

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

  const generatedDate = options.generatedDate || getDashboardGeneratedDate(); // HUTTLE AI: cache fix
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

  const generatedDate = normalizedOptions.generatedDate || getDashboardGeneratedDate(); // HUTTLE AI: cache fix
  const headers = await getAuthHeaders(); // HUTTLE AI: cache fix
  const context = buildDashboardBrandContext(brandProfile); // HUTTLE AI: cache fix
  const optionsWithGeneratedDate = { ...normalizedOptions, generatedDate }; // HUTTLE AI: cache fix

  try { // HUTTLE AI: cache fix
    const platformResults = await fetchAllPlatformWidgets(context.selectedPlatforms, context, headers, optionsWithGeneratedDate); // HUTTLE AI: cache fix
    const [aiInsightsResult, dailyAlerts] = await Promise.all([ // HUTTLE AI: cache fix
      generateAIInsights(context, headers), // HUTTLE AI: cache fix
      fetchDailyAlerts(), // HUTTLE AI: cache fix
    ]); // HUTTLE AI: cache fix

    const trendingTopics = platformResults.flatMap(({ platform, trendingResult }) =>
      ensureArray(trendingResult.items).map((item) => ({
        ...item,
        from_cache: item.from_cache ?? trendingResult.fromCache,
        generated_at: item.generated_at || trendingResult.generatedAt,
        relevant_platform: item.relevant_platform || formatPlatformLabel(platform),
        platform: item.platform || normalizePlatformValue(platform),
      }))
    );

    setCachedTrends(trendingTopics);

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

  const generatedDate = getDashboardGeneratedDate();

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
