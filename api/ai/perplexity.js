/**
 * Perplexity AI Proxy Endpoint
 * 
 * SECURITY: This endpoint keeps the Perplexity API key server-side only.
 * All AI requests go through this proxy instead of exposing keys in client-side code.
 * 
 * Required environment variables:
 * - PERPLEXITY_API_KEY: Your Perplexity API key (NOT prefixed with VITE_)
 *
 * DEV NOTE — common failures:
 * - 401 from Perplexity: invalid PERPLEXITY_API_KEY → set in .env (see .env.example; server loads via dotenv in local-api-server).
 * - 401 from this proxy: Supabase Bearer token required from the logged-in app.
 * - 400 invalid model: body.model must be one of ALLOWED_MODELS (sonar, sonar-pro, llama-3.1-sonar-small-128k-online).
 * - Dashboard trending with cache.key: empty JSON arrays are not written to niche_content_cache (use dashboard fallback instead).
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from '../_utils/cors.js';
import { checkPersistentRateLimit } from '../_utils/persistent-rate-limit.js';
import { logError, logInfo } from '../_utils/observability.js';

const PERPLEXITY_API_KEY =
  process.env.PERPLEXITY_API_KEY ||
  process.env.VITE_PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

/** Perplexity chat models — resolve only via {@link resolveModelFromRequest}; do not hardcode elsewhere in this file. */
const MODEL_CONFIG = {
  dashboard_trending: 'sonar',
  quick_scan: 'sonar',
  deep_dive: 'sonar-pro',
  audience_insights: 'llama-3.1-sonar-small-128k-online',
  cta_suggester: 'llama-3.1-sonar-small-128k-online',
};

const ALLOWED_MODELS = new Set(Object.values(MODEL_CONFIG));
const ALLOWED_SEARCH_CONTEXT_SIZES = new Set(['low', 'medium', 'high']);

function isDashboardTrendingWidgetCache(body = {}) {
  const key = body.cache?.key;
  return body.cache?.type === 'trending'
    && typeof key === 'string'
    && key.includes('trending_v2');
}

function resolvePerplexityFeatureKey(body = {}) {
  if (isDashboardTrendingWidgetCache(body)) return 'dashboard_trending';

  const cacheType = body.cache?.type;
  if (cacheType === 'niche_intel') return 'deep_dive';
  if (cacheType === 'hashtags' || cacheType === 'trending_hashtags_widget') return 'quick_scan';
  if (cacheType === 'audience_insights') return 'audience_insights';
  if (cacheType === 'cta_suggester') return 'cta_suggester';

  const pf = body.perplexityFeature;
  if (pf && MODEL_CONFIG[pf]) return pf;

  if (cacheType === 'trending') return 'quick_scan';
  if (typeof cacheType === 'string' && cacheType.length > 0) return 'quick_scan';

  return 'quick_scan';
}

function resolveModelFromRequest(body = {}) {
  const feature = resolvePerplexityFeatureKey(body);
  return MODEL_CONFIG[feature] || MODEL_CONFIG.quick_scan;
}

/**
 * @param {object} rawResponse - Parsed Perplexity chat/completions JSON
 * @returns {object[]}
 */
function extractTrendsFromPerplexityResponse(rawResponse) {
  const content = rawResponse?.choices?.[0]?.message?.content;
  if (!content) return [];

  const tryExtractFromParsed = (parsed) => {
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    if (parsed && typeof parsed === 'object') {
      for (const key of ['trends', 'topics', 'trending', 'results', 'items', 'data']) {
        if (Array.isArray(parsed[key]) && parsed[key].length > 0) return parsed[key];
      }
    }
    return null;
  };

  try {
    const parsed = JSON.parse(content);
    const fromDirect = tryExtractFromParsed(parsed);
    if (fromDirect) return fromDirect;
  } catch {
    // continue to fenced / bracket extraction
  }

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const inner = JSON.parse(jsonMatch[1].trim());
      const fromFence = tryExtractFromParsed(inner);
      if (fromFence) return fromFence;
    } catch {
      // continue
    }
  }

  const arrayMatch = content.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    try {
      const arr = JSON.parse(arrayMatch[0]);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch {
      // continue
    }
  }

  console.error('[Perplexity] Could not extract trends from response', {
    contentSnippet: content?.slice(0, 200),
  });
  return [];
}

