/**
 * Ignite Engine Webhook Proxy
 *
 * Serverless function that proxies Ignite Engine requests to n8n webhook.
 * Auth, then credit/tier gate + reservation, then forward. Provider API keys
 * stay in n8n credentials — this proxy never forwards GROK_API_KEY.
 *
 * Environment Variables Required:
 * - N8N_IGNITE_ENGINE_WEBHOOK: n8n webhook endpoint for Ignite Engine
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import { logInfo, logError } from './_utils/observability.js';
import { assertCanGenerate, sendUsageGateRejection, reserveFeatureUsage } from './_utils/usageGate.js';
import { buildIgniteN8nPayload } from '../src/utils/igniteEngineN8nPayload.js';

const N8N_WEBHOOK_URL =
  process.env.N8N_IGNITE_ENGINE_WEBHOOK ||
  process.env.VITE_N8N_IGNITE_ENGINE_WEBHOOK;

const IGNITE_FEATURE_KEY = 'igniteEngine';
const RESERVATION_SOURCE = 'ignite-engine-proxy';
const PROVIDER_SECRET_KEYS = ['grokApiKey', 'GROK_API_KEY', 'grok_api_key'];

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const ALLOWED_PLATFORMS = new Set(['TikTok', 'Instagram', 'Facebook', 'X', 'YouTube']);

const PLATFORM_ALIASES = {
  instagram: 'Instagram',
  ig: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  fb: 'Facebook',
  twitter: 'X',
  x: 'X',
  youtube: 'YouTube',
  yt: 'YouTube',
};

function normalizeWebhookPlatform(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (ALLOWED_PLATFORMS.has(s)) return s;
  const alias = PLATFORM_ALIASES[String(s).toLowerCase()];
  return alias && ALLOWED_PLATFORMS.has(alias) ? alias : null;
}

/**
 * Drop provider secrets the client (or a scripted caller) might have stuffed
 * into the webhook body. n8n must use its own credential store.
 */
export function stripIgniteProviderSecrets(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const next = { ...payload };
  for (const key of PROVIDER_SECRET_KEYS) {
    delete next[key];
  }
  return next;
}

function parseRequestBody(req) {
  const b = req.body;
  if (b == null) return {};
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return typeof b === 'object' ? b : {};
}

function hasUsefulBlueprintContent(payload) {
  if (!payload) return false;
  if (typeof payload === 'string') return payload.trim().length > 0;
  if (Array.isArray(payload)) return payload.length > 0;
  if (typeof payload !== 'object') return false;

  const meaningfulKeys = [
    'blueprint',
    'sections',
    'viral_score',
    'viral_score_breakdown',
    'directors_cut',
    'directorsCut',
    'slide_breakdown',
    'tweet_breakdown',
    'frame_breakdown',
    'caption_structure',
    'hooks',
    'content_script',
    'seo_keywords',
    'suggested_hashtags',
  ];

  if (meaningfulKeys.some((key) => payload[key])) return true;

  return ['data', 'result', 'output', 'response', 'payload'].some((key) =>
    hasUsefulBlueprintContent(payload[key])
  );
}

export default async function handler(req, res) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  setCorsHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !supabase) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid authentication' });
  }

  if (!N8N_WEBHOOK_URL) {
    logError('ignite_proxy.missing_webhook_url', { requestId });
    return res.status(500).json({ error: 'Service not configured. Please try again later.', requestId });
  }

  let creditsReserved = false;

  try {
    const rawBody = parseRequestBody(req);
    const { topic, platform } = rawBody;

    if (!platform || !topic) {
      return res.status(400).json({ error: 'Missing required fields: platform, topic', requestId });
    }
    const canonicalPlatform = normalizeWebhookPlatform(platform);
    if (!canonicalPlatform) {
      return res.status(400).json({ error: 'Unsupported platform value', requestId });
    }

    const usageGate = await assertCanGenerate(supabase, {
      userId: user.id,
      featureKey: IGNITE_FEATURE_KEY,
    });
    if (!usageGate.ok) {
      return sendUsageGateRejection(res, usageGate);
    }

    try {
      await reserveFeatureUsage(supabase, {
        userId: user.id,
        featureKey: IGNITE_FEATURE_KEY,
        reservationSource: RESERVATION_SOURCE,
        reservationKey: requestId,
        metadata: {
          platform: canonicalPlatform,
          topic: String(topic).slice(0, 200),
        },
      });
      creditsReserved = true;
    } catch (reservationError) {
      logError('ignite_proxy.usage_reservation_failed', {
        requestId,
        userId: user.id,
        message: reservationError.message,
        code: reservationError.code,
      });
      return res.status(500).json({ error: 'Failed to reserve usage', requestId });
    }

    const mergedIn = stripIgniteProviderSecrets({ ...rawBody, platform: canonicalPlatform });
    const canonical = buildIgniteN8nPayload(mergedIn);
    const n8nPayload = stripIgniteProviderSecrets({ ...mergedIn, ...canonical });

    logInfo('ignite_proxy.n8n_outbound', {
      requestId,
      userId: user.id,
      platform: n8nPayload.platform,
      user_type: n8nPayload.user_type,
      profile_type: n8nPayload.profile_type,
      topicLen: String(n8nPayload.topic || '').length,
      keys: Object.keys(n8nPayload).sort(),
      hashtag_max: n8nPayload.hashtag_max,
    });

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(n8nPayload),
      signal: AbortSignal.timeout(120000),
    });

    const rawResponse = await response.text().catch(() => '');

    let data = null;
    if (rawResponse) {
      try {
        data = JSON.parse(rawResponse);
      } catch {
        data = null;
      }
    }

    logInfo('ignite_proxy.n8n_inbound', {
      requestId,
      ok: response.ok,
      status: response.status,
      bytes: rawResponse.length,
      parsed: data != null,
      hasUsefulBlueprint: hasUsefulBlueprintContent(data || rawResponse),
    });

    if (!response.ok) {
      const errorText = rawResponse || 'No error details';
      logError('ignite_proxy.n8n_http_error', {
        requestId,
        status: response.status,
        snippet: errorText.slice(0, 400),
      });
      return res.status(response.status).json({
        error: `n8n webhook error: ${response.status} ${response.statusText}`,
        details: errorText.substring(0, 200),
        creditsReserved: true,
        requestId,
      });
    }

    if (Array.isArray(data) && data.length > 0) {
      data = data[0];
    }

    if (!hasUsefulBlueprintContent(data || rawResponse)) {
      logError('ignite_proxy.n8n_empty_blueprint', { requestId });
      return res.status(502).json({
        error: 'n8n response missing blueprint content.',
        creditsReserved: true,
        requestId,
      });
    }

    if (data && typeof data === 'object') {
      return res.status(200).json({ ...data, creditsReserved: true, requestId });
    }

    return res.status(200).json({ content: rawResponse, creditsReserved: true, requestId });
  } catch (error) {
    logError('ignite_proxy.handler_error', {
      requestId,
      name: error.name,
      message: error.message,
      stack: error.stack?.slice?.(0, 800),
    });

    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return res.status(504).json({
        error: 'Request timeout: n8n workflow took longer than 120 seconds',
        ...(creditsReserved ? { creditsReserved: true } : {}),
        requestId,
      });
    }

    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      return res.status(502).json({
        error: 'Unable to reach n8n webhook.',
        ...(creditsReserved ? { creditsReserved: true } : {}),
        requestId,
      });
    }

    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
      ...(creditsReserved ? { creditsReserved: true } : {}),
      requestId,
    });
  }
}
