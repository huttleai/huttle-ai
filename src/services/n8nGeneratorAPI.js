/**
 * N8n Generator API Service - Safe Mode (No Analytics)
 * 
 * ============================================================================
 * IMPORTANT: This is the EXISTING n8n generator for Content Remix Studio.
 * It is DIFFERENT from the new workflow-based features.
 * ============================================================================
 * 
 * This service handles the Content Remix Studio feature in Trend Lab.
 * It routes AI requests through the existing n8n generator webhook.
 * 
 * Handles:
 * - Caption generation
 * - Hook generation
 * - Content remix (viral/sales modes)
 * 
 * THIS SERVICE STAYS IN-CODE - It does NOT move to the new workflow system.
 * 
 * For NEW workflow-based features, see:
 * - src/services/n8nWorkflowAPI.js (Dashboard, Plan Builder, Forecaster, etc.)
 * - src/utils/workflowConstants.js (workflow configuration)
 * - docs/AI-FEATURES-SEPARATION.md (feature mapping)
 * 
 * All requests go through server-side proxy for security.
 * Analytics tracking disabled for now - will be re-enabled later.
 */

const N8N_PROXY_URL = '/api/ai/n8n-generator';

/**
 * Track AI analytics for performance monitoring
 * DISABLED in safe mode - will be re-enabled when Supabase is fixed
 */
async function trackAIAnalytics(data) {
  // Temporarily disabled - don't block user flow
  console.log('📊 [Analytics] Would track:', {
    contentType: data.contentType,
    platform: data.platform,
    success: data.success,
    responseTime: data.responseTime
  });
  // Analytics will be re-enabled later
  return Promise.resolve();
}

/**
 * Get auth headers for API requests
 * Safe mode: Auth is optional - will work without it
 */
async function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Include auth headers for API requests
  try {
    const { supabase } = await import('../config/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (e) {
    console.warn('⚠️ [n8nGenerator] Could not get auth session:', e.message);
  }
  
  return headers;
}

/**
 * Generate content using n8n webhook
 * 
 * @param {Object} payload - Generation parameters
 * @param {string} payload.userId - User ID for preferences lookup
 * @param {string} payload.topic - User's input topic/content
 * @param {string} payload.platform - Target platform (e.g., "Instagram", "X (Twitter)")
 * @param {string} payload.contentType - Type: "caption", "hook", "remix", "script"
 * @param {string} payload.brandVoice - User's brand voice settings
 * @param {string} [payload.theme] - Optional theme for hooks (question, teaser, etc)
 * @param {string} [payload.remixMode] - Optional mode for remix (viral, sales)
 * @param {Object} [payload.additionalContext] - Additional brand context
 * 
 * @returns {Promise<Object>} Generation result
 */
export async function generateWithN8n(payload) {
  const startTime = Date.now();
  
  console.log('🎯 [Frontend] generateWithN8n called with payload:', {
    hasUserId: !!payload.userId,
    hasTopic: !!payload.topic,
    contentType: payload.contentType,
    platform: payload.platform,
    topicPreview: payload.topic?.substring(0, 50)
  });
  
  // Validate required fields
  if (!payload.userId) {
    console.error('❌ [Frontend] User ID is missing');
    throw new Error('User ID is required');
  }
  if (!payload.topic || !payload.topic.trim()) {
    console.error('❌ [Frontend] Topic is missing or empty');
    throw new Error('Topic is required');
  }
  if (!payload.contentType) {
    console.error('❌ [Frontend] Content type is missing');
    throw new Error('Content type is required');
  }
  if (!payload.platform) {
    console.error('❌ [Frontend] Platform is missing');
    throw new Error('Platform is required');
  }

  try {
    console.log('🔐 [Frontend] Getting auth headers...');
    const headers = await getAuthHeaders();
    console.log('✅ [Frontend] Auth headers obtained:', {
      hasContentType: !!headers['Content-Type'],
      hasAuthorization: !!headers['Authorization']
    });
    
    const requestBody = {
      userId: payload.userId,
      topic: payload.topic,
      platform: payload.platform,
      contentType: payload.contentType,
      brandVoice: payload.brandVoice || 'engaging',
      theme: payload.theme || null,
      remixMode: payload.remixMode || null,
      additionalContext: payload.additionalContext || {}
    };
    
    console.log('📤 [Frontend] Making fetch request to:', N8N_PROXY_URL);
    console.log('📤 [Frontend] Request body:', {
      ...requestBody,
      topic: requestBody.topic.substring(0, 50) + '...'
    });
    
    // Make request to n8n via serverless proxy
    const response = await fetch(N8N_PROXY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(60000) // 60 second timeout
    });
    
    console.log('📥 [Frontend] Received response. Status:', response.status, 'OK:', response.ok);

    const responseTime = Date.now() - startTime;
    console.log('⏱️ [Frontend] Response time:', responseTime, 'ms');

    if (!response.ok) {
      console.error('❌ [Frontend] Response not OK. Status:', response.status);
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `API error: ${response.status}`;
      const details = errorData.details || '';
      console.error('❌ [Frontend] Error data:', errorData);
      
      console.error(`API Error (Status ${response.status}):`, errorMessage, details);
      
      // Track failure
      await trackAIAnalytics({
        userId: payload.userId,
        contentType: payload.contentType,
        platform: payload.platform,
        responseTime,
        success: false,
        errorType: `HTTP_${response.status}`,
        metadata: { error: errorMessage }
      });
      
      throw new Error(errorMessage);
    }

    console.log('✅ [Frontend] Response OK. Parsing JSON...');
    const result = await response.json();
    console.log('✅ [Frontend] Result parsed:', {
      hasContent: !!result.content,
      contentLength: result.content?.length || 0,
      hasHashtags: !!result.hashtags,
      hasMetadata: !!result.metadata
    });
    
    // Track success
    await trackAIAnalytics({
      userId: payload.userId,
      contentType: payload.contentType,
      platform: payload.platform,
      responseTime,
      success: true,
      model: result.metadata?.model || 'unknown',
      metadata: {
        hasHashtags: !!result.hashtags,
        contentLength: result.content?.length || 0
      }
    });

    console.log('✅ [Frontend] Returning success result');
    return {
      success: true,
      content: result.content || '',
      hashtags: result.hashtags || '',
      metadata: result.metadata || {}
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('❌ [Frontend] Error caught:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
    
    // Determine error type
    let errorType = 'UNKNOWN';
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      errorType = 'TIMEOUT';
      console.error('❌ [Frontend] Error type: TIMEOUT');
    } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
      errorType = 'NETWORK';
      console.error('❌ [Frontend] Error type: NETWORK');
    } else if (error.message.includes('validation') || error.message.includes('required')) {
      errorType = 'VALIDATION';
      console.error('❌ [Frontend] Error type: VALIDATION');
    } else {
      console.error('❌ [Frontend] Error type: UNKNOWN');
    }
    
    console.error(`[n8n] Frontend Error - Type: ${errorType}, Error: ${error.message}`);
    
    // Track failure
    await trackAIAnalytics({
      userId: payload.userId,
      contentType: payload.contentType,
      platform: payload.platform,
      responseTime,
      success: false,
      errorType,
      metadata: { error: error.message }
    });

    // Return structured error
    console.error('❌ [Frontend] Returning error to caller');
    return {
      success: false,
      error: error.message,
      errorType
    };
  }
}

/**
 * Helper function to check if n8n service is available
 */
export async function checkN8nHealth() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${N8N_PROXY_URL}/health`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    console.warn('N8n health check failed:', error);
    return false;
  }
}

