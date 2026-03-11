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

async function getCachedPerplexityResult(cacheConfig) {
  if (!supabase || !cacheConfig?.key) return null;

  const { data, error } = await supabase
    .from('niche_content_cache')
    .select('id, payload, generated_at, expires_at, hit_count')
    .eq('cache_key', cacheConfig.key)
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

async function setCachedPerplexityResult(cacheConfig, structuredData) {
  if (!cacheConfig?.key || !structuredData) return;
  if (!supabase) {
    console.error('[Cache Write FAILED] Missing service-role Supabase client', cacheConfig.key);
    return;
  }

  const now = new Date();
  const ttlHours = Number(cacheConfig.ttlHours) > 0 ? Number(cacheConfig.ttlHours) : 24;
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  const { error } = await supabase
    .from('niche_content_cache')
    .upsert({
      cache_key: cacheConfig.key,
      niche: cacheConfig.niche?.toLowerCase?.().replace(/\s+/g, '_') || 'small_business',
      platform: cacheConfig.platform || 'instagram',
      feature: cacheConfig.type || 'trending',
      payload: structuredData,
      generated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      hit_count: 0,
    }, {
      onConflict: 'cache_key',
    });

  if (error) {
    console.error('[Cache Write FAILED]', error.message, cacheConfig.key);
    return;
  }

  console.log('[Cache Write SUCCESS]', cacheConfig.key);
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

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (cache?.key && !cache?.forceRefresh) {
      const cachedResult = await getCachedPerplexityResult(cache);

      if (cachedResult) {
        return res.status(200).json({
          success: true,
          content: JSON.stringify(cachedResult.resultData),
          structuredData: cachedResult.resultData,
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
      return res.status(response.status).json({ 
        error: 'AI service error. Please try again.' 
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const structuredData = cache?.key ? parseStructuredJson(content) : null;

    if (cache?.key && structuredData) {
      await setCachedPerplexityResult(cache, structuredData);
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









