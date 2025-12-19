/**
 * N8N Workflow Constants
 * 
 * Centralized configuration for all n8n workflow integrations.
 * 
 * WORKFLOW-BASED FEATURES:
 * - Dashboard Trending Now & Hashtags of the Day
 * - AI Plan Builder
 * - Trend Discovery Deep Dive
 * - Trend Forecaster
 * - Viral Blueprint Generator
 * - Social Updates Feed
 * 
 * IN-CODE FEATURES (NOT workflows):
 * - AI Insights, Daily Alerts, Templates, Smart Scheduling
 * - AI Power Tools (Captions, Hashtags, Hooks, CTAs, Scorer, Visuals)
 * - Trend Discovery Quick Scan
 * - Audience Insight Engine
 * - Content Remix Studio
 * 
 * @see docs/AI-FEATURES-SEPARATION.md for complete feature mapping
 */

// ============================================================================
// WORKFLOW NAMES
// ============================================================================

/**
 * Workflow name constants
 * Use these when checking configuration or calling workflows
 */
export const WORKFLOW_NAMES = {
  // Dashboard workflows
  DASHBOARD_TRENDING: 'dashboard-trending',
  DASHBOARD_HASHTAGS: 'dashboard-hashtags',
  
  // Planning workflows
  AI_PLAN_BUILDER: 'ai-plan-builder',
  
  // Trend workflows
  TREND_DEEP_DIVE: 'trend-deep-dive',
  TREND_FORECASTER: 'trend-forecaster',
  
  // Content workflows
  VIRAL_BLUEPRINT: 'viral-blueprint',
  
  // Updates workflows
  SOCIAL_UPDATES: 'social-updates'
};

// ============================================================================
// ENVIRONMENT VARIABLE MAPPING
// ============================================================================

/**
 * Maps workflow names to their environment variable names
 * These environment variables should contain the full webhook URL
 */
export const WORKFLOW_ENV_VARS = {
  [WORKFLOW_NAMES.DASHBOARD_TRENDING]: 'VITE_N8N_DASHBOARD_WEBHOOK',
  [WORKFLOW_NAMES.DASHBOARD_HASHTAGS]: 'VITE_N8N_DASHBOARD_WEBHOOK', // Same endpoint, different payload
  [WORKFLOW_NAMES.AI_PLAN_BUILDER]: 'VITE_N8N_PLAN_BUILDER_WEBHOOK',
  [WORKFLOW_NAMES.TREND_DEEP_DIVE]: 'VITE_N8N_TREND_DEEP_DIVE_WEBHOOK',
  [WORKFLOW_NAMES.TREND_FORECASTER]: 'VITE_N8N_TREND_FORECASTER_WEBHOOK',
  [WORKFLOW_NAMES.VIRAL_BLUEPRINT]: 'VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK',
  [WORKFLOW_NAMES.SOCIAL_UPDATES]: 'VITE_N8N_SOCIAL_UPDATES_WEBHOOK'
};

/**
 * Webhook endpoint paths (appended to base URL if using single n8n instance)
 */
export const WORKFLOW_WEBHOOKS = {
  [WORKFLOW_NAMES.DASHBOARD_TRENDING]: '/webhook/dashboard-trending',
  [WORKFLOW_NAMES.DASHBOARD_HASHTAGS]: '/webhook/dashboard-hashtags',
  [WORKFLOW_NAMES.AI_PLAN_BUILDER]: '/webhook/ai-plan-builder',
  [WORKFLOW_NAMES.TREND_DEEP_DIVE]: '/webhook/trend-deep-dive',
  [WORKFLOW_NAMES.TREND_FORECASTER]: '/webhook/trend-forecaster',
  [WORKFLOW_NAMES.VIRAL_BLUEPRINT]: '/webhook/viral-blueprint',
  [WORKFLOW_NAMES.SOCIAL_UPDATES]: '/webhook/social-updates'
};

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Check if a specific workflow is configured
 * A workflow is considered configured if its environment variable is set
 * 
 * @param {string} workflowName - Name from WORKFLOW_NAMES
 * @returns {boolean} True if workflow is configured
 * 
 * @example
 * if (isWorkflowConfigured(WORKFLOW_NAMES.VIRAL_BLUEPRINT)) {
 *   // Use n8n workflow
 * } else {
 *   // Use fallback
 * }
 */