function trendingPayloadHasValidTitles(items) {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.some((item) => {
    const t = String(item?.title || item?.topic || item?.name || '').trim();
    return Boolean(t);
  });
}

function validateTrendingCacheWritePayload(cachePayload) {
  return Array.isArray(cachePayload)
    && cachePayload.length > 0
    && trendingPayloadHasValidTitles(cachePayload);
}

// Initialize Supabase for auth verification
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per user (more restrictive for Perplexity)

function devAiProxyLog(message, meta = undefined) {
  if (process.env.NODE_ENV === 'production' && process.env.DEV_AI_PROXY_LOG !== '1') return;
  if (meta !== undefined) console.log(`[DEV AI proxy] ${message}`, meta);
  else console.log(`[DEV AI proxy] ${message}`);
}

/** OpenAI-style chat messages only — extra client fields break some providers. */
function normalizeMessagesForUpstream(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map((m) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
  }));
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

async function incrementCacheHitCount(cacheRow) {
  if (!supabase || !cacheRow?.id) return;

  try {
    const nextHitCount = Number.isFinite(cacheRow.hit_count) ? cacheRow.hit_count + 1 : 1;
    await supabase
      .from('niche_content_cache')
      .update({ hit_count: nextHitCount })
      .eq('id', cacheRow.id);
  } catch {
    // Best-effort only. Some environments may not yet have hit_count.
  }
}

function hasPersonalizationSignals(body = {}) {
  const competitorHandles = Array.isArray(body.competitorHandles)
    ? body.competitorHandles.filter(Boolean)
    : [];
  const competitorHandleText = typeof body.competitorHandles === 'string'
    ? body.competitorHandles.trim()
    : '';

  return Boolean(
    body.personalized
    || body.targetAudience
    || body.brandContext
    || competitorHandles.length > 0
    || competitorHandleText
  );
}

function buildCacheAccessContext(requestBody = {}, userId = null) {
  const isPersonalized = hasPersonalizationSignals(requestBody);
  return {
    isPersonalized,
    userId: isPersonalized ? userId : null,
  };
}

function applyCacheUserScope(query, cacheAccess) {
  if (cacheAccess?.userId) {
    return query.eq('user_id', cacheAccess.userId);
  }

  return query.is('user_id', null);
}

function formatCachedResponse(resultData) {
  return {
    content: typeof resultData === 'string'
      ? resultData
      : JSON.stringify(resultData),
    structuredData: typeof resultData === 'string' ? null : resultData,
  };
}

async function getCachedPerplexityResult(cacheConfig, cacheAccess) {
  if (!supabase || !cacheConfig?.key) return null;

  const { data, error } = await applyCacheUserScope(
    supabase
      .from('niche_content_cache')
      .select('*')
      .eq('cache_key', cacheConfig.key),
    cacheAccess,
  )
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (!data.expires_at || new Date(data.expires_at).getTime() <= Date.now()) {
    return null;
  }

  await incrementCacheHitCount(data);

  return {
    resultData: data.payload ?? data.result_data,
    generatedAt: data.generated_at,
  };
}

