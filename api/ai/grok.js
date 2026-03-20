/**
 * Grok AI Proxy Endpoint
 * 
 * SECURITY: This endpoint keeps the Grok API key server-side only.
 * All AI requests go through this proxy instead of exposing keys in client-side code.
 * 
 * Required environment variables:
 * - GROK_API_KEY: Your Grok API key (NOT prefixed with VITE_)
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from '../_utils/cors.js';
import { checkPersistentRateLimit } from '../_utils/persistent-rate-limit.js';
import { logError, logInfo } from '../_utils/observability.js';

// Serverless and local-api-server load .env via dotenv; Vercel uses GROK_API_KEY.
// Local dev sometimes only sets VITE_GROK_API_KEY — accept it as fallback for the proxy only.
const GROK_API_KEY = process.env.GROK_API_KEY || process.env.VITE_GROK_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

const DEFAULT_MODEL = 'grok-4.1-fast-reasoning';
const ALLOWED_MODELS = new Set([
  'grok-4.1-fast-reasoning',
  'grok-3-fast',
  'grok-3-mini-fast',
]);

// Initialize Supabase for auth verification
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per user

function hasPersonalizationSignals(body = {}) {
  return Boolean(
    body.personalized
    || body.targetAudience
    || body.brandContext
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

async function incrementCacheHitCount(cacheRow) {
  if (!supabase || !cacheRow?.id) return;

  try {
    const nextHitCount = Number.isFinite(cacheRow.hit_count) ? cacheRow.hit_count + 1 : 1;
    await supabase
      .from('niche_content_cache')
      .update({ hit_count: nextHitCount })
      .eq('id', cacheRow.id);
  } catch {
    // Best-effort only.
  }
}

function formatCachedResponse(resultData) {
  if (!resultData || typeof resultData !== 'object') {
    return {
      success: true,
      content: typeof resultData === 'string' ? resultData : '',
      usage: null,
    };
  }

  return {
    success: true,
    content: resultData.content || '',
    usage: resultData.usage || null,
  };
}

async function getCachedGrokResult(cacheConfig, cacheAccess) {
  if (!supabase || !cacheConfig?.key) return null;

  const { data, error } = await applyCacheUserScope(
    supabase
      .from('niche_content_cache')
      .select('*')
      .eq('cache_key', cacheConfig.key),
    cacheAccess,
  ).maybeSingle();

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

async function setCachedGrokResult(cacheConfig, cachePayload, cacheAccess) {
  if (!cacheConfig?.key || cachePayload == null) return;
  if (!supabase) {
    console.error('[Grok Cache Write FAILED] Missing service-role Supabase client', cacheConfig.key);
    return;
  }

  const now = new Date();
  const ttlHours = Number(cacheConfig.ttlHours) > 0 ? Number(cacheConfig.ttlHours) : 24;
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
  const cacheRow = {
    cache_key: cacheConfig.key,
    niche: cacheConfig.niche?.toLowerCase?.().replace(/\s+/g, '_') || 'small_business',
    platform: cacheConfig.platform || 'instagram',
    feature: cacheConfig.type || 'grok',
    payload: cachePayload,
    result_data: cachePayload,
    generated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    hit_count: 0,
    user_id: cacheAccess?.userId || null,
  };

  const { data: existingRow, error: lookupError } = await applyCacheUserScope(
    supabase
      .from('niche_content_cache')
      .select('id')
      .eq('cache_key', cacheConfig.key),
    cacheAccess,
  ).maybeSingle();

  if (lookupError && lookupError.code !== 'PGRST116') {
    console.error('[Grok Cache Write FAILED]', lookupError.message, cacheConfig.key);
    return;
  }

  if (existingRow?.id) {
    const { error } = await supabase
      .from('niche_content_cache')
      .update(cacheRow)
      .eq('id', existingRow.id);

    if (error) {
      console.error('[Grok Cache Write FAILED]', error.message, cacheConfig.key);
      return;
    }

    console.log('[Grok Cache Write SUCCESS]', cacheConfig.key);
    return;
  }

  const { error } = await supabase
    .from('niche_content_cache')
    .insert(cacheRow);

  if (error) {
    if (error.code === '23505') {
      const { error: retryError } = await applyCacheUserScope(
        supabase
          .from('niche_content_cache')
          .update(cacheRow)
          .eq('cache_key', cacheConfig.key),
        cacheAccess,
      );

      if (retryError) {
        console.error('[Grok Cache Write FAILED]', retryError.message, cacheConfig.key);
        return;
      }

      console.log('[Grok Cache Write SUCCESS]', cacheConfig.key);
      return;
    }

    console.error('[Grok Cache Write FAILED]', error.message, cacheConfig.key);
    return;
  }

  console.log('[Grok Cache Write SUCCESS]', cacheConfig.key);
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
    // Verify Grok API key is configured
    if (!GROK_API_KEY) {
      logError('grok.missing_api_key');
      return res.status(500).json({ error: 'AI service not configured' });
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
      route: 'grok',
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      windowSeconds: RATE_LIMIT_WINDOW / 1000,
    });
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetAt);
    
    if (!rateLimit.allowed) {
      logInfo('grok.rate_limited', { userId, remaining: rateLimit.remaining });
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait before making more requests.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      });
    }

    // Extract request parameters
    const {
      messages,
      temperature = 0.7,
      model,
      cache,
      personalized,
      targetAudience,
      brandContext,
      forceCacheRefresh,
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const requestedModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;
    const safeModel = requestedModel;
    const cacheAccess = buildCacheAccessContext({
      personalized,
      targetAudience,
      brandContext,
    }, userId);

    // Validate temperature range
    const safeTemperature = Math.min(Math.max(Number(temperature) || 0.7, 0), 2);

    // Validate messages array size to prevent abuse
    if (messages.length > 20) {
      return res.status(400).json({ error: 'Too many messages in request (max 20)' });
    }

    if (cache?.key && !forceCacheRefresh) {
      const cachedResult = await getCachedGrokResult(cache, cacheAccess);
      if (cachedResult) {
        return res.status(200).json({
          ...formatCachedResponse(cachedResult.resultData),
          cached: true,
          generatedAt: cachedResult.generatedAt,
        });
      }
    }

    // Forward request to Grok API
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: safeModel,
        messages,
        temperature: safeTemperature,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError('grok.upstream_error', { status: response.status, errorText });
      if (response.status === 403) {
        return res.status(502).json({
          error: 'Grok API authentication failed. Verify that GROK_API_KEY is set correctly in Vercel environment variables.'
        });
      }
      if (response.status === 400) {
        return res.status(502).json({
          error: 'Grok API rejected the request. The model name may be invalid or the request was malformed.'
        });
      }
      return res.status(502).json({ 
        error: 'AI service error. Please try again.' 
      });
    }

    const data = await response.json();
    
    const payload = {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage,
    };

    if (cache?.key) {
      await setCachedGrokResult(cache, payload, cacheAccess);
    }

    return res.status(200).json({
      ...payload,
      cached: false,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    logError('grok.proxy_error', { error: error.message });
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.' 
    });
  }
}









