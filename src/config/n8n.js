/**
 * n8n Webhook Integration (OPTIONAL)
 * 
 * NOTE: n8n is NOT used for posting to social media.
 * Huttle AI uses deep linking instead (see PublishModal.jsx).
 * 
 * This file handles EXISTING n8n integrations:
 * - Trend alerts and notifications
 * - Burnout warnings
 * - Content gap reminders
 * - Scheduled workflow triggers
 * 
 * For NEW WORKFLOW-BASED AI FEATURES, see:
 * - src/services/n8nWorkflowAPI.js (service layer)
 * - src/utils/workflowConstants.js (configuration)
 * - docs/n8n/N8N-WORKFLOW-FEATURES.md (documentation)
 * 
 * WORKFLOW-BASED FEATURES (n8nWorkflowAPI.js):
 * - Dashboard: Trending Now, Hashtags of the Day
 * - AI Plan Builder
 * - Trend Discovery: Deep Dive
 * - Trend Forecaster
 * - Viral Blueprint
 * - Social Updates
 * 
 * IN-CODE AI FEATURES (grokAPI.js / perplexityAPI.js):
 * - AI Insights, Daily Alerts, Templates, Smart Scheduling
 * - AI Power Tools (Captions, Hashtags, Hooks, CTAs, Scorer, Visuals)
 * - Trend Discovery: Quick Scan
 * - Audience Insight Engine
 * - Content Remix Studio
 * 
 * If you don't need notification features, you can safely ignore this file.
 */

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

// =============================================================================
// WORKFLOW CONFIGURATION HELPERS
// =============================================================================
// Re-export workflow helpers from workflowConstants for convenience
// These are used by components to check if workflows are available

import { 
  WORKFLOW_NAMES,
  isWorkflowConfigured,
  getWorkflowUrl,
  getConfiguredWorkflows,
  getUnconfiguredWorkflows
} from '../utils/workflowConstants';

export { 
  WORKFLOW_NAMES,
  isWorkflowConfigured,
  getWorkflowUrl,
  getConfiguredWorkflows,
  getUnconfiguredWorkflows
};

/**
 * Check if n8n is configured
 */
export function isN8nConfigured() {
  return !!N8N_WEBHOOK_URL;
}

/**
 * OPTIONAL: Send trend alert to n8n
 */
export async function sendTrendAlert(userId, trendData) {
  if (!N8N_WEBHOOK_URL) {
    console.log('[n8n] Webhook not configured, skipping trend alert');
    return { success: false, error: 'n8n webhook not configured' };
  }

  try {
    const response = await fetch(`${N8N_WEBHOOK_URL}/trend-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type: 'trend_alert',
        data: trendData,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error('Failed to send alert');

    return {
      success: true,
      data: await response.json(),
    };
  } catch (error) {
    console.error('n8n trend alert error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * OPTIONAL: Send burnout warning to n8n
 */
export async function sendBurnoutWarning(userId, burnoutData) {
  if (!N8N_WEBHOOK_URL) {
    console.log('[n8n] Webhook not configured, skipping burnout warning');
    return { success: false, error: 'n8n webhook not configured' };
  }

  try {
    const response = await fetch(`${N8N_WEBHOOK_URL}/burnout-warning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type: 'burnout_warning',
        data: burnoutData,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error('Failed to send warning');

    return {
      success: true,
      data: await response.json(),
    };
  } catch (error) {
    console.error('n8n burnout warning error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * OPTIONAL: Set up scheduled trend monitoring
 */
export async function scheduleTrendMonitoring(userId, settings) {
  if (!N8N_WEBHOOK_URL) {
    console.log('[n8n] Webhook not configured, skipping schedule monitoring');
    return { success: false, error: 'n8n webhook not configured' };
  }

  try {
    const response = await fetch(`${N8N_WEBHOOK_URL}/schedule-monitoring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type: 'schedule_monitoring',
        settings: {
          frequency: settings.frequency || 'daily',
          niche: settings.niche,
          platforms: settings.platforms || [],
          notificationMethod: settings.notificationMethod || 'email',
        },
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error('Failed to schedule monitoring');

    return {
      success: true,
      data: await response.json(),
    };
  } catch (error) {
    console.error('n8n schedule monitoring error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * OPTIONAL: Send content gap reminder
 */
export async function sendContentGapReminder(userId, gapData) {
  if (!N8N_WEBHOOK_URL) {
    console.log('[n8n] Webhook not configured, skipping content gap reminder');
    return { success: false, error: 'n8n webhook not configured' };
  }

  try {
    const response = await fetch(`${N8N_WEBHOOK_URL}/content-gap-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type: 'content_gap',
        data: gapData,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error('Failed to send reminder');

    return {
      success: true,
      data: await response.json(),
    };
  } catch (error) {
    console.error('n8n content gap reminder error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * OPTIONAL: Trigger automated workflow
 */
export async function triggerWorkflow(workflowId, payload) {
  if (!N8N_WEBHOOK_URL) {
    console.log('[n8n] Webhook not configured, skipping workflow trigger');
    return { success: false, error: 'n8n webhook not configured' };
  }

  try {
    const response = await fetch(`${N8N_WEBHOOK_URL}/trigger/${workflowId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error('Failed to trigger workflow');

    return {
      success: true,
      data: await response.json(),
    };
  } catch (error) {
    console.error('n8n workflow trigger error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