async function setCachedPerplexityResult(cacheConfig, cachePayload, cacheAccess) {
  if (!cacheConfig?.key || cachePayload == null) return;
  if (!supabase) {
    console.error('[Cache Write FAILED] Missing service-role Supabase client', cacheConfig.key);
    return;
  }

  const feature = cacheConfig.type || 'trending';
  const isDashTrending = cacheConfig.type === 'trending'
    && typeof cacheConfig.key === 'string'
    && cacheConfig.key.includes('trending_v2');
  if (isDashTrending && !validateTrendingCacheWritePayload(cachePayload)) {
    const len = Array.isArray(cachePayload) ? cachePayload.length : 0;
    console.warn('[TrendCache] Cache write skipped — invalid payload', {
      niche: cacheConfig.niche,
      platform: cacheConfig.platform,
      feature,
      itemCount: len,
    });
    return;
  }

  const now = new Date();
  const ttlHours = Number(cacheConfig.ttlHours) > 0 ? Number(cacheConfig.ttlHours) : 24;
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
  const cacheRow = {
    cache_key: cacheConfig.key,
    niche: cacheConfig.niche?.toLowerCase?.().replace(/\s+/g, '_') || 'small_business',
    platform: cacheConfig.platform || 'instagram',
    feature: cacheConfig.type || 'trending',
    payload: cachePayload,
    result_data: cachePayload,
    generated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    hit_count: 0,
    user_id: cacheAccess?.userId || null,
  };

  const scopedLookupQuery = applyCacheUserScope(
    supabase
      .from('niche_content_cache')
      .select('id')
      .eq('cache_key', cacheConfig.key),
    cacheAccess,
  );

  const { data: existingRow, error: lookupError } = await scopedLookupQuery.maybeSingle();

  if (lookupError && lookupError.code !== 'PGRST116') {
    console.error('[Cache Write FAILED]', lookupError.message, cacheConfig.key);
    return;
  }

  if (existingRow?.id) {
    const { error } = await supabase
      .from('niche_content_cache')
      .update(cacheRow)
      .eq('id', existingRow.id);

    if (error) {
      console.error('[Cache Write FAILED]', error.message, cacheConfig.key);
      return;
    }

    console.log('[Cache Write SUCCESS]', cacheConfig.key);
    return;
  }

  const { error } = await supabase
    .from('niche_content_cache')
    .insert(cacheRow);

  if (error) {
    if (error.code === '23505') {
      const scopedRetryQuery = applyCacheUserScope(
        supabase
          .from('niche_content_cache')
          .update(cacheRow)
          .eq('cache_key', cacheConfig.key),
        cacheAccess,
      );

      const { error: retryError } = await scopedRetryQuery;

      if (retryError) {
        console.error('[Cache Write FAILED]', retryError.message, cacheConfig.key);
        return;
      }

      console.log('[Cache Write SUCCESS]', cacheConfig.key);
      return;
    }

    console.error('[Cache Write FAILED]', error.message, cacheConfig.key);
    return;
  }

  console.log('[Cache Write SUCCESS]', cacheConfig.key);
}

function toTitleCase(value) {
  return String(value || '')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isAllPlatformsSelection(value) {
  const n = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return n === 'all' || n === 'all platforms';
}

function resolveFallbackLocation(value) {
  const location = toTitleCase(value);
  if (!location) return '';

  const normalized = location.toLowerCase();
  if (normalized === 'your city' || normalized === 'global') {
    return '';
  }

  return location;
}

function normalizeDashboardHashtagPayload(items, cacheConfig = {}) {
  if (!Array.isArray(items)) return [];

  const platform = toTitleCase(cacheConfig.platform || 'instagram') || 'Instagram';
  const fallbackVolumeByIndex = ['High', 'High', 'Medium', 'Medium', 'Niche'];

  return items
    .map((item, index) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed) return null;

        return {
          tag: trimmed.startsWith('#') ? trimmed : `#${trimmed.replace(/^#*/, '')}`,
          volume: fallbackVolumeByIndex[index] || 'Medium',
          status: 'Trending',
          platform,
          type: 'hashtag',
        };
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const rawTag = String(
        item.tag
        || item.hashtag
        || item.keyword
        || item.term
        || item.name
        || item.label
        || ''
      ).trim();

      if (!rawTag) {
        return null;
      }

      const normalizedType = String(item.type || item.result_type || item.kind || '').trim().toLowerCase();
      const isSearchKeyword = normalizedType === 'search_keyword' || String(cacheConfig.platform || '').toLowerCase() === 'youtube';

      return {
        ...item,
        tag: isSearchKeyword || rawTag.startsWith('#')
          ? rawTag
          : `#${rawTag.replace(/^#*/, '')}`,
        volume: item.volume || item.estimated_reach || item.reach || fallbackVolumeByIndex[index] || 'Medium',
        status: item.status || item.display_type_label || item.type_label || 'Trending',
        platform: item.platform || platform,
        type: normalizedType || (isSearchKeyword ? 'search_keyword' : 'hashtag'),
      };
    })
    .filter(Boolean);
}

