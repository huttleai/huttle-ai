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
 * - 400 invalid model: set GROK_CHAT_MODEL / GROK_MODEL to a current id (see xAI docs); default here is grok-4-1-fast-non-reasoning.
 * - 401 from this proxy (JSON): no Supabase session → pass Authorization: Bearer <access_token> from the logged-in app.
 */

import { createClient } from '@supabase/supabase-js';
import { checkPersistentRateLimit } from '../_utils/persistent-rate-limit.js';
import { logError, logInfo } from '../_utils/observability.js';

// Serverless and local-api-server load .env via dotenv; Vercel uses GROK_API_KEY.
const _rawGrokKey = process.env.GROK_API_KEY;
const GROK_API_KEY =
  typeof _rawGrokKey === 'string' && _rawGrokKey.trim() ? _rawGrokKey.trim() : null;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

/**
 * Default chat model when env is unset. xAI’s current catalog centers on Grok 4.x;
 * legacy aliases like grok-3-latest often return 400 invalid model.
 * @see https://docs.x.ai/docs/models
 */
const DEFAULT_GROK_MODEL = 'grok-4-1-fast-non-reasoning';

function resolveGrokModelId() {
  const fromChat = typeof process.env.GROK_CHAT_MODEL === 'string' ? process.env.GROK_CHAT_MODEL.trim() : '';
  const fromLegacy = typeof process.env.GROK_MODEL === 'string' ? process.env.GROK_MODEL.trim() : '';
  const nonReasoning = typeof process.env.GROK_MODEL_NON_REASONING === 'string' ? process.env.GROK_MODEL_NON_REASONING.trim() : '';
  const fromFast = typeof process.env.GROK_FAST_MODEL === 'string' ? process.env.GROK_FAST_MODEL.trim() : '';
  const raw = fromChat || fromLegacy || nonReasoning || fromFast || DEFAULT_GROK_MODEL;
  return normalizeGrokModelIdAliases(raw);
}

/** Allow only xAI-style model ids from the client; no other semantics in the proxy. */
function sanitizeUpstreamModelId(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s || s.length > 96) return null;
  // xAI ids: grok-4-1-fast-non-reasoning, grok-3, grok-2-vision-1212, etc.
  if (!/^grok-[a-zA-Z0-9._-]+$/.test(s)) return null;
  return s;
}

/**
 * Map common typos / legacy spellings to ids xAI accepts (hyphenated 4-1, not 4.1).
 * @param {string} modelId
 */
function normalizeGrokModelIdAliases(modelId) {
  if (typeof modelId !== 'string') return modelId;
  const t = modelId.trim();
  if (!t) return t;
  const lower = t.toLowerCase();
  const map = new Map([
    ['grok-4.1-fast-reasoning', 'grok-4-1-fast-reasoning'],
    ['grok-4.1-fast-non-reasoning', 'grok-4-1-fast-non-reasoning'],
    ['grok-4.1-fast', 'grok-4-1-fast'],
    ['grok-4-fast-reasoning', 'grok-4-1-fast-reasoning'],
    ['grok-4-fast-non-reasoning', 'grok-4-1-fast-non-reasoning'],
  ]);
  if (map.has(lower)) return map.get(lower);
  if (/^grok-4\.1-/i.test(t)) return t.replace(/^grok-4\.1-/i, 'grok-4-1-');
  if (/grok-4\.1/i.test(t)) return t.replace(/grok-4\.1/gi, 'grok-4-1');
  return t;
}

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

/** CORS for this route only (Vercel serverless; no reliance on VITE_ env). */
function setGrokCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-grok-debug');
}

// Initialize Supabase for auth verification
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

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
  setGrokCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
      model: clientModelRaw,
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

    const clientSanitized = sanitizeUpstreamModelId(clientModelRaw);
    const safeModel = normalizeGrokModelIdAliases(clientSanitized || resolveGrokModelId());
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
        });
      }
    }

    const normalizedMessages = normalizeMessagesForUpstream(messages);
    const serverPreferredModel = normalizeGrokModelIdAliases(resolveGrokModelId());

    /** If env + client agree on one invalid id, still try known-good default last. */
    const modelCandidates = [];
    const pushModel = (id) => {
      const m = normalizeGrokModelIdAliases(typeof id === 'string' ? id.trim() : '');
      if (!m || modelCandidates.includes(m)) return;
      modelCandidates.push(m);
    };
    pushModel(safeModel);
    pushModel(serverPreferredModel);
    pushModel(DEFAULT_GROK_MODEL);

    const runUpstreamOnce = async (modelId) => {
      const isReasoningModel =
        typeof modelId === 'string'
        && modelId.includes('reasoning')
        && !modelId.includes('non-reasoning');
      const upstreamBody = {
        model: modelId,
        messages: normalizedMessages,
      };
      if (!isReasoningModel) {
        upstreamBody.temperature = safeTemperature;
      }
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

    logInfo('grok.upstream_call', { models: modelCandidates, messageCount: normalizedMessages.length });

    let response;
    let lastErrorText = '';

    for (let ci = 0; ci < modelCandidates.length; ci += 1) {
      const modelId = modelCandidates[ci];
      response = await runUpstreamOnce(modelId);
      devAiProxyLog('grok ← xAI response', { model: modelId, status: response.status, ok: response.ok });

      if (response.ok) break;

      lastErrorText = await response.text();
      console.error('[GROK UPSTREAM RAW]', response.status, lastErrorText); // TODO: remove after QA

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
          model: modelId,
        });
        return res.status(502).json({
          error: true,
          code: 'GROK_AUTH_FAILED',
          message:
            'Grok API authentication failed. Verify that GROK_API_KEY is set correctly in Vercel environment variables.',
        });
      }

      if (response.status === 400 && ci < modelCandidates.length - 1) {
        devAiProxyLog('grok upstream 400; trying next model candidate', {
          attempted: modelId,
          next: modelCandidates[ci + 1],
          snippet: summarizeXaiErrorBody(lastErrorText),
        });
        continue;
      }

      logError('grok.upstream_error', {
        status: response.status,
        snippet: (lastErrorText || '').slice(0, 280),
        model: modelId,
      });
      if (debugFullPost) {
        logError('grok.debug_fullpost_upstream', {
          status: response.status,
          snippet: (lastErrorText || '').slice(0, 500),
          model: modelId,
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

    if (!response.ok) {
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

    return res.status(200).json({
      ...payload,
      cached: false,
      generatedAt: new Date().toISOString(),
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









