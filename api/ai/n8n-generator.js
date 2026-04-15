/**
 * N8n Generator Proxy
 *
 * Serverless function that proxies AI generation requests to n8n webhook.
 * Handles timeout and error responses.
 * 
 * Environment Variables Required:
 * - N8N_WEBHOOK_URL_GENERATOR: legacy n8n webhook endpoint for the retired generator flow
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from '../_utils/cors.js';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL_GENERATOR;

// Initialize Supabase for auth verification (both URL and service role required)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight request
  if (handlePreflight(req, res)) return;

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.warn('[n8n-generator] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    console.error('[n8n-generator] Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
    return res.status(500).json({ error: 'Authentication service not configured' });
  }

  const authHeader = req.headers.authorization;
  const bearerMatch = typeof authHeader === 'string' ? /^Bearer\s+(\S+)/i.exec(authHeader.trim()) : null;
  const token = bearerMatch ? bearerMatch[1] : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let verifiedUserId = null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    verifiedUserId = user.id;
  } catch {
    return res.status(401).json({ error: 'Authentication failed' });
  }

  // Validate environment variables
  if (!N8N_WEBHOOK_URL) {
    console.error('[n8n-generator] N8N webhook URL not configured. Set N8N_WEBHOOK_URL_GENERATOR in environment.');
    // Return a clear error so the frontend can fall back to Grok API
    return res.status(503).json({ 
      error: 'Content Remix Studio workflow not configured. Using fallback AI.',
      errorType: 'NOT_CONFIGURED'
    });
  }

  try {
    // Extract and validate request body
    const {
      userId,
      topic,
      platform,
      contentType,
      brandVoice,
      theme,
      remixMode,
      additionalContext
    } = req.body;

    const authenticatedUserId = verifiedUserId;
    if (userId && userId !== authenticatedUserId) {
      return res.status(403).json({ error: 'User ID does not match session' });
    }
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    if (!contentType) {
      return res.status(400).json({ error: 'Content type is required' });
    }
    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    // Prepare payload for n8n (use authenticated user ID)
    const n8nPayload = {
      userId: authenticatedUserId,
      topic,
      platform,
      contentType,
      brandVoice: brandVoice || 'engaging',
      theme: theme || null,
      remixMode: remixMode || null,
      additionalContext: additionalContext || {},
      timestamp: new Date().toISOString()
    };

    // Forward request to n8n with timeout
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!n8nResponse.ok) {
        const errorBody = await n8nResponse.text();
        console.error('[n8n-generator] N8n error:', n8nResponse.status, errorBody?.slice?.(0, 200));
        
        // SECURITY: Don't expose n8n error details to client
        return res.status(502).json({
          error: 'Content generation service error. Please try again.',
        });
      }

      const n8nData = await n8nResponse.json();

      // Return structured response
      return res.status(200).json({
        success: true,
        content: n8nData.content || '',
        hashtags: n8nData.hashtags || '',
        metadata: {
          model: n8nData.metadata?.model || 'unknown',
          processingTime: n8nData.metadata?.processingTime || 0,
          ...n8nData.metadata
        }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('[n8n-generator] Request timeout');
        return res.status(504).json({
          error: 'Content generation timed out. Please try again.'
        });
      }

      // Network or connection errors
      console.error('[n8n-generator] Network error:', fetchError.message);
      
      // SECURITY: Don't expose infrastructure details to client
      return res.status(502).json({
        error: 'Content generation service is temporarily unavailable. Please try again.',
      });
    }

  } catch (error) {
    console.error('❌ [n8n-generator] Proxy error:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 300)
    });
    
    // SECURITY: Don't expose internal error details to client
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.'
    });
  }
}
