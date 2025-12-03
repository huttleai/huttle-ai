/**
 * Post Validation Utilities
 * 
 * NOTE: Connection checking is NOT needed for deep linking.
 * Huttle AI uses deep links to open native apps - no OAuth required.
 * 
 * This file provides:
 * - Post validation before publishing
 * - Platform-specific content requirements checking
 */

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
 * DEPRECATED: Check platform connections
 * Deep linking doesn't require OAuth connections - always returns true
 * Kept for backward compatibility
 */
export const checkPlatformConnections = async (post, userId = null) => {
  // Deep linking doesn't require connections
  // Users open the app directly and post manually
  return {
    allConnected: true,
    unconnected: [],
  };
};

/**
 * DEPRECATED: Check social connections
 * Deep linking doesn't require OAuth connections
 * Kept for backward compatibility
 */
export const checkSocialConnections = async (userId = null) => {
  // Deep linking doesn't require connections
  // Return empty state to indicate no connections needed
  return {
    Instagram: false,
    Facebook: false,
    Twitter: false,
    X: false,
    TikTok: false,
    YouTube: false,
  };
};

/**
 * DEPRECATED: Set social connection
 * Deep linking doesn't require OAuth connections
 * Kept for backward compatibility
 */
export const setSocialConnection = (platform, isConnected) => {
  // No-op - deep linking doesn't require connections
  console.log(`[Info] setSocialConnection called for ${platform}. Deep linking doesn't require OAuth connections.`);
};
