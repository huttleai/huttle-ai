/**
 * n8n API Service (OPTIONAL)
 * 
 * NOTE: n8n is NOT used for posting to social media.
 * Huttle AI uses deep linking instead (see PublishModal.jsx and socialMediaHelpers.js).
 * 
 * n8n can be optionally used for:
 * - Analytics fetching (requires user OAuth)
 * - Notifications and reminders
 * - Content analysis
 * - Trend monitoring
 * 
 * If you don't need these features, you can safely ignore this file.
 */

// API endpoints (these will be Vercel serverless functions)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Check if n8n integration is configured (for optional features)
 */
export const isN8nConfigured = () => {
  return !!(
    import.meta.env.VITE_N8N_WEBHOOK_URL ||
    import.meta.env.VITE_N8N_ANALYTICS_WEBHOOK_URL
  );
};

/**
 * Get n8n configuration status
 */
export const getN8nStatus = () => {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
  const analyticsWebhookUrl = import.meta.env.VITE_N8N_ANALYTICS_WEBHOOK_URL;

  return {
    configured: !!(webhookUrl || analyticsWebhookUrl),
    webhookUrl: !!webhookUrl,
    analyticsWebhookUrl: !!analyticsWebhookUrl,
    apiBaseUrl: API_BASE_URL
  };
};

/**
 * OPTIONAL: Fetch analytics from platforms via n8n
 * Requires user to grant OAuth access to platforms
 */
export const fetchAnalyticsViaN8n = async (userId, platforms, dateRange = '7d') => {
  const analyticsWebhookUrl = import.meta.env.VITE_N8N_ANALYTICS_WEBHOOK_URL;
  
  if (!analyticsWebhookUrl) {
    return {
      success: false,
      error: 'Analytics webhook not configured'
    };
  }

  try {
    const response = await fetch(analyticsWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        platforms,
        dateRange,
        timestamp: new Date().toISOString()
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        analytics: data.analytics
      };
    } else {
      throw new Error(data.error || 'Failed to fetch analytics');
    }

  } catch (error) {
    console.error('Fetch analytics error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * OPTIONAL: Trigger notification workflow
 */
export const triggerNotification = async (userId, notificationType, data) => {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return {
      success: false,
      error: 'Notification webhook not configured'
    };
  }

  try {
    const response = await fetch(`${webhookUrl}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        type: notificationType,
        data,
        timestamp: new Date().toISOString()
      })
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        data: result
      };
    } else {
      throw new Error(result.error || 'Failed to trigger notification');
    }

  } catch (error) {
    console.error('Notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * DEPRECATED: These functions are no longer used since we use deep linking
 * Kept for backward compatibility but will return mock responses
 */

export const sendPostToN8n = async () => {
  console.warn('[Deprecated] sendPostToN8n is no longer used. Huttle AI uses deep linking for posting.');
  return {
    success: false,
    error: 'n8n posting is deprecated. Use deep linking via PublishModal instead.'
  };
};

export const checkConnectionStatus = async () => {
  console.warn('[Deprecated] checkConnectionStatus is no longer used. Deep linking does not require connections.');
  return {
    success: true,
    connections: {},
    summary: { connectedCount: 0, totalPlatforms: 5, connectionRate: 0 },
    n8nAvailable: false
  };
};

export const updateConnectionStatus = async () => {
  console.warn('[Deprecated] updateConnectionStatus is no longer used. Deep linking does not require connections.');
  return {
    success: true,
    message: 'Connection management is deprecated. Deep linking does not require connections.'
  };
};

export const getQueuedPosts = async () => {
  console.warn('[Deprecated] getQueuedPosts is no longer used. Posts are not queued for n8n.');
  return {
    success: true,
    posts: []
  };
};

export const retryPost = async () => {
  console.warn('[Deprecated] retryPost is no longer used. Use deep linking via PublishModal instead.');
  return {
    success: false,
    error: 'Post retry is deprecated. Use deep linking via PublishModal instead.'
  };
};
