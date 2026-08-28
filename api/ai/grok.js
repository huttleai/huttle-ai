/**
 * Grok AI Proxy Endpoint
 * 
 * SECURITY: This endpoint keeps the Grok API key server-side only.
 * All AI requests go through this proxy instead of exposing keys in client-side code.
 * 
 * Required environment variables:
 * - GROK_API_KEY: Your Grok API key (NOT prefixed with VITE_)
 *
 * DEV NOTE — common failures:
 * - 401/403 from xAI: wrong or expired GROK_API_KEY → rotate in .env (local-api-server loads via dotenv) or Vercel env.
 * - 400 invalid model: the model id lives in src/config/grokConfig.js (GROK_MODEL) — the only place it may be changed.
 * - 401 from this proxy (JSON): no Supabase session → pass Authorization: Bearer <access_token> from the logged-in app.
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from '../_utils/cors.js';
import { checkPersistentRateLimit } from '../_utils/persistent-rate-limit.js';
import { logError, logInfo } from '../_utils/observability.js';
import { GROK_MODEL } from '../../src/config/grokConfig.js';
import {
  assertCanGenerate,
  sendUsageGateRejection,
  resolveRouteBillingFeature,
  recordGenerationUsage,
} from '../_utils/usageGate.js';

// Serverless and local-api-server load .env via dotenv; Vercel uses GROK_API_KEY.
const _rawGrokKey = process.env.GROK_API_KEY;
const GROK_API_KEY =
  typeof _rawGrokKey === 'string' && _rawGrokKey.trim() ? _rawGrokKey.trim() : null;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

const VALID_REASONING_EFFORTS = new Set(['none', 'low', 'medium', 'high']);

function summarizeXaiErrorBody(errorText) {
  const raw = String(errorText || '').trim();
  if (!raw) return '(empty response body)';
  try {
    const j = JSON.parse(raw);
    const m = j?.error?.message ?? j?.message ?? j?.detail;
    if (typeof m === 'string' && m.trim()) return m.trim().slice(0, 600);
    return JSON.stringify(j).slice(0, 600);
  } catch {
    return raw.slice(0, 600);
  }
}

function exposeGrokUpstreamErrors() {
  return process.env.NODE_ENV !== 'production' || process.env.GROK_VERBOSE_ERRORS === '1';
}

/** Strip client message objects to OpenAI/xAI-compatible { role, content } only. */
function normalizeMessagesForUpstream(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map((m) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
  }));
}

// Initialize Supabase for auth verification
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per user