export function isWorkflowConfigured(workflowName) {
  const envVar = WORKFLOW_ENV_VARS[workflowName];
  if (!envVar) {
    console.warn(`[WORKFLOW] Unknown workflow name: ${workflowName}`);
    return false;
  }
  
  const value = import.meta.env[envVar];
  return !!value && value.trim() !== '';
}

/**
 * Get the webhook URL for a specific workflow
 * 
 * @param {string} workflowName - Name from WORKFLOW_NAMES
 * @returns {string|null} Webhook URL or null if not configured
 * 
 * @example
 * const url = getWorkflowUrl(WORKFLOW_NAMES.AI_PLAN_BUILDER);
 * // Returns: 'https://your-n8n.app/webhook/ai-plan-builder' or null
 */
export function getWorkflowUrl(workflowName) {
  const envVar = WORKFLOW_ENV_VARS[workflowName];
  if (!envVar) {
    console.warn(`[WORKFLOW] Unknown workflow name: ${workflowName}`);
    return null;
  }
  
  const url = import.meta.env[envVar];
  if (!url || url.trim() === '') {
    return null;
  }
  
  return url.trim();
}

/**
 * Get all configured workflows
 * 
 * @returns {Object} Object with workflow names as keys and their URLs as values
 * 
 * @example
 * const configured = getConfiguredWorkflows();
 * // Returns: { 'viral-blueprint': 'https://...', 'ai-plan-builder': 'https://...' }
 */
export function getConfiguredWorkflows() {
  const configured = {};
  
  Object.values(WORKFLOW_NAMES).forEach(name => {
    if (isWorkflowConfigured(name)) {
      configured[name] = getWorkflowUrl(name);
    }
  });
  
  return configured;
}

/**
 * Get all unconfigured workflows
 * Useful for debugging and setup guidance
 * 
 * @returns {string[]} Array of unconfigured workflow names
 */
export function getUnconfiguredWorkflows() {
  return Object.values(WORKFLOW_NAMES).filter(name => !isWorkflowConfigured(name));
}

// ============================================================================
// FALLBACK MODES
// ============================================================================

/**
 * Fallback mode constants
 * Used when workflows are not configured
 */
export const FALLBACK_MODES = {
  /** Use static mock data */
  MOCK: 'mock',
  /** Use existing in-code AI (Grok/Perplexity) */
  IN_CODE_AI: 'in_code_ai',
  /** Use Supabase data */
  SUPABASE: 'supabase',
  /** Feature disabled */
  DISABLED: 'disabled'
};

/**
 * Default fallback mode for each workflow
 */
