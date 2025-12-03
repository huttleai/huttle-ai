// Deep link utilities for opening social media apps with pre-filled content

/**
 * Detect if user is on mobile device
 */
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Open Instagram app and copy content to clipboard
 * Instagram doesn't support pre-filling content, so we copy it for the user
 */
export const openInstagram = async (post) => {
  const content = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
  
  try {
    // Copy to clipboard
    await navigator.clipboard.writeText(content);
    
    // Deep link to Instagram
    const instagramUrl = 'instagram://';
    
    // Try to open the app
    window.location.href = instagramUrl;
    
    // Fallback to web version after short delay if app doesn't open
    setTimeout(() => {
      window.open('https://www.instagram.com/', '_blank');
    }, 1500);
    
    return {
      success: true,
      message: 'Content copied! Instagram will open - paste your content to create a post.',
      platform: 'Instagram'
    };
  } catch {
    return {
      success: false,
      message: 'Failed to copy content. Please try again.',
      platform: 'Instagram'
    };
  }
};

/**
 * Open Facebook with pre-filled post
 */
export const openFacebook = (post) => {
  const content = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
  
  // Facebook sharing URL
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://www.facebook.com')}&quote=${encodeURIComponent(content)}`;
  
  // Try mobile app first
  const mobileUrl = `fb://share?text=${encodeURIComponent(content)}`;
  
  if (isMobile()) {
    window.location.href = mobileUrl;
    setTimeout(() => {
      window.open(facebookUrl, '_blank');
    }, 1500);
  } else {
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  }
  
  return {
    success: true,
    message: 'Opening Facebook...',
    platform: 'Facebook'
  };
};

/**
 * Open Twitter/X with pre-filled tweet
 */
export const openTwitter = (post) => {
  let content = `${post.caption || ''} ${post.hashtags || ''}`.trim();
  
  // Twitter has a 280 character limit
  if (content.length > 280) {
    content = content.substring(0, 277) + '...';
  }
  
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`;
  
  // Try mobile app first
  const mobileUrl = `twitter://post?message=${encodeURIComponent(content)}`;
  
  if (isMobile()) {
    window.location.href = mobileUrl;
    setTimeout(() => {
      window.open(twitterUrl, '_blank');
    }, 1500);
  } else {
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  }
  
  return {
    success: true,
    message: 'Opening Twitter/X...',
    platform: 'Twitter/X'
  };
};

/**
 * Open TikTok app and copy content
 */
export const openTikTok = async (post) => {
  const content = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
  
  try {
    // Copy to clipboard
    await navigator.clipboard.writeText(content);
    
    // Deep link to TikTok
    const tiktokUrl = 'tiktok://';
    
    // Try to open the app
    window.location.href = tiktokUrl;
    
    // Fallback to web version
    setTimeout(() => {
      window.open('https://www.tiktok.com/upload', '_blank');
    }, 1500);
    
    return {
      success: true,
      message: 'Content copied! TikTok will open - paste your content.',
      platform: 'TikTok'
    };
  } catch {
    return {
      success: false,
      message: 'Failed to copy content. Please try again.',
      platform: 'TikTok'
    };
  }
};

/**
 * Open YouTube Studio
 */
export const openYouTube = async (post) => {
  const content = `Title: ${post.title}\n\nDescription:\n${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
  
  try {
    // Copy to clipboard
    await navigator.clipboard.writeText(content);
    
    // Open YouTube Studio
    window.open('https://studio.youtube.com/channel/UC/videos/upload', '_blank');
    
    return {
      success: true,
      message: 'Content copied! YouTube Studio will open.',
      platform: 'YouTube'
    };
  } catch {
    return {
      success: false,
      message: 'Failed to open YouTube Studio.',
      platform: 'YouTube'
    };
  }
};

/**
 * Main function to open social media platform
 */
export const openInSocialMedia = async (post, platform) => {
  const platformLower = platform.toLowerCase();
  
  switch (platformLower) {
    case 'instagram':
      return await openInstagram(post);
    case 'facebook':
      return openFacebook(post);
    case 'twitter':
    case 'x':
      return openTwitter(post);
    case 'tiktok':
      return openTikTok(post);
    case 'youtube':
      return await openYouTube(post);
    default:
      return {
        success: false,
        message: `Platform ${platform} not supported yet.`,
        platform
      };
  }
};

/**
 * Open all selected platforms for a post
 */
export const openInAllPlatforms = async (post) => {
  if (!post.platforms || post.platforms.length === 0) {
    return {
      success: false,
      message: 'No platforms selected for this post.'
    };
  }
  
  const results = [];
  
  for (const platform of post.platforms) {
    const result = await openInSocialMedia(post, platform);
    results.push(result);
    
    // Add delay between opening multiple platforms
    if (post.platforms.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return {
    success: true,
    message: `Opened ${results.length} platform(s)`,
    results
  };
};