function devAiProxyLog(message, meta = undefined) {
  if (process.env.NODE_ENV === 'production' && process.env.DEV_AI_PROXY_LOG !== '1') return;
  if (meta !== undefined) console.log(`[DEV AI proxy] ${message}`, meta);
  else console.log(`[DEV AI proxy] ${message}`);
}

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
    // Prod schema truth: niche_content_cache has generated_date and cache_date
    // (no generated_at, and created_at is unconfirmed — do not depend on it).
    generatedAt: data.generated_date || data.cache_date,
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
  // Prod schema truth (verified in live DB): niche_content_cache columns are
  // cache_key, niche, platform, feature, user_type, result_data, cache_date,
  // generated_date, expires_at, payload, user_id, hit_count. There is NO
  // generated_at, and created_at is unconfirmed — never write or read those.
  const cacheDateKey = now.toISOString().split('T')[0];
  const cacheRow = {
    cache_key: cacheConfig.key,
    niche: cacheConfig.niche?.toLowerCase?.().replace(/\s+/g, '_') || 'small_business',
    platform: cacheConfig.platform || 'instagram',
    feature: cacheConfig.type || 'grok',
    cache_date: cacheDateKey,
    generated_date: cacheDateKey,
    payload: cachePayload,
    result_data: cachePayload,
    expires_at: expiresAt.toISOString(),
    hit_count: 0,
    user_id: cacheAccess?.userId || null,
  };

  const VALID_CACHE_COLUMNS = new Set([
    'id', 'cache_key', 'feature', 'niche', 'platform',
    'user_type', 'cache_date', 'generated_date', 'payload', 'hit_count',
    'expires_at', 'user_id', 'result_data',
  ]);

  const invalidFields = Object.keys(cacheRow).filter(
    (k) => !VALID_CACHE_COLUMNS.has(k),
  );

  if (invalidFields.length > 0) {
    console.error(
      '[NicheCache] WRITE ABORTED — payload contains invalid columns:',
      invalidFields,
      '| These columns do not exist in niche_content_cache and will',
      'cause a 400. Remove them from the payload.',
    );
    return null;
  }

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

      return;
    }

    console.error('[Grok Cache Write FAILED]', error.message, cacheConfig.key);
    return;
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' });
  }

  try {
    // Verify Grok API key is configured (never accept client-supplied keys or model ids)
    if (!GROK_API_KEY) {
      logError('grok.missing_api_key', { detail: 'GROK_API_KEY missing or whitespace-only' });
      return res.status(503).json({
        error: true,
        code: 'GROK_AUTH_FAILED',
        message: 'AI service not configured. Set GROK_API_KEY in the server environment (e.g. Vercel).',
      });
    }

    if (!supabase) {
      logError('grok.missing_supabase', { detail: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured' });
      return res.status(503).json({
        error: true,
        code: 'AUTH_SERVICE_MISCONFIGURED',
        message: 'Authentication service not configured on the server.',
      });
    }

    // Authenticate user
    let userId = null;
    const authHeader = req.headers.authorization;
    const bearerMatch =
      typeof authHeader === 'string' ? /^Bearer\s+(\S+)/i.exec(authHeader.trim()) : null;
    const token = bearerMatch ? bearerMatch[1] : null;

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        userId = user.id;
      }
    }

    // SECURITY: Require authentication for AI API access
    // This prevents unauthorized usage of expensive AI API credits
    if (!userId) {
      return res.status(401).json({ 
        error: true, 
        message: 'Authentication required to use AI features. Please log in.' 
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
        error: true,
        message: 'Rate limit exceeded. Please wait before making more requests.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      });
    }

    const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
    const billingFeature = resolveRouteBillingFeature('grok', req);
    const usageGate = await assertCanGenerate(supabase, {
      userId,
      featureKey: billingFeature,
    });
    if (!usageGate.ok) {
      return sendUsageGateRejection(res, usageGate, { grokStyle: true });
    }
    const debugStep =
      typeof rawBody.grok_debug_fullpost_step === 'string'
        ? rawBody.grok_debug_fullpost_step.trim().slice(0, 64)
        : '';
    const requestPath = typeof req.url === 'string' ? req.url : '';
    const fpbGrokHookDevLogEnabled =
      process.env.NODE_ENV !== 'production' || process.env.DEV_AI_PROXY_LOG === '1';
    const isFpbGrokHookRequest =
      rawBody.grok_debug_fullpost === true
      && (debugStep === 'hooks' || debugStep === '');
    const debugFullPost =
      String(req.headers['x-grok-debug'] || '').toLowerCase() === 'fullpost'
      || rawBody.grok_debug_fullpost === true
      || Boolean(debugStep);

    if (debugFullPost) {
      logInfo('grok.debug_fullpost_request', {
        hasModel: Boolean(rawBody.model),
        clientModelRaw: rawBody.model,
        messageCount: Array.isArray(rawBody.messages) ? rawBody.messages.length : 0,
        hasMaxTokens: typeof rawBody.max_tokens !== 'undefined',
        step: debugStep || undefined,
      });
    }

    // Extract request parameters
    const {
      messages,
      temperature = 0.7,
      max_tokens,
      cache,
      personalized,
      targetAudience,
      brandContext,
      forceCacheRefresh,
      reasoning_effort: reasoningEffortRaw,
    } = rawBody;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: true, message: 'Messages array is required', code: 'VALIDATION' });
    }

    for (let i = 0; i < messages.length; i += 1) {
      const m = messages[i];
      if (!m || typeof m !== 'object') {
        return res.status(400).json({ error: true, message: `Invalid message at index ${i}`, code: 'VALIDATION' });
      }
      const role = m.role;
      if (!['system', 'user', 'assistant'].includes(role)) {
        return res.status(400).json({ error: true, message: `Invalid role at message ${i}`, code: 'VALIDATION' });
      }
      const content = m.content;
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: true, message: `Message ${i} must have non-empty string content`, code: 'VALIDATION' });
      }
      if (content.length > 120000) {
        return res.status(400).json({ error: true, message: 'Request payload too large', code: 'VALIDATION' });
      }
    }

    // Model is server-owned (src/config/grokConfig.js); client model strings are ignored.
    const safeReasoningEffort = VALID_REASONING_EFFORTS.has(reasoningEffortRaw)
      ? reasoningEffortRaw
      : 'none';
    const cacheAccess = buildCacheAccessContext({
      personalized,
      targetAudience,
      brandContext,
    }, userId);

    // Validate temperature range
    const safeTemperature = Math.min(Math.max(Number(temperature) || 0.7, 0), 2);

    // Validate messages array size to prevent abuse
    if (messages.length > 20) {
      return res.status(400).json({ error: true, message: 'Too many messages in request (max 20)' });
    }

    if (cache?.key && !forceCacheRefresh) {
      const cachedResult = await getCachedGrokResult(cache, cacheAccess);
      if (cachedResult) {
        return res.status(200).json({
          ...formatCachedResponse(cachedResult.resultData),
          cached: true,
          generatedAt: cachedResult.generatedAt,
          billing: { feature: billingFeature, creditsCharged: 0 },
        });
      }
    }

    const normalizedMessages = normalizeMessagesForUpstream(messages);

    const runUpstreamOnce = async (modelId) => {
      const upstreamBody = {
        model: modelId,
        messages: normalizedMessages,
        temperature: safeTemperature,
        reasoning_effort: safeReasoningEffort,
      };
      // xAI deprecates max_tokens in favor of max_completion_tokens for /v1/chat/completions
      if (typeof max_tokens === 'number' && max_tokens > 0 && max_tokens <= 8192) {
        upstreamBody.max_completion_tokens = max_tokens;
      }
      if (fpbGrokHookDevLogEnabled && isFpbGrokHookRequest) {
        console.log(
          '[FPB Grok Hook] path=%s route=fullpost_step2_hooks → xAI request body: %s',
          requestPath || '/api/ai/grok',
          JSON.stringify(upstreamBody),
        );
      }
      devAiProxyLog('grok → xAI request', { model: modelId, messageCount: normalizedMessages.length });
      return fetch(GROK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_API_KEY}`,
        },
        body: JSON.stringify(upstreamBody),
      });
    };

    logInfo('grok.upstream_call', { models: [GROK_MODEL], messageCount: normalizedMessages.length });

    const response = await runUpstreamOnce(GROK_MODEL);
    devAiProxyLog('grok ← xAI response', { model: GROK_MODEL, status: response.status, ok: response.ok });

    if (!response.ok) {
      const lastErrorText = await response.text();

      if (fpbGrokHookDevLogEnabled && isFpbGrokHookRequest && response.status >= 400) {
        console.error(
          '[FPB Grok Hook] xAI error status=%s body=%s',
          response.status,
          lastErrorText,
        );
      }

      if (response.status === 401 || response.status === 403) {
        logError('grok.upstream_error', {
          status: response.status,
          snippet: (lastErrorText || '').slice(0, 280),
          model: GROK_MODEL,
        });
        return res.status(502).json({
          error: true,
          code: 'GROK_AUTH_FAILED',
          message:
            'Grok API authentication failed. Verify that GROK_API_KEY is set correctly in Vercel environment variables.',
        });
      }

      logError('grok.upstream_error', {
        status: response.status,
        snippet: (lastErrorText || '').slice(0, 280),
        model: GROK_MODEL,
      });
      if (debugFullPost) {
        logError('grok.debug_fullpost_upstream', {
          status: response.status,
          snippet: (lastErrorText || '').slice(0, 500),
          model: GROK_MODEL,
        });
      }
      if (response.status === 400) {
        const upstreamDetail = summarizeXaiErrorBody(lastErrorText);
        const verbose = exposeGrokUpstreamErrors();
        return res.status(502).json({
          error: true,
          code: 'GROK_UPSTREAM_INVALID',
          message: verbose
            ? `Grok API rejected the request: ${upstreamDetail}`
            : 'Grok API rejected the request. The model name may be invalid or the request was malformed.',
          ...(verbose ? { upstreamDetail } : {}),
        });
      }
      return res.status(502).json({
        error: true,
        code: 'GROK_UPSTREAM_ERROR',
        message: 'AI service error. Please try again.',
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

    const usageRecord = await recordGenerationUsage(supabase, {
      userId,
      featureKey: billingFeature,
      subscription: usageGate.subscription,
      metadata: { route: 'grok' },
    });
    if (!usageRecord.ok) {
      logError('grok.usage_record_failed', { userId, error: usageRecord.error });
    }

    return res.status(200).json({
      ...payload,
      cached: false,
      generatedAt: new Date().toISOString(),
      billing: {
        feature: billingFeature,
        creditsCharged: usageRecord.creditsLogged,
      },
    });

  } catch (error) {
    logError('grok.proxy_error', { error: error.message });
    return res.status(500).json({
      error: true,
      code: 'GROK_PROXY_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    });
  }
}









