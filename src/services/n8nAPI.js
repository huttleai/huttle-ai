import { supabase } from '../config/supabase';

// API endpoints (these will be Vercel serverless functions)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Check connection status for a user
 */
export const checkConnectionStatus = async (userId) => {
  try {
    // First try the API endpoint
    const response = await fetch(`${API_BASE_URL}/check-connection-status?userId=${userId}`);
    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        connections: data.connections,
        summary: data.summary,
        n8nAvailable: data.n8nStatus === 'available'
      };
    }

    // Fallback to direct Supabase query
    console.warn('API check failed, falling back to Supabase');
    return await checkConnectionStatusFallback(userId);

  } catch (error) {
    console.error('Connection status check error:', error);
    return await checkConnectionStatusFallback(userId);
  }
};

/**
 * Fallback connection check using direct Supabase
 */
const checkConnectionStatusFallback = async (userId) => {
  try {
    const { data: connections, error } = await supabase
      .from('social_connections')
      .select('platform, is_connected, platform_username, last_verified, connected_at')
      .eq('user_id', userId)
      .eq('is_connected', true);

    if (error) throw error;

    // Format response
    const connectionStatus = {};
    const platforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube'];

    platforms.forEach(platform => {
      const connection = connections?.find(c => c.platform === platform);
      const capitalizedPlatform = platform.charAt(0).toUpperCase() + platform.slice(1);

      connectionStatus[capitalizedPlatform] = {
        connected: !!connection,
        username: connection?.platform_username || null,
        connectedAt: connection?.connected_at || null,
        lastVerified: connection?.last_verified || null
      };
    });

    const connectedCount = Object.values(connectionStatus).filter(s => s.connected).length;

    return {
      success: true,
      connections: connectionStatus,
      summary: {
        connectedCount,
        totalPlatforms: platforms.length,
        connectionRate: Math.round((connectedCount / platforms.length) * 100)
      },
      n8nAvailable: false // fallback mode
    };

  } catch (error) {
    console.error('Fallback connection check error:', error);
    return {
      success: false,
      error: error.message,
      connections: {},
      summary: { connectedCount: 0, totalPlatforms: 6, connectionRate: 0 },
      n8nAvailable: false
    };
  }
};

/**
 * Send a post to n8n for processing
 */
export const sendPostToN8n = async (postData, userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/post-to-social`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        postData,
        userId
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        queueId: data.queueId,
        platforms: data.platforms,
        message: data.message,
        n8nResponse: data.n8nResponse
      };
    } else {
      throw new Error(data.error || 'Failed to send post to n8n');
    }

  } catch (error) {
    console.error('Send post to n8n error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update connection status (called by n8n webhook)
 */
export const updateConnectionStatus = async (userId, platform, action, connectionData = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/update-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        platform,
        action,
        ...connectionData
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        message: data.message,
        platform: data.platform,
        action: data.action
      };
    } else {
      throw new Error(data.error || 'Failed to update connection');
    }

  } catch (error) {
    console.error('Update connection status error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get pending posts from queue
 */
export const getQueuedPosts = async (userId, status = 'queued') => {
  try {
    const { data: posts, error } = await supabase
      .from('n8n_post_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      posts: posts || []
    };

  } catch (error) {
    console.error('Get queued posts error:', error);
    return {
      success: false,
      error: error.message,
      posts: []
    };
  }
};

/**
 * Retry a failed post
 */
export const retryPost = async (queueId, userId) => {
  try {
    // Get the post data
    const { data: post, error: fetchError } = await supabase
      .from('n8n_post_queue')
      .select('*')
      .eq('id', queueId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !post) {
      throw new Error('Post not found');
    }

    // Reset status and increment retry count
    const { error: updateError } = await supabase
      .from('n8n_post_queue')
      .update({
        status: 'queued',
        retry_count: (post.retry_count || 0) + 1,
        error_message: null,
        n8n_response: null,
        updated_at: new Date()
      })
      .eq('id', queueId);

    if (updateError) throw updateError;

    // Send to n8n again
    return await sendPostToN8n(post.post_data.post, userId);

  } catch (error) {
    console.error('Retry post error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check if n8n integration is configured
 */
export const isN8nConfigured = () => {
  return !!(
    import.meta.env.VITE_N8N_WEBHOOK_URL ||
    import.meta.env.VITE_N8N_CONNECTION_WEBHOOK_URL
  );
};

/**
 * Get n8n configuration status
 */
export const getN8nStatus = () => {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
  const connectionWebhookUrl = import.meta.env.VITE_N8N_CONNECTION_WEBHOOK_URL;

  return {
    configured: !!(webhookUrl && connectionWebhookUrl),
    webhookUrl: !!webhookUrl,
    connectionWebhookUrl: !!connectionWebhookUrl,
    apiBaseUrl: API_BASE_URL
  };
};
