/**
 * Viral Blueprint Webhook Proxy
 * 
 * Serverless function that proxies Viral Blueprint requests to n8n webhook.
 * This avoids CORS issues by making the request server-side.
 * 
 * Environment Variables Required:
 * - VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK: n8n webhook endpoint for viral blueprint
 */

import { setCorsHeaders, handlePreflight } from './_utils/cors.js';

// SECURITY: No hardcoded fallback - must be configured via environment variable
const N8N_WEBHOOK_URL = process.env.N8N_VIRAL_BLUEPRINT_WEBHOOK;

/**
 * Main handler function
 */
export default async function handler(req, res) {
  console.log('[viral-blueprint-proxy] API route hit');
  console.log('[viral-blueprint-proxy] Request method:', req.method);
  
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight request
  if (handlePreflight(req, res)) {
    console.log('[viral-blueprint-proxy] Preflight request handled');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[viral-blueprint-proxy] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment variables
  if (!N8N_WEBHOOK_URL) {
    console.error('[viral-blueprint-proxy] N8N webhook URL not configured');
    return res.status(500).json({ 
      error: 'Webhook URL not configured. Please set VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK in environment variables.'
    });
  }

  try {
    console.log('[viral-blueprint-proxy] Forwarding request to n8n:', N8N_WEBHOOK_URL);
    console.log('[viral-blueprint-proxy] Request payload:', JSON.stringify(req.body, null, 2));

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

    console.log('[viral-blueprint-proxy] n8n response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error('[viral-blueprint-proxy] n8n error response:', errorText);
      return res.status(response.status).json({ 
        error: `n8n webhook error: ${response.status} ${response.statusText}`,
        details: errorText.substring(0, 200)
      });
    }

    // Parse and return the response
    const data = await response.json();
    console.log('[viral-blueprint-proxy] Successfully received response from n8n');
    console.log('[viral-blueprint-proxy] Response keys:', Object.keys(data));
    
    return res.status(200).json(data);

  } catch (error) {
    console.error('[viral-blueprint-proxy] Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Handle timeout errors
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return res.status(504).json({ 
        error: 'Request timeout: n8n workflow took longer than 120 seconds' 
      });
    }

    // Handle network errors
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      return res.status(502).json({ 
        error: 'Unable to reach n8n webhook. Please check the webhook URL.' 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}



