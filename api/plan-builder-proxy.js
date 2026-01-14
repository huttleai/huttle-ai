/**
 * AI Plan Builder Webhook Proxy
 * 
 * Serverless function that proxies Plan Builder webhook requests to n8n.
 * This avoids CORS issues by making the request server-side.
 * 
 * Environment Variables Required:
 * - VITE_N8N_PLAN_BUILDER_WEBHOOK: n8n webhook endpoint for plan builder
 * 
 * Expected Request Payload:
 * {
 *   "job_id": "<valid-uuid>",
 *   "contentGoal": "Grow followers",
 *   "timePeriod": "7",
 *   "platformFocus": ["Facebook", "Instagram"],
 *   "brandVoice": "Professional and Engaging"
 * }
 */

import { setCorsHeaders, handlePreflight } from './_utils/cors.js';

// SECURITY: No hardcoded fallback - must be configured via environment variable
// Note: Using non-VITE_ prefix for server-side code
const N8N_WEBHOOK_URL = process.env.N8N_PLAN_BUILDER_WEBHOOK || process.env.VITE_N8N_PLAN_BUILDER_WEBHOOK;

/**
 * Validate UUID format
 */
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Main handler function
 */
export default async function handler(req, res) {
  console.log('[plan-builder-proxy] ====== API ROUTE HIT ======');
  console.log('[plan-builder-proxy] Request method:', req.method);
  console.log('[plan-builder-proxy] Timestamp:', new Date().toISOString());
  
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

  // Validate request body
  const { job_id, contentGoal, timePeriod, platformFocus, brandVoice } = req.body || {};

  if (!job_id) {
    console.error('[plan-builder-proxy] Missing job_id in request body');
    return res.status(400).json({ 
      error: 'Missing required field: job_id',
      hint: 'The job_id must be a valid UUID format'
    });
  }

  if (!isValidUUID(job_id)) {
    console.error('[plan-builder-proxy] Invalid job_id format:', job_id);
    return res.status(400).json({ 
      error: 'Invalid job_id format. Must be a valid UUID.',
      received: job_id,
      example: '550e8400-e29b-41d4-a716-446655440000'
    });
  }

  try {
    console.log('[plan-builder-proxy] ====== REQUEST DETAILS ======');
    console.log('[plan-builder-proxy] Forwarding to n8n:', N8N_WEBHOOK_URL);
    console.log('[plan-builder-proxy] Job ID:', job_id);
    console.log('[plan-builder-proxy] Content Goal:', contentGoal);
    console.log('[plan-builder-proxy] Time Period:', timePeriod);
    console.log('[plan-builder-proxy] Platforms:', platformFocus);
    console.log('[plan-builder-proxy] Brand Voice:', brandVoice);
    console.log('[plan-builder-proxy] =============================');

    // Build the complete payload for n8n
    const n8nPayload = {
      job_id,
      contentGoal: contentGoal || 'Grow followers',
      timePeriod: String(timePeriod || '7'),
      platformFocus: Array.isArray(platformFocus) ? platformFocus : [],
      brandVoice: brandVoice || ''
    };

    console.log('[plan-builder-proxy] Sending payload to n8n:', JSON.stringify(n8nPayload, null, 2));

    // Forward request to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
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
    console.log('[plan-builder-proxy] ====== SUCCESS ======');
    console.log('[plan-builder-proxy] n8n webhook triggered successfully');
    console.log('[plan-builder-proxy] Response:', data.substring(0, 500));
    console.log('[plan-builder-proxy] ======================');
    
    // Return success (n8n will update job via Supabase)
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook triggered successfully',
      job_id: job_id
    });

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

