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

import { API_TIMEOUTS } from '../config/apiConfig';
import { retryFetch } from '../utils/retryFetch';

const N8N_PROXY_URL = '/api/ai/n8n-generator';

function pickFirstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

/**
 * Track AI analytics for performance monitoring
 * DISABLED in safe mode - will be re-enabled when Supabase is fixed
 */
async function trackAIAnalytics(data) {
  // Temporarily disabled - don't block user flow
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
    const headers = await getAuthHeaders();
    
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
    
    // Make request to n8n via serverless proxy
    const response = await retryFetch(
      N8N_PROXY_URL,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      },
      {
        timeoutMs: API_TIMEOUTS.STANDARD,
      }
    );

    const responseTime = Date.now() - startTime;

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

    const result = await response.json();
    const normalizedContent = pickFirstDefined(
      result.content,
      result.remixed,
      result.output,
      result.data?.content,
      result.data?.output,
      result.result?.content,
      result.result,
    );
    const normalizedHashtags = pickFirstDefined(
      result.hashtags,
      result.data?.hashtags,
      result.result?.hashtags,
      '',
    );

    if (normalizedContent === undefined || normalizedContent === null || normalizedContent === '') {
      return {
        success: false,
        error: 'Workflow response did not include generated content.',
        errorType: 'INVALID_RESPONSE',
      };
    }
    
    // Track success
    await trackAIAnalytics({
      userId: payload.userId,
      contentType: payload.contentType,
      platform: payload.platform,
      responseTime,
      success: true,
      model: result.metadata?.model || 'unknown',
      metadata: {
        hasHashtags: !!normalizedHashtags,
        contentLength: typeof normalizedContent === 'string' ? normalizedContent.length : 0
      }
    });

    return {
      success: true,
      content: normalizedContent,
      hashtags: normalizedHashtags,
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
    const response = await retryFetch(
      `${N8N_PROXY_URL}/health`,
      {
        method: 'GET',
        headers,
      },
      {
        timeoutMs: API_TIMEOUTS.FAST,
        maxRetries: 0,
      }
    );
    return response.ok;
  } catch (error) {
    console.warn('N8n health check failed:', error);
    return false;
  }
}

