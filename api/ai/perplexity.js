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

// Initialize Supabase for auth verification
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per user (more restrictive for Perplexity)

export default async function handler(req, res) {
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // If Perplexity key is still missing after VITE_ fallback, try Grok as a last resort
    if (!PERPLEXITY_API_KEY) {
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
    const { messages, temperature = 0.2 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Enforce fastest in-app Perplexity model for cost/performance consistency.
    const safeModel = 'sonar';

    // Validate temperature range
    const safeTemperature = Math.min(Math.max(Number(temperature) || 0.2, 0), 2);

    // Validate messages array size to prevent abuse
    if (messages.length > 20) {
      return res.status(400).json({ error: 'Too many messages in request (max 20)' });
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
    
    return res.status(200).json({
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      citations: data.citations || [],
      usage: data.usage
    });

  } catch (error) {
    logError('perplexity.proxy_error', { error: error.message });
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.' 
    });
  }
}









