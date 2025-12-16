/**
 * N8n Generator Proxy - Safe Mode (No Supabase)
 * 
 * Serverless function that proxies AI generation requests to n8n webhook.
 * Handles timeout and error responses.
 * 
 * Environment Variables Required:
 * - N8N_WEBHOOK_URL_GENERATOR: n8n webhook endpoint for content generation
 */

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL_GENERATOR;

/**
 * Main handler function
 */
export default async function handler(req, res) {
  console.log('🚀 [n8n-generator] API route hit');
  console.log('🚀 [n8n-generator] Request method:', req.method);
  console.log('🚀 [n8n-generator] Request URL:', req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    console.log('✅ [n8n-generator] Preflight request handled');
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('❌ [n8n-generator] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment variables
  console.log('🔍 [n8n-generator] Checking N8N_WEBHOOK_URL_GENERATOR:', N8N_WEBHOOK_URL ? 'FOUND' : 'MISSING');
  
  if (!N8N_WEBHOOK_URL) {
    console.error('❌ [n8n-generator] N8N_WEBHOOK_URL_GENERATOR environment variable not set');
    return res.status(500).json({ 
      error: 'CRITICAL: N8N_WEBHOOK_URL_GENERATOR is missing in .env file'
    });
  }

  try {
    console.log('📦 [n8n-generator] Request body received:', {
      hasUserId: !!req.body?.userId,
      hasTopic: !!req.body?.topic,
      platform: req.body?.platform,
      contentType: req.body?.contentType,
      bodyKeys: Object.keys(req.body || {})
    });

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
    console.log('✅ [n8n-generator] Validating required fields...');
    if (!userId) {
      console.log('❌ [n8n-generator] Missing userId');
      return res.status(400).json({ error: 'User ID is required' });
    }
    if (!topic || !topic.trim()) {
      console.log('❌ [n8n-generator] Missing or empty topic');
      return res.status(400).json({ error: 'Topic is required' });
    }
    if (!contentType) {
      console.log('❌ [n8n-generator] Missing contentType');
      return res.status(400).json({ error: 'Content type is required' });
    }
    if (!platform) {
      console.log('❌ [n8n-generator] Missing platform');
      return res.status(400).json({ error: 'Platform is required' });
    }
    console.log('✅ [n8n-generator] All required fields present');

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

    // Log request (without sensitive data)
    console.log('📤 [n8n-generator] Prepared n8n payload:', {
      userId,
      contentType,
      platform,
      topicLength: topic.length,
      brandVoice: brandVoice || 'engaging',
      theme,
      remixMode
    });

    // Forward request to n8n with timeout
    console.log('🌐 [n8n-generator] Sending request to n8n webhook...');
    console.log('🌐 [n8n-generator] Webhook URL configured: YES (not logging actual URL for security)');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      console.log('📡 [n8n-generator] Making fetch request to n8n...');
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('📥 [n8n-generator] Received response from n8n. Status:', n8nResponse.status);

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error('❌ [n8n-generator] N8n error response:', {
          status: n8nResponse.status,
          error: errorText.substring(0, 200)
        });
        
        return res.status(n8nResponse.status).json({
          error: 'N8n service error',
          details: `N8n returned ${n8nResponse.status}`,
          n8nError: errorText.substring(0, 200) // Limit error message length
        });
      }

      const n8nData = await n8nResponse.json();
      console.log('✅ [n8n-generator] N8n response parsed successfully');

      // Log successful response
      console.log('📊 [n8n-generator] N8n response summary:', {
        userId,
        contentType,
        hasContent: !!n8nData.content,
        contentLength: n8nData.content?.length || 0,
        hasHashtags: !!n8nData.hashtags,
        hasMetadata: !!n8nData.metadata
      });

      // Return structured response
      console.log('✅ [n8n-generator] Returning success response to client');
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
        console.error('❌ [n8n-generator] N8n request timeout:', { userId, contentType });
        return res.status(504).json({
          error: 'Request timeout: N8n took too long to respond (>60s)'
        });
      }

      // Network or connection errors
      const errorMessage = fetchError.message || 'Unknown network error';
      console.error('❌ [n8n-generator] Fetch error:', {
        name: fetchError.name,
        message: errorMessage,
        stack: fetchError.stack?.substring(0, 200)
      });
      
      // Return specific network error message
      return res.status(500).json({
        error: `Network error connecting to n8n: ${errorMessage}`,
        details: `Failed to reach n8n webhook. Check if the URL is correct and n8n is running.`
      });
    }

  } catch (error) {
    console.error('❌ [n8n-generator] Proxy error:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 300)
    });
    
    // Return detailed error message
    return res.status(500).json({
      error: `Server error: ${error.message || 'Unknown error'}`,
      details: error.message,
      type: error.name
    });
  }
}
