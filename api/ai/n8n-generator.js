/**
 * N8n Generator Proxy - Safe Mode (No Supabase)
 * 
 * Serverless function that proxies AI generation requests to n8n webhook.
 * Handles timeout and error responses.
 * 
 * Environment Variables Required:
 * - N8N_WEBHOOK_URL_GENERATOR: n8n webhook endpoint for content generation
 */

import { setCorsHeaders, handlePreflight } from '../_utils/cors.js';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL_GENERATOR;

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
    console.log('❌ [n8n-generator] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment variables
  if (!N8N_WEBHOOK_URL) {
    console.error('[n8n-generator] N8N_WEBHOOK_URL_GENERATOR not configured');
    // SECURITY: Don't expose environment variable names to client
    return res.status(500).json({ 
      error: 'Content generation service not configured. Please try again later.'
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

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
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

    // Prepare payload for n8n
    const n8nPayload = {
      userId,
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
        const errorText = await n8nResponse.text();
        console.error('[n8n-generator] N8n error:', n8nResponse.status);
        
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
