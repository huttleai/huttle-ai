/**
 * n8n Webhook Integration (OPTIONAL)
 * 
 * NOTE: n8n is NOT used for posting to social media.
 * Huttle AI uses deep linking instead (see PublishModal.jsx).
 * 
 * These functions are OPTIONAL and can be used for:
 * - Trend alerts and notifications
 * - Burnout warnings
 * - Content gap reminders
 * - Scheduled workflow triggers
 * 
 * If you don't need these features, you can safely ignore this file.
 */

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

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
