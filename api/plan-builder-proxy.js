/**
 * AI Plan Builder Webhook Proxy
 * 
 * Serverless function that proxies Plan Builder webhook requests to n8n.
 * This avoids CORS issues by making the request server-side.
 * 
 * Environment Variables Required:
 * - VITE_N8N_PLAN_BUILDER_WEBHOOK: n8n webhook endpoint for plan builder
 */

import { setCorsHeaders, handlePreflight } from './_utils/cors.js';

const N8N_WEBHOOK_URL = process.env.VITE_N8N_PLAN_BUILDER_WEBHOOK || 
                       'https://huttleai.app.n8n.cloud/webhook/plan-builder-async';

/**
 * Main handler function
 */
export default async function handler(req, res) {
  console.log('[plan-builder-proxy] API route hit');
  console.log('[plan-builder-proxy] Request method:', req.method);
  
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight request
  if (handlePreflight(req, res)) {
    console.log('[plan-builder-proxy] Preflight request handled');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[plan-builder-proxy] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment variables
  if (!N8N_WEBHOOK_URL) {
    console.error('[plan-builder-proxy] N8N webhook URL not configured');
    return res.status(500).json({ 
      error: 'Webhook URL not configured. Please set VITE_N8N_PLAN_BUILDER_WEBHOOK in environment variables.'
    });
  }

  try {
    console.log('[plan-builder-proxy] Forwarding request to n8n:', N8N_WEBHOOK_URL);
    console.log('[plan-builder-proxy] Job ID:', req.body.job_id);

    // Forward request to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(req.body),
      // Timeout for webhook trigger (should be fast)
      signal: AbortSignal.timeout(30000), // 30 seconds
    });

    console.log('[plan-builder-proxy] n8n response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error('[plan-builder-proxy] n8n error response:', errorText);
      return res.status(response.status).json({ 
        error: `n8n webhook error: ${response.status} ${response.statusText}`,
        details: errorText.substring(0, 200)
      });
    }

    // Parse and return the response
    const data = await response.text();
    console.log('[plan-builder-proxy] Successfully triggered n8n webhook');
    console.log('[plan-builder-proxy] Response:', data);
    
    // Return success (n8n will update job via Supabase)
    return res.status(200).json({ success: true, message: 'Webhook triggered successfully' });

  } catch (error) {
    console.error('[plan-builder-proxy] Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Handle timeout errors
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return res.status(504).json({ 
        error: 'Request timeout: n8n webhook took longer than 30 seconds' 
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

