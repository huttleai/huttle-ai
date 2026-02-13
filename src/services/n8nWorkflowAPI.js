/**
 * N8N Workflow API Service
 * 
 * This service handles all AI features that will be powered by n8n workflows.
 * Each function calls a separate n8n webhook endpoint.
 * 
 * WORKFLOW-BASED FEATURES (this file):
 * - Dashboard Trending Now & Hashtags of the Day
 * - AI Plan Builder
 * - Trend Discovery Deep Dive
 * - Trend Forecaster
 * - Viral Blueprint Generator
 * - Social Updates Feed
 * 
 * IN-CODE FEATURES (NOT in this file - use grokAPI.js / perplexityAPI.js):
 * - AI Insights, Daily Alerts, Templates, Smart Scheduling
 * - AI Power Tools (Captions, Hashtags, Hooks, CTAs, Scorer, Visuals)
 * - Trend Discovery Quick Scan (Grok + Perplexity)
 * - Audience Insight Engine
 * - Content Remix Studio
 * 
 * @see docs/AI-FEATURES-SEPARATION.md for complete feature mapping
 */

import { supabase } from '../config/supabase';
import { 
  WORKFLOW_NAMES, 
  WORKFLOW_WEBHOOKS, 
  isWorkflowConfigured,
  getWorkflowUrl 
} from '../utils/workflowConstants';

// ============================================================================
// AUTH & HEADERS
// ============================================================================

/**
 * Get authentication headers for n8n workflow requests
 * @returns {Promise<Object>} Headers object with Content-Type and optional Authorization
 */
async function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (e) {
    console.warn('[N8N_WORKFLOW] Could not get auth session:', e);
  }
  
  return headers;
}

/**
 * Get current user ID for workflow requests
 * @returns {Promise<string|null>} User ID or null if not authenticated
 */
async function getCurrentUserId() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (e) {
    console.warn('[N8N_WORKFLOW] Could not get user ID:', e);
    return null;
  }
}

// ============================================================================
// DASHBOARD WORKFLOWS
// ============================================================================

/**
 * Fetch trending topics for the dashboard via n8n workflow
 * 
 * TODO: N8N_WORKFLOW - Implement n8n workflow that:
 * 1. Receives user's niche/industry from brand profile
 * 2. Fetches real-time trending data from multiple sources
 * 3. Filters and ranks by relevance to user's niche
 * 4. Returns formatted trending topics with engagement metrics
 * 
 * @param {Object} params - Request parameters
 * @param {string} params.niche - User's niche/industry
 * @param {string} params.industry - User's industry
 * @param {string[]} [params.platforms] - Platforms to check for trends
 * @returns {Promise<Object>} Trending topics data or fallback indicator
 * 
 * @example
 * const result = await getTrendingNow({ niche: 'fitness', industry: 'health' });
 * // Returns: { success: true, topics: [...], source: 'n8n' }
 * // Or: { success: false, useFallback: true, reason: 'Workflow not configured' }
 */