function buildDashboardFallbackData(cacheConfig = {}) {
  const niche = toTitleCase(cacheConfig.niche || 'Small Business');
  const allPlatforms = isAllPlatformsSelection(cacheConfig.platform);
  const platform = toTitleCase(
    (allPlatforms ? 'instagram' : cacheConfig.platform) || 'instagram'
  ) || 'Instagram';
  const platformProse = allPlatforms ? 'all platforms' : platform;
  const topicPlatform = allPlatforms ? 'Cross-platform' : platform;
  const city = resolveFallbackLocation(cacheConfig.city);

  if (cacheConfig.type === 'trending_hashtags_widget') {
    const base = [
      { tag: '#viral', volume: 'High', status: 'Trending', platform, type: 'hashtag' },
      { tag: '#trending', volume: 'High', status: 'Trending', platform, type: 'hashtag' },
      { tag: '#explorepage', volume: 'High', status: 'Trending', platform, type: 'hashtag' },
      { tag: '#reels', volume: 'High', status: 'Trending', platform, type: 'hashtag' },
      { tag: '#fyp', volume: 'High', status: 'Trending', platform, type: 'hashtag' },
      { tag: '#smallbusiness', volume: 'High', status: 'Trending', platform, type: 'hashtag' },
      { tag: '#contentcreator', volume: 'High', status: 'Trending', platform, type: 'hashtag' },
      { tag: '#growthmindset', volume: 'Medium', status: 'Trending', platform, type: 'hashtag' },
    ];
    return base;
  }

  if (cacheConfig.type === 'hashtags') {
    const nicheSlug = String(cacheConfig.niche || 'smallbusiness').replace(/[^a-zA-Z0-9]/g, '');
    const localTags = city
      ? [
          { tag: `#${city.replace(/\s+/g, '')}`, volume: 'Medium', status: 'Local', platform, type: 'hashtag' },
          { tag: `#${city.replace(/\s+/g, '')}${nicheSlug}`, volume: 'Niche', status: 'Local', platform, type: 'hashtag' },
        ]
      : [];

    return [
      { tag: `#${nicheSlug}`, volume: 'High', status: 'Trending', platform, type: 'hashtag' },
      { tag: `#${nicheSlug}tips`, volume: 'Medium', status: 'Niche', platform, type: 'hashtag' },
      { tag: `#${platform.replace(/\s+/g, '')}creator`, volume: 'High', status: 'Trending', platform, type: 'hashtag' },
      { tag: `#${nicheSlug}community`, volume: 'Niche', status: 'Niche', platform, type: 'hashtag' },
      { tag: `#${nicheSlug}ideas`, volume: 'Medium', status: 'Trending', platform, type: 'hashtag' },
      ...localTags,
      { tag: `#${platform.replace(/\s+/g, '')}tips`, volume: 'High', status: 'Trending', platform, type: 'hashtag' },
    ];
  }

  return {
    trends: [
      {
        topic: `${niche} myths people still believe`,
        category: 'Industry Shift',
        why_trending: `Educational explainers about ${niche.toLowerCase()} are performing well on ${platformProse}.`,
        relevance_to_niche: 'Audiences are responding to clear, practical takes they can apply quickly.',
        momentum: 'rising',
        platforms_active: allPlatforms ? ['Multi-platform'] : [platform],
        estimated_lifespan: 'days',
        opportunity_window: 'Plan this week',
      },
      {
        topic: `${topicPlatform} audience questions this week`,
        category: 'Cultural Wave',
        why_trending: 'Localized question-led content is a reliable angle when live trend data is unavailable.',
        relevance_to_niche: allPlatforms
          ? 'Grounding posts in questions audiences are asking across platforms helps your content feel more specific and relevant.'
          : `Grounding posts in current ${platform} audience questions helps your content feel more specific and relevant.`,
        momentum: 'peaking',
        platforms_active: allPlatforms ? ['Multi-platform'] : [platform],
        estimated_lifespan: 'days',
        opportunity_window: 'Act now',
      },
      {
        topic: `Behind-the-scenes ${niche.toLowerCase()} workflows`,
        category: 'Viral Moment',
        why_trending: 'Process content continues to earn attention because it feels practical and authentic.',
        relevance_to_niche: 'Showing your workflow builds trust while giving followers a reason to save the post.',
        momentum: 'rising',
        platforms_active: allPlatforms ? ['Multi-platform'] : [platform],
        estimated_lifespan: '1-2 weeks',
        opportunity_window: 'Plan this week',
      },
    ],
    scan_summary: '',
    last_updated: new Date().toISOString(),
  };
}

