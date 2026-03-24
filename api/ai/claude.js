/**
 * Claude AI Proxy Endpoint
 * 
 * SECURITY: This endpoint keeps the Anthropic API key server-side only.
 * All AI requests go through this proxy instead of exposing keys in client-side code.
 * 
 * Required environment variables:
 * - ANTHROPIC_API_KEY: Your Anthropic API key (NOT prefixed with VITE_)
 *
 * DEV NOTE — common failures:
 * - 503 "coming soon" from this proxy: ANTHROPIC_API_KEY missing → add to .env for local-api-server.
 * - 401 from this proxy: valid Supabase Bearer token required (log in via the app).
 * - 4xx from Anthropic upstream: model not enabled or invalid → check Anthropic dashboard; default model is claude-sonnet-4-6.
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from '../_utils/cors.js';
import { checkPersistentRateLimit } from '../_utils/persistent-rate-limit.js';
import { logError, logInfo } from '../_utils/observability.js';

const _rawAnthropicKey = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_KEY =
  typeof _rawAnthropicKey === 'string' && _rawAnthropicKey.trim() ? _rawAnthropicKey.trim() : null;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

if (!ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY not set — Claude features will not work');
}

// Primary Messages API id (alias). Client may still send legacy snapshot strings; we normalize upstream.
// To upgrade: change DEFAULT_CLAUDE_MODEL and aliases below.
const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-6';

const CLAUDE_MODEL_ALIASES = {
  'claude-sonnet-4-6-20250514': DEFAULT_CLAUDE_MODEL,
  'claude-sonnet-4-6': DEFAULT_CLAUDE_MODEL,
};

function resolveUpstreamClaudeModel(requested) {
  const r = typeof requested === 'string' ? requested.trim() : '';
  if (r && CLAUDE_MODEL_ALIASES[r]) return CLAUDE_MODEL_ALIASES[r];
  if (r === DEFAULT_CLAUDE_MODEL) return DEFAULT_CLAUDE_MODEL;
  return DEFAULT_CLAUDE_MODEL;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per user

function devAiProxyLog(message, meta = undefined) {
  if (process.env.NODE_ENV === 'production' && process.env.DEV_AI_PROXY_LOG !== '1') return;
  if (meta !== undefined) console.log(`[DEV AI proxy] ${message}`, meta);
  else console.log(`[DEV AI proxy] ${message}`);
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      logError('claude.missing_api_key');
      return res.status(503).json({ error: 'This feature is coming soon. Check back shortly.' });
    }

    let userId = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && supabase) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required to use AI features. Please log in.' 
      });
    }

    const rateLimit = await checkPersistentRateLimit({
      userKey: userId,
      route: 'claude',
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      windowSeconds: RATE_LIMIT_WINDOW / 1000,
    });
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetAt);
    
    if (!rateLimit.allowed) {
      logInfo('claude.rate_limited', { userId, remaining: rateLimit.remaining });
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait before making more requests.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      });
    }

    const { messages, temperature = 0.7, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const safeModel = resolveUpstreamClaudeModel(model);

    const safeTemperature = Math.min(Math.max(Number(temperature) || 0.7, 0), 2);

    if (messages.length > 20) {
      return res.status(400).json({ error: 'Too many messages in request (max 20)' });
    }

    // Anthropic requires system message as a top-level parameter, not in the messages array
    let systemPrompt = undefined;
    const filteredMessages = messages.filter(msg => {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
        return false;
      }
      return true;
    });

    const requestBody = {
      model: safeModel,
      messages: filteredMessages,
      max_tokens: 4096,
      temperature: safeTemperature,
    };

    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    devAiProxyLog('claude → Anthropic request', { model: safeModel, messageCount: filteredMessages.length });

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody)
    });

    devAiProxyLog('claude ← Anthropic response', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CLAUDE UPSTREAM RAW]', response.status, errorText); // TODO: remove after QA
      logError('claude.upstream_error', { status: response.status, errorText });
      return res.status(response.status).json({ 
        error: 'AI service error. Please try again.' 
      });
    }

    const data = await response.json();
    
    return res.status(200).json({
      success: true,
      content: data.content?.[0]?.text || '',
      usage: data.usage
    });

  } catch (error) {
    logError('claude.proxy_error', { error: error.message });
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.' 
    });
  }
}