export async function getTrendingNow({ niche, industry, platforms = [] }) {
  console.log('[N8N_WORKFLOW] getTrendingNow called', { niche, industry, platforms });
  
  // Check if workflow is configured
  if (!isWorkflowConfigured(WORKFLOW_NAMES.DASHBOARD_TRENDING)) {
    console.log('[N8N_WORKFLOW] Dashboard trending workflow not configured, using fallback');
    return {
      success: false,
      useFallback: true,
      reason: 'Workflow not configured'
    };
  }
  
  try {
    const headers = await getAuthHeaders();
    const userId = await getCurrentUserId();
    const webhookUrl = getWorkflowUrl(WORKFLOW_NAMES.DASHBOARD_TRENDING);
    
    console.log('[N8N_WORKFLOW] Calling dashboard trending webhook:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        niche,
        industry,
        platforms,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Workflow returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('[N8N_WORKFLOW] Dashboard trending response received');
    
    return {
      success: true,
      topics: data.topics || [],
      source: 'n8n',
      metadata: data.metadata || {}
    };
    
  } catch (error) {
    console.error('[N8N_WORKFLOW] getTrendingNow error:', error);
    return {
      success: false,
      useFallback: true,
      reason: error.message
    };
  }
}

/**
 * Fetch hashtags of the day for the dashboard via n8n workflow
 * 
 * TODO: N8N_WORKFLOW - Implement n8n workflow that:
 * 1. Analyzes trending hashtags across platforms
 * 2. Filters by user's niche/industry relevance
 * 3. Calculates engagement scores
 * 4. Returns top hashtags with performance metrics
 * 
 * @param {Object} params - Request parameters
 * @param {string} params.niche - User's niche/industry
 * @param {string} params.industry - User's industry
 * @param {number} [params.limit=4] - Maximum hashtags to return
 * @returns {Promise<Object>} Hashtags data or fallback indicator
 * 
 * @example
 * const result = await getHashtagsOfDay({ niche: 'beauty', industry: 'cosmetics' });
 * // Returns: { success: true, hashtags: [{ tag: '#beauty', score: '95%' }], source: 'n8n' }
 */
export async function getHashtagsOfDay({ niche, industry, limit = 4 }) {
  console.log('[N8N_WORKFLOW] getHashtagsOfDay called', { niche, industry, limit });
  
  // Check if workflow is configured
  if (!isWorkflowConfigured(WORKFLOW_NAMES.DASHBOARD_HASHTAGS)) {
    console.log('[N8N_WORKFLOW] Dashboard hashtags workflow not configured, using fallback');
    return {
      success: false,
      useFallback: true,
      reason: 'Workflow not configured'
    };
  }
  
  try {
    const headers = await getAuthHeaders();
    const userId = await getCurrentUserId();
    const webhookUrl = getWorkflowUrl(WORKFLOW_NAMES.DASHBOARD_HASHTAGS);
    
    console.log('[N8N_WORKFLOW] Calling dashboard hashtags webhook:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        niche,
        industry,
        limit,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(30000)
    });
    
    if (!response.ok) {
      throw new Error(`Workflow returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('[N8N_WORKFLOW] Dashboard hashtags response received');
    
    return {
      success: true,
      hashtags: data.hashtags || [],
      source: 'n8n',
      metadata: data.metadata || {}
    };
    
  } catch (error) {
    console.error('[N8N_WORKFLOW] getHashtagsOfDay error:', error);
    return {
      success: false,
      useFallback: true,
      reason: error.message
    };
  }
}

// ============================================================================
// AI PLAN BUILDER WORKFLOW
// ============================================================================

/**
 * Generate AI content plan via n8n workflow
 * 
 * TODO: N8N_WORKFLOW - Implement n8n workflow that:
 * 1. Receives goal, period, platforms, and brand context
 * 2. Analyzes optimal posting schedule based on platform best practices
 * 3. Generates content themes and types for each day
 * 4. Returns complete content calendar with post suggestions
 * 
 * @param {Object} params - Plan generation parameters
 * @param {string} params.goal - Content goal (e.g., 'Grow followers')
 * @param {string} params.period - Time period ('7 days' or '14 days')
 * @param {string[]} params.platforms - Target platforms
 * @param {string} params.niche - User's niche
 * @param {string} [params.brandVoice] - Brand voice style
 * @param {Object} [params.brandProfile] - Full brand profile data
 * @returns {Promise<Object>} Generated plan or fallback indicator
 * 
 * @example
 * const result = await generateAIPlan({
 *   goal: 'Grow followers',
 *   period: '7 days',
 *   platforms: ['Instagram', 'TikTok'],
 *   niche: 'fitness'
 * });
 */
export async function generateAIPlan({ goal, period, platforms, niche, brandVoice, brandProfile }) {
  console.log('[N8N_WORKFLOW] generateAIPlan called', { goal, period, platforms, niche });
  
  // Check if workflow is configured
  if (!isWorkflowConfigured(WORKFLOW_NAMES.AI_PLAN_BUILDER)) {
    console.log('[N8N_WORKFLOW] AI Plan Builder workflow not configured, using fallback');
    return {
      success: false,
      useFallback: true,
      reason: 'Workflow not configured'
    };
  }
  
  try {
    const headers = await getAuthHeaders();
    const userId = await getCurrentUserId();
    const webhookUrl = getWorkflowUrl(WORKFLOW_NAMES.AI_PLAN_BUILDER);
    
    console.log('[N8N_WORKFLOW] Calling AI Plan Builder webhook:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        goal,
        period,
        platforms,
        niche,
        brandVoice,
        brandProfile,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(60000) // 60 second timeout for complex generation
    });
    
    if (!response.ok) {
      throw new Error(`Workflow returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('[N8N_WORKFLOW] AI Plan Builder response received');
    
    return {
      success: true,
      plan: data.plan || null,
      schedule: data.schedule || [],
      recommendations: data.recommendations || {},
      source: 'n8n',
      metadata: data.metadata || {}
    };
    
  } catch (error) {
    console.error('[N8N_WORKFLOW] generateAIPlan error:', error);
    return {
      success: false,
      useFallback: true,
      reason: error.message
    };
  }
}

// ============================================================================
// TREND DISCOVERY WORKFLOWS
// ============================================================================

/**
 * Get deep dive trend analysis via n8n workflow
 * 
 * TODO: N8N_WORKFLOW - Implement n8n workflow that:
 * 1. Receives trend topic and user context
 * 2. Performs comprehensive research across multiple sources
 * 3. Analyzes competitor content on this trend
 * 4. Generates actionable content ideas
 * 5. Returns detailed analysis with citations
 * 
 * @param {Object} params - Deep dive parameters
 * @param {string} params.trend - Trend topic to analyze
 * @param {string} params.niche - User's niche
 * @param {string[]} [params.platforms] - Platforms to analyze
 * @param {Object} [params.brandData] - Brand context
 * @returns {Promise<Object>} Deep dive analysis or fallback indicator
 */
export async function getTrendDeepDive({ trend, niche, platforms = [], brandData }) {
  console.log('[N8N_WORKFLOW] getTrendDeepDive called', { trend, niche, platforms });
  
  // Check if workflow is configured
  const isConfigured = isWorkflowConfigured(WORKFLOW_NAMES.TREND_DEEP_DIVE);
  const webhookUrl = getWorkflowUrl(WORKFLOW_NAMES.TREND_DEEP_DIVE);
  
  console.log('[N8N_WORKFLOW] Workflow configuration check:', {
    workflowName: WORKFLOW_NAMES.TREND_DEEP_DIVE,
    isConfigured,
    webhookUrl: webhookUrl || 'NOT SET',
    envVar: 'VITE_N8N_TREND_DEEP_DIVE_WEBHOOK'
  });
  
  if (!isConfigured || !webhookUrl) {
    console.warn('[N8N_WORKFLOW] Trend Deep Dive workflow not configured');
    console.warn('[N8N_WORKFLOW] Please set VITE_N8N_TREND_DEEP_DIVE_WEBHOOK environment variable');
    return {
      success: false,
      useFallback: false,
      reason: 'Workflow not configured. Please set VITE_N8N_TREND_DEEP_DIVE_WEBHOOK environment variable.'
    };
  }
  
  try {
    const headers = await getAuthHeaders();
    const userId = await getCurrentUserId();
    
    const requestBody = {
      userId,
      trend,
      topic: trend, // Duplicate as 'topic' for workflow compatibility
      trendTopic: trend, // Another alias in case workflow uses this key
      niche,
      platforms,
      brandData,
      timestamp: new Date().toISOString()
    };
    
    console.log('[N8N_WORKFLOW] Calling Trend Deep Dive webhook:', {
      url: webhookUrl,
      method: 'POST',
      hasAuth: !!headers.Authorization,
      userId,
      requestBody
    });
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(120000) // 120 second timeout (2 minutes)
    });
    
    console.log('[N8N_WORKFLOW] Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[N8N_WORKFLOW] Workflow error response:', errorText);
      throw new Error(`Workflow returned status ${response.status}: ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json();
    
    console.log('[N8N_WORKFLOW] Trend Deep Dive response received:', {
      hasAnalysis: !!data.analysis,
      analysisLength: data.analysis?.length || 0,
      contentIdeasCount: data.contentIdeas?.length || 0,
      competitorInsightsCount: data.competitorInsights?.length || 0,
      citationsCount: data.citations?.length || 0,
      dataKeys: Object.keys(data)
    });
    
    // Validate that the response actually contains analysis and isn't an error/clarification
    const analysisText = data.analysis || data.output || data.report || '';
    const failurePhrases = [
      'cannot provide',
      'lacks a specified',
      'need you to clarify',
      'please specify',
      'empty string',
      'what is the specific trend',
      'which trend do you want'
    ];
    
    const isFailedResponse = failurePhrases.some(phrase => 
      analysisText.toLowerCase().includes(phrase)
    );
    
    if (isFailedResponse) {
      console.warn('[N8N_WORKFLOW] Deep Dive response indicates the workflow did not receive the trend topic correctly');
      console.warn('[N8N_WORKFLOW] Trend sent:', trend, '| Full payload:', JSON.stringify(requestBody));
      return {
        success: false,
        reason: `The workflow did not process the topic "${trend}" correctly. The n8n workflow template may need to reference the "trend" or "topic" field from the request body. Please check the workflow configuration.`,
        analysis: analysisText,
        source: 'n8n'
      };
    }
    
    return {
      success: true,
      analysis: analysisText,
      contentIdeas: data.contentIdeas || data.ideas || [],
      competitorInsights: data.competitorInsights || data.insights || [],
      citations: data.citations || data.sources || [],
      source: 'n8n',
      metadata: data.metadata || {}
    };
    
  } catch (error) {
    console.error('[N8N_WORKFLOW] getTrendDeepDive error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Provide more specific error messages
    let errorReason = error.message;
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      errorReason = 'Workflow request timed out after 2 minutes. The workflow may be taking too long or not responding.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorReason = 'Network error. Please check if the n8n workflow URL is correct and accessible.';
    } else if (error.message.includes('404')) {
      errorReason = 'Workflow endpoint not found (404). Please verify the webhook URL is correct.';
    } else if (error.message.includes('500')) {
      errorReason = 'Workflow server error (500). Please check your n8n workflow logs.';
    }
    
    return {
      success: false,
      useFallback: false,
      reason: errorReason
    };
  }
}

/**
 * Get trend forecast via n8n workflow
 * 
 * TODO: N8N_WORKFLOW - Implement n8n workflow that:
 * 1. Analyzes current trend trajectories
 * 2. Predicts upcoming trends for the next 7 days
 * 3. Calculates velocity and confidence scores
 * 4. Generates tailored post ideas for each predicted trend
 * 
 * @param {Object} params - Forecast parameters
 * @param {string} params.niche - User's niche
 * @param {string} [params.timeframe='7 days'] - Forecast timeframe
 * @param {Object} [params.brandData] - Brand context for personalized ideas
 * @returns {Promise<Object>} Trend forecast or fallback indicator
 */
export async function getTrendForecast({ niche, timeframe = '7 days', brandData }) {
  console.log('[N8N_WORKFLOW] getTrendForecast called', { niche, timeframe });
  
  // Check if workflow is configured
  if (!isWorkflowConfigured(WORKFLOW_NAMES.TREND_FORECASTER)) {
    console.log('[N8N_WORKFLOW] Trend Forecaster workflow not configured, using fallback');
    return {
      success: false,
      useFallback: true,
      reason: 'Workflow not configured'
    };
  }
  
  try {
    const headers = await getAuthHeaders();
    const userId = await getCurrentUserId();
    const webhookUrl = getWorkflowUrl(WORKFLOW_NAMES.TREND_FORECASTER);
    
    console.log('[N8N_WORKFLOW] Calling Trend Forecaster webhook:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        niche,
        timeframe,
        brandData,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(45000)
    });
    
    if (!response.ok) {
      throw new Error(`Workflow returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('[N8N_WORKFLOW] Trend Forecaster response received');
    
    return {
      success: true,
      forecast: data.forecast || '',
      timeline: data.timeline || [],
      postIdeas: data.postIdeas || '',
      citations: data.citations || [],
      source: 'n8n',
      metadata: data.metadata || {}
    };
    
  } catch (error) {
    console.error('[N8N_WORKFLOW] getTrendForecast error:', error);
    return {
      success: false,
      useFallback: true,
      reason: error.message
    };
  }
}

// ============================================================================
// VIRAL BLUEPRINT WORKFLOW
// ============================================================================

/**
 * Generate viral blueprint via n8n workflow
 * 
 * TODO: N8N_WORKFLOW - Implement n8n workflow that:
 * 1. Receives platform, post type, topic, and voice context
 * 2. Analyzes successful viral content patterns for the platform
 * 3. Generates step-by-step content blueprint (script/text + visuals)
 * 4. Creates SEO strategy with keywords
 * 5. Suggests audio/music for video content
 * 6. Calculates viral potential score
 * 
 * @param {Object} params - Blueprint generation parameters
 * @param {string} params.platform - Target platform (TikTok, Instagram, etc.)
 * @param {string} params.postType - Content type (Video, Reel, Carousel, etc.)
 * @param {string} params.topic - Content topic
 * @param {string} params.voiceContext - Voice context (Personal Brand / Business Authority)
 * @param {Object} [params.brandProfile] - Full brand profile
 * @returns {Promise<Object>} Viral blueprint or fallback indicator
 */
export async function generateViralBlueprint({ platform, postType, topic, voiceContext, brandProfile }) {
  console.log('[N8N_WORKFLOW] generateViralBlueprint called', { platform, postType, topic, voiceContext });
  
  // Check if workflow is configured
  if (!isWorkflowConfigured(WORKFLOW_NAMES.VIRAL_BLUEPRINT)) {
    console.log('[N8N_WORKFLOW] Viral Blueprint workflow not configured, using fallback');
    return {
      success: false,
      useFallback: true,
      reason: 'Workflow not configured'
    };
  }
  
  try {
    const headers = await getAuthHeaders();
    const userId = await getCurrentUserId();
    const webhookUrl = getWorkflowUrl(WORKFLOW_NAMES.VIRAL_BLUEPRINT);
    
    console.log('[N8N_WORKFLOW] Calling Viral Blueprint webhook:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        platform,
        postType,
        topic,
        voiceContext,
        brandProfile,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(60000) // 60 second timeout for complex generation
    });
    
    if (!response.ok) {
      throw new Error(`Workflow returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('[N8N_WORKFLOW] Viral Blueprint response received');
    
    return {
      success: true,
      blueprint: data.blueprint || null,
      directorsCut: data.directorsCut || [],
      seoStrategy: data.seoStrategy || {},
      audioVibe: data.audioVibe || null,
      viralScore: data.viralScore || 0,
      source: 'n8n',
      metadata: data.metadata || {}
    };
    
  } catch (error) {
    console.error('[N8N_WORKFLOW] generateViralBlueprint error:', error);
    return {
      success: false,
      useFallback: true,
      reason: error.message
    };
  }
}

// ============================================================================
// SOCIAL UPDATES WORKFLOW
// ============================================================================

/**
 * Fetch social media platform updates via n8n workflow
 * 
 * TODO: N8N_WORKFLOW - Implement n8n workflow that:
 * 1. Monitors official platform announcement channels
 * 2. Scrapes and parses platform update news
 * 3. Categorizes by platform and impact level
 * 4. Extracts key takeaways and action items
 * 5. Returns formatted updates with links to sources
 * 
 * @param {Object} params - Request parameters
 * @param {number} [params.limit=12] - Maximum updates to return
 * @param {string[]} [params.platforms] - Filter by specific platforms
 * @returns {Promise<Object>} Social updates or fallback indicator
 */
export async function getSocialUpdates({ limit = 12, platforms = [] } = {}) {
  console.log('[N8N_WORKFLOW] getSocialUpdates called', { limit, platforms });
  
  // Check if workflow is configured
  if (!isWorkflowConfigured(WORKFLOW_NAMES.SOCIAL_UPDATES)) {
    console.log('[N8N_WORKFLOW] Social Updates workflow not configured, using fallback');
    return {
      success: false,
      useFallback: true,
      reason: 'Workflow not configured'
    };
  }
  
  try {
    const headers = await getAuthHeaders();
    const userId = await getCurrentUserId();
    const webhookUrl = getWorkflowUrl(WORKFLOW_NAMES.SOCIAL_UPDATES);
    
    console.log('[N8N_WORKFLOW] Calling Social Updates webhook:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        limit,
        platforms,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(30000)
    });
    
    if (!response.ok) {
      throw new Error(`Workflow returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('[N8N_WORKFLOW] Social Updates response received');
    
    return {
      success: true,
      updates: data.updates || [],
      source: 'n8n',
      metadata: data.metadata || {}
    };
    
  } catch (error) {
    console.error('[N8N_WORKFLOW] getSocialUpdates error:', error);
    return {
      success: false,
      useFallback: true,
      reason: error.message
    };
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if n8n workflow service is available
 * @param {string} workflowName - Workflow to check
 * @returns {Promise<boolean>} True if workflow is available
 */
export async function checkWorkflowHealth(workflowName) {
  if (!isWorkflowConfigured(workflowName)) {
    return false;
  }
  
  try {
    const webhookUrl = getWorkflowUrl(workflowName);
    const response = await fetch(`${webhookUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    console.warn(`[N8N_WORKFLOW] Health check failed for ${workflowName}:`, error);
    return false;
  }
}

/**
 * Check all workflow configurations
 * @returns {Object} Status of all workflows
 */
export function getWorkflowStatus() {
  return {
    dashboardTrending: isWorkflowConfigured(WORKFLOW_NAMES.DASHBOARD_TRENDING),
    dashboardHashtags: isWorkflowConfigured(WORKFLOW_NAMES.DASHBOARD_HASHTAGS),
    aiPlanBuilder: isWorkflowConfigured(WORKFLOW_NAMES.AI_PLAN_BUILDER),
    trendDeepDive: isWorkflowConfigured(WORKFLOW_NAMES.TREND_DEEP_DIVE),
    trendForecaster: isWorkflowConfigured(WORKFLOW_NAMES.TREND_FORECASTER),
    viralBlueprint: isWorkflowConfigured(WORKFLOW_NAMES.VIRAL_BLUEPRINT),
    socialUpdates: isWorkflowConfigured(WORKFLOW_NAMES.SOCIAL_UPDATES)
  };
}

