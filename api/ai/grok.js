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

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

// Initialize Supabase for auth verification
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Rate limiting: Simple in-memory store (use Redis in production for multi-instance)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per user

function checkRateLimit(userId) {
  const now = Date.now();
  const userKey = userId || 'anonymous';
  const userData = rateLimitStore.get(userKey) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  
  if (now > userData.resetAt) {
    userData.count = 0;
    userData.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  userData.count++;
  rateLimitStore.set(userKey, userData);
  
  return {
    allowed: userData.count <= RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - userData.count),
    resetAt: userData.resetAt
  };
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
      console.error('GROK_API_KEY not configured');
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

    // For authenticated requests, we can proceed
    // For unauthenticated, we still allow but with stricter rate limits
    if (!userId) {
      // Use IP as fallback for rate limiting
      userId = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'anonymous';
    }

    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetAt);
    
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait before making more requests.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      });
    }

    // Extract request parameters
    const { messages, temperature = 0.7, model = 'grok-4-1-fast-reasoning' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Forward request to Grok API
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'AI service error. Please try again.' 
      });
    }

    const data = await response.json();
    
    return res.status(200).json({
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage
    });

  } catch (error) {
    console.error('Grok proxy error:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.' 
    });
  }
}