export const WORKFLOW_FALLBACKS = {
  [WORKFLOW_NAMES.DASHBOARD_TRENDING]: FALLBACK_MODES.MOCK,
  [WORKFLOW_NAMES.DASHBOARD_HASHTAGS]: FALLBACK_MODES.MOCK,
  [WORKFLOW_NAMES.AI_PLAN_BUILDER]: FALLBACK_MODES.IN_CODE_AI,
  [WORKFLOW_NAMES.TREND_DEEP_DIVE]: FALLBACK_MODES.IN_CODE_AI,
  [WORKFLOW_NAMES.TREND_FORECASTER]: FALLBACK_MODES.IN_CODE_AI,
  [WORKFLOW_NAMES.VIRAL_BLUEPRINT]: FALLBACK_MODES.MOCK,
  [WORKFLOW_NAMES.SOCIAL_UPDATES]: FALLBACK_MODES.SUPABASE
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

/**
 * Standard error messages for workflow operations
 */
export const WORKFLOW_ERRORS = {
  NOT_CONFIGURED: 'Workflow not configured. Using fallback data.',
  TIMEOUT: 'Workflow request timed out. Please try again.',
  NETWORK: 'Network error connecting to workflow. Please check your connection.',
  UNAUTHORIZED: 'Authentication required for this workflow.',
  RATE_LIMITED: 'Too many requests. Please wait before trying again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.'
};

/**
 * Get user-friendly error message
 * 
 * @param {string} errorType - Error type from workflow response
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(errorType) {
  return WORKFLOW_ERRORS[errorType] || WORKFLOW_ERRORS.UNKNOWN;
}

// ============================================================================
// FEATURE CATEGORIZATION
// ============================================================================

/**
 * Features that use n8n workflows
 * Reference for documentation and debugging
 */
export const WORKFLOW_FEATURES = [
  {
    name: 'Dashboard - Trending Now',
    workflow: WORKFLOW_NAMES.DASHBOARD_TRENDING,
    description: 'Real-time trending topics for dashboard',
    fallback: 'Mock trending data from mockData.js'
  },
  {
    name: 'Dashboard - Hashtags of the Day',
    workflow: WORKFLOW_NAMES.DASHBOARD_HASHTAGS,
    description: 'AI-recommended hashtags for dashboard',
    fallback: 'Industry-based hashtags from brand profile'
  },
  {
    name: 'AI Plan Builder',
    workflow: WORKFLOW_NAMES.AI_PLAN_BUILDER,
    description: 'Generate 7-14 day content calendars',
    fallback: 'Existing job-based plan builder API'
  },
  {
    name: 'Trend Discovery - Deep Dive',
    workflow: WORKFLOW_NAMES.TREND_DEEP_DIVE,
    description: 'Comprehensive trend analysis with competitor insights',
    fallback: 'Basic Perplexity API search'
  },
  {
    name: 'Trend Forecaster',
    workflow: WORKFLOW_NAMES.TREND_FORECASTER,
    description: '7-day trend predictions with velocity scores',
    fallback: 'Perplexity + Grok combined analysis'
  },
  {
    name: 'Viral Blueprint',
    workflow: WORKFLOW_NAMES.VIRAL_BLUEPRINT,
    description: 'Step-by-step viral content blueprints',
    fallback: 'Mock blueprint generator'
  },
  {
    name: 'Social Updates',
    workflow: WORKFLOW_NAMES.SOCIAL_UPDATES,
    description: 'Platform update news and announcements',
    fallback: 'Supabase social_updates table'
  }
];

/**
 * Features that stay in-code (NOT workflows)
 * Reference for documentation
 */
export const IN_CODE_FEATURES = [
  {
    name: 'AI Insights',
    api: 'Grok',
    description: 'Smart recommendations on dashboard'
  },
  {
    name: 'Daily Alerts',
    api: 'Grok',
    description: 'Important updates and notifications'
  },
  {
    name: 'Templates',
    api: 'Grok',
    description: 'Content templates generation'
  },
  {
    name: 'Smart Scheduling',
    api: 'Grok',
    description: 'Optimal posting time suggestions'
  },
  {
    name: 'AI Power Tools - Captions',
    api: 'Grok',
    description: 'Generate social media captions'
  },
  {
    name: 'AI Power Tools - Hashtags',
    api: 'Grok',
    description: 'Generate relevant hashtags'
  },
  {
    name: 'AI Power Tools - Hooks',
    api: 'Grok',
    description: 'Generate attention-grabbing hooks'
  },
  {
    name: 'AI Power Tools - CTAs',
    api: 'Grok',
    description: 'Generate call-to-action suggestions'
  },
  {
    name: 'AI Power Tools - Scorer',
    api: 'Grok',
    description: 'Score content quality'
  },
  {
    name: 'AI Power Tools - Visuals',
    api: 'Grok',
    description: 'Visual content suggestions'
  },
  {
    name: 'Trend Discovery - Quick Scan',
    api: 'Grok + Perplexity',
    description: 'Quick trend scanning'
  },
  {
    name: 'Audience Insight Engine',
    api: 'Perplexity',
    description: 'Audience demographics and preferences'
  },
  {
    name: 'Content Remix Studio',
    api: 'n8n Generator (existing)',
    description: 'Remix content for viral/sales modes'
  }
];





