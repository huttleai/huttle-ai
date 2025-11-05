import { checkConnectionStatus } from '../services/n8nAPI';

/**
 * Check if social media accounts are connected (async version)
 * Queries Supabase for real connection status, with fallback to localStorage
 */
export const checkSocialConnections = async (userId = null) => {
  try {
    // If no userId provided, fallback to localStorage for demo/testing
    if (!userId) {
      return getLocalStorageConnections();
    }

    // Try n8n API first (which queries Supabase)
    const statusResult = await checkConnectionStatus(userId);

    if (statusResult.success && statusResult.connections) {
      // Convert from API format to legacy format for backward compatibility
      const connections = {
        Instagram: statusResult.connections.Instagram?.connected || false,
        Facebook: statusResult.connections.Facebook?.connected || false,
        Twitter: statusResult.connections.Twitter?.connected || false,
        X: statusResult.connections.Twitter?.connected || false, // X is Twitter
        LinkedIn: statusResult.connections.LinkedIn?.connected || false,
        TikTok: statusResult.connections.TikTok?.connected || false,
        YouTube: statusResult.connections.YouTube?.connected || false,
      };
      return connections;
    }

    // Fallback to localStorage if API fails
    console.warn('Connection check failed, falling back to localStorage');
    return getLocalStorageConnections();

  } catch (error) {
    console.error('Error checking social connections:', error);
    // Fallback to localStorage on error
    return getLocalStorageConnections();
  }
};

/**
 * Get connections from localStorage (fallback for demo/testing)
 */
const getLocalStorageConnections = () => {
  try {
    const stored = localStorage.getItem('socialConnections');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert to expected format
      return {
        Instagram: parsed.instagram || false,
        Facebook: parsed.facebook || false,
        Twitter: parsed.twitter || false,
        X: parsed.twitter || false, // X is Twitter
        LinkedIn: parsed.linkedin || false,
        TikTok: parsed.tiktok || false,
        YouTube: parsed.youtube || false,
      };
    }
  } catch (error) {
    console.warn('Error reading localStorage connections:', error);
  }
  return getEmptyConnectionState();
};

/**
 * Set connection status for a platform (localStorage fallback)
 * Note: This is a fallback method for when n8n is not configured.
 * In production with n8n, use n8nAPI.updateConnectionStatus() instead.
 */
export const setSocialConnection = (platform, isConnected) => {
  // LocalStorage fallback for demo/testing when n8n is not configured
  const connections = JSON.parse(localStorage.getItem('socialConnections') || '{}');
  const platformKey = platform.toLowerCase();
  connections[platformKey] = isConnected;
  localStorage.setItem('socialConnections', JSON.stringify(connections));
};

/**
 * Helper function to return empty connection state
 */
const getEmptyConnectionState = () => ({
  Instagram: false,
  Facebook: false,
  Twitter: false,
  X: false,
  LinkedIn: false,
  TikTok: false,
  YouTube: false,
});

/**
 * Validate post before attempting to publish
 */
export const validatePost = (post) => {
  const errors = [];
  const warnings = [];
  const missing = [];

  // Check required fields
  if (!post.title || post.title.trim() === '') {
    missing.push('title');
    errors.push('Post title is required');
  }

  if (!post.caption || post.caption.trim() === '') {
    warnings.push('Caption is recommended for better engagement');
  }

  if (!post.platforms || post.platforms.length === 0) {
    errors.push('No platforms selected');
    missing.push('platforms');
  }

  if (!post.scheduledDate || !post.scheduledTime) {
    missing.push('schedule time');
    warnings.push('Schedule time not set');
  }

  // Check platform-specific requirements
  if (post.platforms) {
    post.platforms.forEach(platform => {
      const platformLower = platform.toLowerCase();
      
      // Instagram requires image or video
      if (platformLower === 'instagram') {
        if (!post.imagePrompt && !post.videoPrompt) {
          warnings.push(`${platform}: Consider adding image/video concept`);
        }
      }

      // Twitter character limit
      if (platformLower === 'twitter' || platformLower === 'x') {
        const tweetLength = (post.caption || '').length + (post.hashtags || '').length + 1;
        if (tweetLength > 280) {
          errors.push(`${platform}: Content exceeds 280 characters (${tweetLength})`);
        }
      }

      // TikTok requires video
      if (platformLower === 'tiktok') {
        if (!post.videoPrompt) {
          warnings.push(`${platform}: Video concept recommended`);
        }
      }

      // YouTube requires video
      if (platformLower === 'youtube') {
        if (!post.videoPrompt) {
          warnings.push(`${platform}: Video concept required`);
        }
      }
    });
  }

  // Check hashtags
  if (post.hashtags) {
    const hashtagCount = (post.hashtags.match(/#/g) || []).length;
    if (hashtagCount > 30) {
      warnings.push('Too many hashtags (recommended: 5-10 for best engagement)');
    } else if (hashtagCount === 0 && post.hashtags.trim() !== '') {
      warnings.push('Hashtags should start with # symbol');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missing,
  };
};

/**
 * Check if platforms are connected before posting (async version)
 */
export const checkPlatformConnections = async (post, userId = null) => {
  const connections = await checkSocialConnections(userId);
  const unconnected = [];

  if (post.platforms) {
    post.platforms.forEach(platform => {
      if (!connections[platform]) {
        unconnected.push(platform);
      }
    });
  }

  return {
    allConnected: unconnected.length === 0,
    unconnected,
  };
};