async function respondWithDashboardFallback(res, cacheConfig, sourceStatus) {
  const structuredData = buildDashboardFallbackData(cacheConfig);

  if (cacheConfig?.key) {
    const cacheAccess = buildCacheAccessContext();
    await setCachedPerplexityResult(cacheConfig, structuredData, cacheAccess);
  }

  return res.status(200).json({
    success: true,
    content: JSON.stringify(structuredData),
    structuredData,
    citations: [],
    usage: { fallback: true, sourceStatus },
    cached: false,
    generatedAt: new Date().toISOString(),
    fallback: true,
  });
}

export default async function handler(req, res) {
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestedCache = req.body?.cache;
    const requireRealtime = Boolean(req.body?.requireRealtime);

    // If Perplexity key is still missing after VITE_ fallback, try Grok as a last resort
    if (!PERPLEXITY_API_KEY) {
      if (requestedCache?.key || requireRealtime) {
        logError('perplexity.missing_api_key_for_cached_dashboard_request');
        return res.status(500).json({ error: 'Perplexity is required for live research requests.' });
      }

      logError('perplexity.missing_api_key_using_grok_fallback');
      const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
      if (!grokKey) {
        return res.status(500).json({ error: 'AI service not configured' });
      }
      const { messages: fallbackMessages, temperature: fallbackTemp = 0.2 } = req.body;
      if (!fallbackMessages || !Array.isArray(fallbackMessages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }
      devAiProxyLog('perplexity (no key) → xAI Grok fallback request', { model: 'grok-3-fast' });
      const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${grokKey}` },
        body: JSON.stringify({
          model: 'grok-3-fast',
          messages: normalizeMessagesForUpstream(fallbackMessages),
          temperature: Math.min(Math.max(Number(fallbackTemp) || 0.2, 0), 2),
        }),
      });
      devAiProxyLog('perplexity (no key) ← xAI Grok fallback response', { status: grokRes.status, ok: grokRes.ok });
      if (!grokRes.ok) {
        const grokErrText = await grokRes.text();
        console.error('[PERPLEXITY GROK-FALLBACK RAW]', grokRes.status, grokErrText); // TODO: remove after QA
        return res.status(502).json({ error: 'AI service error. Please try again.' });
      }
      const grokData = await grokRes.json();
      return res.status(200).json({ success: true, content: grokData.choices?.[0]?.message?.content || '', citations: [], usage: grokData.usage });
    }

    // Authenticate user
    let userId = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && supabase) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        userId = user.id;
      }
    }

    // SECURITY: Require authentication for AI API access
    // This prevents unauthorized usage of expensive AI API credits
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required to use AI features. Please log in.' 
      });
    }

    // Check rate limit
    const rateLimit = await checkPersistentRateLimit({
      userKey: userId,
      route: 'perplexity',
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      windowSeconds: RATE_LIMIT_WINDOW / 1000,
    });
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetAt);
    
    if (!rateLimit.allowed) {
      logInfo('perplexity.rate_limited', { userId, remaining: rateLimit.remaining });
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait before making more requests.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      });
    }

    // Extract request parameters
    const { messages, temperature = 0.2, cache, web_search_options: webSearchOptions } = req.body;
    const cacheAccess = buildCacheAccessContext(req.body, userId);

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (cache?.key && !cache?.forceRefresh) {
      const cachedResult = await getCachedPerplexityResult(cache, cacheAccess);

      if (cachedResult) {
        const cachedResponse = formatCachedResponse(cachedResult.resultData);
        return res.status(200).json({
          success: true,
          content: cachedResponse.content,
          structuredData: cachedResponse.structuredData,
          citations: [],
          usage: { cached: true },
          cached: true,
          generatedAt: cachedResult.generatedAt,
        });
      }
    }

    const featureKey = resolvePerplexityFeatureKey(req.body);
    const safeModel = resolveModelFromRequest(req.body);

    const bodySearchSize = req.body?.search_context_size;
    const requestedSearchContext = ALLOWED_SEARCH_CONTEXT_SIZES.has(bodySearchSize)
      ? bodySearchSize
      : (ALLOWED_SEARCH_CONTEXT_SIZES.has(webSearchOptions?.search_context_size)
        ? webSearchOptions.search_context_size
        : null);

    let safeSearchContextSize = requestedSearchContext
      || (cache?.type === 'niche_intel' ? 'high' : 'low');

    if (featureKey === 'dashboard_trending') {
      safeSearchContextSize = 'high';
    }

    // Validate temperature range
    const safeTemperature = Math.min(Math.max(Number(temperature) || 0.2, 0), 2);

    // Validate messages array size to prevent abuse
    if (messages.length > 20) {
      return res.status(400).json({ error: 'Too many messages in request (max 20)' });
    }

    if (cache?.key) {
      console.log(`[Cache MISS] Fresh Perplexity fetch:
  niche: ${cache.niche || 'small business'}
  platform: ${cache.platform || 'instagram'}
  city: ${cache.city || 'global'}
  type: ${cache.type || 'trending'}`);
    }

    // Forward request to Perplexity API
    const normalizedMessages = normalizeMessagesForUpstream(messages);
    devAiProxyLog('perplexity → Perplexity request', { model: safeModel, messageCount: normalizedMessages.length });

    console.log('[Perplexity] Request', {
      feature: featureKey,
      model: safeModel,
      niche: cache?.niche,
      platform: cache?.platform,
    });

    const perplexityPayload = {
      model: safeModel,
      messages: normalizedMessages,
      temperature: safeTemperature,
      web_search_options: {
        search_context_size: safeSearchContextSize,
      },
    };

    if (featureKey === 'dashboard_trending') {
      perplexityPayload.search_recency_filter = 'week';
      perplexityPayload.return_citations = false;
    }

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(perplexityPayload),
    });

    devAiProxyLog('perplexity ← Perplexity response', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PERPLEXITY UPSTREAM RAW]', response.status, errorText); // TODO: remove after QA
      logError('perplexity.upstream_error', { status: response.status, errorText });

      if (!requireRealtime && cache?.key && (cache?.type === 'trending' || cache?.type === 'hashtags' || cache?.type === 'trending_hashtags_widget')) {
        return respondWithDashboardFallback(res, cache, response.status);
      }

      return res.status(response.status).json({ 
        error: 'AI service error. Please try again.' 
      });
    }

    const rawSuccessBody = await response.text();
    let data;
    try {
      data = rawSuccessBody ? JSON.parse(rawSuccessBody) : {};
    } catch (parseErr) {
      console.error('[PERPLEXITY UPSTREAM RAW]', 'non-json-200', rawSuccessBody?.slice?.(0, 800)); // TODO: remove after QA
      logError('perplexity.upstream_non_json', { message: parseErr?.message });
      if (!requireRealtime && cache?.key && (cache?.type === 'trending' || cache?.type === 'hashtags' || cache?.type === 'trending_hashtags_widget')) {
        return respondWithDashboardFallback(res, cache, 'non-json');
      }
      return res.status(502).json({ error: 'AI service error. Please try again.' });
    }

    const content = data.choices?.[0]?.message?.content || '';
    console.log('[Perplexity] Response status', {
      status: response.status,
      contentLength: content.length,
    });

    let structuredData = null;
    if (cache?.key && isDashboardTrendingWidgetCache(req.body)) {
      structuredData = extractTrendsFromPerplexityResponse(data);
      if (!Array.isArray(structuredData) || structuredData.length === 0) {
        const fallbackParsed = parseStructuredJson(content);
        if (Array.isArray(fallbackParsed) && fallbackParsed.length > 0) {
          structuredData = fallbackParsed;
        } else if (fallbackParsed && typeof fallbackParsed === 'object') {
          const keys = ['trends', 'topics', 'trending', 'results', 'data', 'items'];
          for (const key of keys) {
            if (Array.isArray(fallbackParsed[key]) && fallbackParsed[key].length > 0) {
              structuredData = fallbackParsed[key];
              break;
            }
          }
        }
        if (!Array.isArray(structuredData) || structuredData.length === 0) {
          console.error('[Perplexity] Parse failed', {
            error: 'empty_or_invalid_trending_array',
            rawSnippet: content?.slice(0, 100),
          });
          structuredData = null;
        }
      }
    } else if (cache?.key) {
      structuredData = parseStructuredJson(content);
    }

    if ((cache?.type === 'hashtags' || cache?.type === 'trending_hashtags_widget') && Array.isArray(structuredData)) {
      structuredData = normalizeDashboardHashtagPayload(structuredData, cache);
    }

    const dashboardArrayPayloadRequired =
      cache?.type === 'hashtags'
      || cache?.type === 'trending_hashtags_widget'
      || (cache?.type === 'trending' && isDashboardTrendingWidgetCache(req.body));

    if (
      cache?.key
      && !requireRealtime
      && dashboardArrayPayloadRequired
      && !Array.isArray(structuredData)
    ) {
      logError('perplexity.unparseable_dashboard_payload', { cacheKey: cache.key });
      return respondWithDashboardFallback(res, cache, 200);
    }

    if (!requireRealtime && (cache?.type === 'hashtags' || cache?.type === 'trending_hashtags_widget') && Array.isArray(structuredData) && structuredData.length === 0) {
      logError('perplexity.empty_dashboard_hashtag_payload', { cacheKey: cache.key });
      return respondWithDashboardFallback(res, cache, 200);
    }

    if (
      !requireRealtime
      && isDashboardTrendingWidgetCache(req.body)
      && Array.isArray(structuredData)
      && structuredData.length === 0
    ) {
      logError('perplexity.empty_dashboard_trending_payload', { cacheKey: cache.key });
      return respondWithDashboardFallback(res, cache, 200);
    }

    const cachePayload = structuredData ?? content;

    let shouldPersistCache =
      cache?.key
      && cachePayload != null
      && cachePayload !== ''
      && (!Array.isArray(cachePayload) || cachePayload.length > 0);

    if (isDashboardTrendingWidgetCache(req.body) && Array.isArray(cachePayload)) {
      shouldPersistCache = validateTrendingCacheWritePayload(cachePayload);
      if (!shouldPersistCache) {
        console.warn('[TrendCache] Cache write skipped — invalid payload', {
          niche: cache.niche,
          platform: cache.platform,
          feature: cache.type || 'trending',
          itemCount: cachePayload.length,
        });
      }
    }

    if (shouldPersistCache) {
      await setCachedPerplexityResult(cache, cachePayload, cacheAccess);
    }
    
    return res.status(200).json({
      success: true,
      content,
      structuredData,
      citations: data.citations || [],
      usage: data.usage,
      cached: false,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    logError('perplexity.proxy_error', { error: error.message });
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.' 
    });
  }
}









