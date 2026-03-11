/**
 * Perplexity AI Proxy Endpoint
 * 
 * SECURITY: This endpoint keeps the Perplexity API key server-side only.
 * All AI requests go through this proxy instead of exposing keys in client-side code.
 * 
 * Required environment variables:
 * - PERPLEXITY_API_KEY: Your Perplexity API key (NOT prefixed with VITE_)
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from '../_utils/cors.js';
import { checkPersistentRateLimit } from '../_utils/persistent-rate-limit.js';
import { logError, logInfo } from '../_utils/observability.js';

const PERPLEXITY_API_KEY =
  process.env.PERPLEXITY_API_KEY ||
  process.env.VITE_PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Model: llama-3.1-sonar-small-128k-online | Updated: March 2026
// To upgrade: change the model string below and update .env.example
const MODEL = "llama-3.1-sonar-small-128k-online";

// Initialize Supabase for auth verification
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per user (more restrictive for Perplexity)

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
      .select('id, payload, generated_at, expires_at, hit_count')
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
    resultData: data.payload,
    generatedAt: data.generated_at,
  };
}

async function setCachedPerplexityResult(cacheConfig, cachePayload, cacheAccess) {
  if (!cacheConfig?.key || cachePayload == null) return;
  if (!supabase) {
    console.error('[Cache Write FAILED] Missing service-role Supabase client', cacheConfig.key);
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
  const platform = toTitleCase(cacheConfig.platform || 'instagram') || 'Instagram';
  const city = toTitleCase(cacheConfig.city || 'your city') || 'your city';

  if (cacheConfig.type === 'hashtags') {
    const nicheSlug = String(cacheConfig.niche || 'smallbusiness').replace(/[^a-zA-Z0-9]/g, '');

    return [
      { tag: `#${nicheSlug}`, volume: 'High', status: 'Trending', platform, type: 'hashtag' },
      { tag: `#${nicheSlug}tips`, volume: 'Medium', status: 'Niche', platform, type: 'hashtag' },
      { tag: `#${city.replace(/\s+/g, '')}`, volume: 'Medium', status: 'Local', platform, type: 'hashtag' },
      { tag: `#${platform.replace(/\s+/g, '')}creator`, volume: 'High', status: 'Trending', platform, type: 'hashtag' },
      { tag: `#${nicheSlug}community`, volume: 'Niche', status: 'Niche', platform, type: 'hashtag' },
      { tag: `#${nicheSlug}ideas`, volume: 'Medium', status: 'Trending', platform, type: 'hashtag' },
      { tag: `#${city.replace(/\s+/g, '')}${nicheSlug}`, volume: 'Niche', status: 'Local', platform, type: 'hashtag' },
      { tag: `#${platform.replace(/\s+/g, '')}tips`, volume: 'High', status: 'Trending', platform, type: 'hashtag' },
    ];
  }

  return [
    {
      title: `${niche} myths people still believe`,
      summary: `Educational explainers about ${niche.toLowerCase()} are performing well on ${platform}.`,
      why_it_matters: `Audiences in ${city} are responding to clear, practical takes they can apply quickly.`,
      momentum: 'rising',
      platform,
      content_idea: `Create a fast ${platform} post debunking one common ${niche.toLowerCase()} misconception.`,
    },
    {
      title: `${city} audience questions this week`,
      summary: `Localized question-led content is a reliable angle when live trend data is unavailable.`,
      why_it_matters: `Grounding posts in ${city} helps your content feel more specific and relevant.`,
      momentum: 'steady',
      platform,
      content_idea: `Answer one question your ${city} audience keeps asking about ${niche.toLowerCase()}.`,
    },
    {
      title: `Behind-the-scenes ${niche.toLowerCase()} workflows`,
      summary: `Process content continues to earn attention because it feels practical and authentic.`,
      why_it_matters: `Showing your workflow builds trust while giving followers a reason to save the post.`,
      momentum: 'rising',
      platform,
      content_idea: `Break your workflow into 3 quick steps and turn each step into a content beat.`,
    },
  ];
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

    // If Perplexity key is still missing after VITE_ fallback, try Grok as a last resort
    if (!PERPLEXITY_API_KEY) {
      if (requestedCache?.key) {
        logError('perplexity.missing_api_key_for_cached_dashboard_request');
        return res.status(500).json({ error: 'Perplexity is required for live dashboard trend data.' });
      }

      logError('perplexity.missing_api_key_using_grok_fallback');
      const grokKey = process.env.GROK_API_KEY || process.env.VITE_GROK_API_KEY || process.env.XAI_API_KEY;
      if (!grokKey) {
        return res.status(500).json({ error: 'AI service not configured' });
      }
      const { messages: fallbackMessages, temperature: fallbackTemp = 0.2 } = req.body;
      if (!fallbackMessages || !Array.isArray(fallbackMessages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }
      const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${grokKey}` },
        body: JSON.stringify({ model: 'grok-3-fast', messages: fallbackMessages, temperature: Math.min(Math.max(Number(fallbackTemp) || 0.2, 0), 2) })
      });
      if (!grokRes.ok) {
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
    const { messages, temperature = 0.2, cache } = req.body;
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

    // Enforce fastest in-app Perplexity model for cost/performance consistency.
    const safeModel = 'sonar';

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
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: safeModel,
        messages,
        temperature: safeTemperature,
        web_search_options: {
          search_context_size: 'low'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError('perplexity.upstream_error', { status: response.status, errorText });

      if (cache?.key && (cache?.type === 'trending' || cache?.type === 'hashtags')) {
        return respondWithDashboardFallback(res, cache, response.status);
      }

      return res.status(response.status).json({ 
        error: 'AI service error. Please try again.' 
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    let structuredData = cache?.key ? parseStructuredJson(content) : null;

    if (cache?.type === 'hashtags' && Array.isArray(structuredData)) {
      structuredData = normalizeDashboardHashtagPayload(structuredData, cache);
    }

    if (
      cache?.key
      && (cache?.type === 'trending' || cache?.type === 'hashtags')
      && !Array.isArray(structuredData)
    ) {
      logError('perplexity.unparseable_dashboard_payload', { cacheKey: cache.key });
      return respondWithDashboardFallback(res, cache, 200);
    }

    if (cache?.type === 'hashtags' && Array.isArray(structuredData) && structuredData.length === 0) {
      logError('perplexity.empty_dashboard_hashtag_payload', { cacheKey: cache.key });
      return respondWithDashboardFallback(res, cache, 200);
    }

    const cachePayload = structuredData ?? content;

    if (cache?.key && cachePayload) {
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









