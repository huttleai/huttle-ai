/**
 * Viral Blueprint Webhook Proxy
 * 
 * Serverless function that proxies Viral Blueprint requests to n8n webhook.
 * This avoids CORS issues by making the request server-side.
 * 
 * Environment Variables Required:
 * - VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK: n8n webhook endpoint for viral blueprint
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';

// SECURITY: No hardcoded fallback - must be configured via environment variable
const N8N_WEBHOOK_URL = process.env.N8N_VIRAL_BLUEPRINT_WEBHOOK || process.env.VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK;

// Initialize Supabase for auth verification
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

/**
 * Main handler function
 */
export default async function handler(req, res) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight request
  if (handlePreflight(req, res)) return;

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Require authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !supabase) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid authentication' });
  }

  // Validate environment variables
  if (!N8N_WEBHOOK_URL) {
    console.error('[viral-blueprint-proxy] N8N webhook URL not configured', { requestId });
    return res.status(500).json({ 
      error: 'Service not configured. Please try again later.',
      requestId
    });
  }

  try {

    // Forward request to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(req.body),
      // Add timeout for long-running workflows
      signal: AbortSignal.timeout(120000), // 120 seconds
    });

    console.log('[viral-blueprint-proxy] n8n response status:', response.status, response.statusText, { requestId });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error('[viral-blueprint-proxy] n8n error response:', errorText, { requestId });
      return res.status(response.status).json({ 
        error: `n8n webhook error: ${response.status} ${response.statusText}`,
        details: errorText.substring(0, 200),
        requestId
      });
    }

    // Parse and return the response
    const data = await response.json().catch(() => ({}));
    console.log('[viral-blueprint-proxy] Successfully received response from n8n', { requestId });
    console.log('[viral-blueprint-proxy] Response keys:', Object.keys(data), { requestId });
    
    return res.status(200).json({ ...data, requestId });

  } catch (error) {
    console.error('[viral-blueprint-proxy] Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Handle timeout errors
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return res.status(504).json({ 
        error: 'Request timeout: n8n workflow took longer than 120 seconds',
        requestId
      });
    }

    // Handle network errors
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      return res.status(502).json({ 
        error: 'Unable to reach n8n webhook. Please check the webhook URL.',
        requestId
      });
    }

    // SECURITY: Don't expose internal error details to client
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.',
      requestId
    });
  }
}



