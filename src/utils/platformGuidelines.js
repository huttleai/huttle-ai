/**
 * Platform-Specific Guidelines for AI Content Generation
 * 
 * Centralized metadata for each social media platform including:
 * - Character limits
 * - Hashtag best practices
 * - Hook conventions
 * - CTA norms
 * - Content format recommendations
 */

export const PLATFORMS = {
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: 'Instagram',
    charLimit: 2200,
    hashtags: {
      count: '8-15',
      min: 8,
      max: 15,
      style: 'Mix of popular (1M+ posts), medium (100K-1M), and niche (<100K) hashtags',
      tip: 'Place hashtags in caption or first comment. Use a mix of broad and niche tags.'
    },
    hooks: {
      style: 'Visual-first with punchy opening line',
      examples: ['Stop scrolling if...', 'POV:', 'This changed everything...'],
      tip: 'Lead with the most visually striking moment or a bold statement that creates curiosity.'
    },
    ctas: {
      style: 'Engagement-focused',
      examples: ['Save this for later', 'Share with someone who needs this', 'Drop a 🔥 if you agree', 'Link in bio', 'DM me "START"'],
      tip: 'Instagram rewards saves and shares. Ask specific questions to drive comments.'
    },
    contentFormats: ['Feed Post', 'Carousel', 'Reel', 'Story'],
    audienceStyle: 'Visual-first, aesthetic-focused, lifestyle-oriented'
  },
  
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'Music',
    charLimit: 4000,
    hashtags: {
      count: '3-5',
      min: 3,
      max: 5,
      style: 'Trending hashtags + niche-specific. Include #fyp sparingly.',
      tip: 'Less is more. Use trending sounds/hashtags for discoverability.'
    },
    hooks: {
      style: 'First 1-3 seconds hook, pattern interrupt, direct address',
      examples: ['Wait for it...', 'Nobody talks about this...', 'I was today years old when...', 'The secret that [industry] doesn\'t want you to know'],
      tip: 'You have 1-3 seconds to hook viewers. Start mid-action or with a bold claim.'
    },
    ctas: {
      style: 'Casual and conversational',
      examples: ['Follow for part 2', 'Duet this with your reaction', 'Comment your...', 'Stitch this if...', 'Follow for more tips'],
      tip: 'TikTok rewards watch time and follows. Tease future content.'
    },
    contentFormats: ['Short Video', 'Duet', 'Stitch', 'LIVE'],
    audienceStyle: 'Authentic, raw, entertaining, trend-driven'
  },
  
  twitter: {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: 'Twitter',
    charLimit: 280,
    hashtags: {
      count: '1-2',
      min: 0,
      max: 2,
      style: 'Minimal - only use highly relevant trending hashtags',
      tip: 'Hashtags are less important on X. Focus on the content itself.'
    },
    hooks: {
      style: 'Bold statements, hot takes, threads with compelling first tweet',
      examples: ['Unpopular opinion:', 'Hot take:', 'Thread: 🧵', 'Here\'s what nobody tells you about...'],
      tip: 'First line must stand alone and demand attention. Controversy drives engagement.'
    },
    ctas: {
      style: 'Retweet and reply focused',
      examples: ['RT if you agree', 'Reply with your take', 'Follow for more', 'Bookmark this', 'Quote tweet your experience'],
      tip: 'X rewards replies and retweets. Ask questions or share hot takes.'
    },
    contentFormats: ['Tweet', 'Thread', 'Quote Tweet', 'Poll'],
    audienceStyle: 'Opinionated, witty, news-driven, conversational'
  },
  
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: 'Facebook',
    charLimit: 63206,
    hashtags: {
      count: '2-5',
      min: 1,
      max: 5,
      style: 'Minimal, relevant hashtags only',
      tip: 'Hashtags are less effective on Facebook. Focus on shareability.'
    },
    hooks: {
      style: 'Relatable, emotional, story-driven',
      examples: ['True story:', 'Can we talk about...', 'This happened to me today...', 'Who else feels this way?'],
      tip: 'Facebook users engage with relatable, emotional content. Tell stories.'
    },
    ctas: {
      style: 'Share and comment focused',
      examples: ['Share if you agree', 'Tag someone who...', 'Comment your thoughts', 'React with ❤️ if...', 'Click the link to learn more'],
      tip: 'Facebook rewards shares above all. Create content worth sharing.'
    },
    contentFormats: ['Post', 'Video', 'Live', 'Story', 'Reel'],
    audienceStyle: 'Community-focused, family-friendly, longer-form content'
  },
  
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    icon: 'Youtube',
    charLimit: 5000,
    hashtags: {
      count: '3-5',
      min: 2,
      max: 5,
      style: 'Relevant keywords as hashtags in description',
      tip: 'Add hashtags above the title in description. First 3 show above title.'
    },
    hooks: {
      style: 'Promise value, create curiosity, pattern interrupt in first 30 seconds',
      examples: ['In this video, you\'ll learn...', 'By the end of this video...', 'What if I told you...', 'The biggest mistake people make...'],
      tip: 'You have 30 seconds to hook. Promise specific value and deliver.'
    },
    ctas: {
      style: 'Subscribe and engagement focused',
      examples: ['Subscribe and hit the bell', 'Like if this helped', 'Comment your questions below', 'Check out this video next', 'Join the membership'],
      tip: 'Ask for subs/likes at high-value moments, not just the end.'
    },
    contentFormats: ['Long-form Video', 'Short', 'Live', 'Community Post'],
    audienceStyle: 'Educational, entertainment, in-depth, searchable'
  },
  
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'Linkedin',
    charLimit: 3000,
    hashtags: {
      count: '3-5',
      min: 3,
      max: 5,
      style: 'Professional, industry-specific hashtags',
      tip: 'Use industry hashtags and follow trending professional topics.'
    },
    hooks: {
      style: 'Professional insight, contrarian take, personal story with business lesson',
      examples: ['I made a mistake that cost me...', 'Unpopular opinion in [industry]:', 'After 10 years in [field], here\'s what I learned:', '3 things I wish I knew when...'],
      tip: 'LinkedIn rewards vulnerability and professional insights. Lead with a hook that promises value.'
    },
    ctas: {
      style: 'Professional engagement',
      examples: ['Agree? ♻️ Repost to share', 'Follow for more insights', 'Drop your thoughts below', 'Connect with me', 'Link in comments'],
      tip: 'Reposts and comments boost reach. Ask thought-provoking questions.'
    },
    contentFormats: ['Post', 'Article', 'Document/Carousel', 'Video', 'Newsletter'],
    audienceStyle: 'Professional, career-focused, B2B, thought leadership'
  },
  
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    icon: 'Image',
    charLimit: 500,
    hashtags: {
      count: '2-5',
      min: 2,
      max: 5,
      style: 'Keyword-rich, searchable hashtags',
      tip: 'Pinterest is a search engine. Use keywords people would search for.'
    },
    hooks: {
      style: 'Descriptive, keyword-rich, benefit-focused',
      examples: ['How to...', '10 ways to...', 'The ultimate guide to...', 'Easy DIY...'],
      tip: 'Pinterest users are planners. Focus on aspirational, actionable content.'
    },
    ctas: {
      style: 'Save and click-through focused',
      examples: ['Save for later', 'Click to read more', 'Get the full tutorial', 'Shop the look', 'Pin this for later'],
      tip: 'Drive saves and website clicks. Evergreen content performs best.'
    },
    contentFormats: ['Pin', 'Idea Pin', 'Video Pin'],
    audienceStyle: 'Aspirational, planning-focused, DIY, visual discovery'
  },
  
  threads: {
    id: 'threads',
    name: 'Threads',
    icon: 'AtSign',
    charLimit: 500,
    hashtags: {
      count: '0-2',
      min: 0,
      max: 2,
      style: 'Minimal to none - Threads de-emphasizes hashtags',
      tip: 'Focus on the content. Hashtags are not primary discovery on Threads.'
    },
    hooks: {
      style: 'Conversational, Twitter-like but more personal',
      examples: ['Random thought:', 'Can we normalize...', 'Hot take:', 'I\'ve been thinking...'],
      tip: 'Threads favors authentic, conversational content. Be yourself.'
    },
    ctas: {
      style: 'Casual engagement',
      examples: ['Thoughts?', 'Reply with yours', 'Share this with your friend', 'Follow for more'],
      tip: 'Threads rewards conversation. Ask questions, share opinions.'
    },
    contentFormats: ['Thread Post', 'Photo Thread', 'Video Thread'],
    audienceStyle: 'Casual, conversational, community-focused, Instagram-adjacent'
  }
};

/**
 * Get platform by ID
 * @param {string} platformId - Platform identifier
 * @returns {Object|null} Platform object or null
 */
export function getPlatform(platformId) {
  return PLATFORMS[platformId?.toLowerCase()] || null;
}

/**
 * Get all platforms as an array
 * @returns {Array} Array of platform objects
 */
export function getAllPlatforms() {
  return Object.values(PLATFORMS);
}

/**
 * Get platform names for dropdown options
 * @returns {Array} Array of {id, name} objects
 */
export function getPlatformOptions() {
  return Object.values(PLATFORMS).map(p => ({
    id: p.id,
    name: p.name,
    icon: p.icon
  }));
}

/**
 * Get hashtag guidelines for a platform
 * @param {string} platformId - Platform identifier
 * @returns {Object} Hashtag guidelines
 */
export function getHashtagGuidelines(platformId) {
  const platform = getPlatform(platformId);
  return platform?.hashtags || {
    count: '5-10',
    min: 5,
    max: 10,
    style: 'Mix of popular and niche hashtags',
    tip: 'Use relevant hashtags for discoverability.'
  };
}

/**
 * Get hook guidelines for a platform
 * @param {string} platformId - Platform identifier
 * @returns {Object} Hook guidelines
 */
export function getHookGuidelines(platformId) {
  const platform = getPlatform(platformId);
  return platform?.hooks || {
    style: 'Attention-grabbing opening',
    examples: ['Did you know...', 'Here\'s the thing...'],
    tip: 'Start strong to capture attention.'
  };
}

/**
 * Get CTA guidelines for a platform
 * @param {string} platformId - Platform identifier
 * @returns {Object} CTA guidelines
 */
export function getCTAGuidelines(platformId) {
  const platform = getPlatform(platformId);
  return platform?.ctas || {
    style: 'Clear call-to-action',
    examples: ['Learn more', 'Follow for updates'],
    tip: 'Tell your audience what to do next.'
  };
}

/**
 * Get character limit for a platform
 * @param {string} platformId - Platform identifier
 * @returns {number} Character limit
 */
export function getCharacterLimit(platformId) {
  const platform = getPlatform(platformId);
  return platform?.charLimit || 2200;
}

/**
 * Build platform context string for AI prompts
 * @param {string} platformId - Platform identifier
 * @param {string} contentType - Type of content (caption, hashtag, hook, cta)
 * @returns {string} Platform context for prompts
 */
export function buildPlatformContext(platformId, contentType = 'general') {
  const platform = getPlatform(platformId);
  
  if (!platform) {
    return 'Platform: General social media';
  }
  
  let context = `PLATFORM: ${platform.name}
Character Limit: ${platform.charLimit} characters
Audience Style: ${platform.audienceStyle}
Content Formats: ${platform.contentFormats.join(', ')}`;

  if (contentType === 'hashtag' || contentType === 'caption') {
    context += `
Hashtag Guidelines: Use ${platform.hashtags.count} hashtags
Hashtag Style: ${platform.hashtags.style}
Hashtag Tip: ${platform.hashtags.tip}`;
  }
  
  if (contentType === 'hook' || contentType === 'caption') {
    context += `
Hook Style: ${platform.hooks.style}
Hook Examples: ${platform.hooks.examples.join(', ')}
Hook Tip: ${platform.hooks.tip}`;
  }
  
  if (contentType === 'cta' || contentType === 'caption') {
    context += `
CTA Style: ${platform.ctas.style}
CTA Examples: ${platform.ctas.examples.join(', ')}
CTA Tip: ${platform.ctas.tip}`;
  }
  
  return context;
}

/**
 * Get platform-specific tips for display in UI
 * @param {string} platformId - Platform identifier
 * @param {string} contentType - Type of content being generated
 * @returns {Object} Tips object with title and items
 */
export function getPlatformTips(platformId, contentType) {
  const platform = getPlatform(platformId);
  
  if (!platform) {
    return { title: 'Tips', items: ['Select a platform for specific tips'] };
  }
  
  const tips = {
    title: `${platform.name} Tips`,
    items: []
  };
  
  switch (contentType) {
    case 'caption':
      tips.items = [
        `Character limit: ${platform.charLimit.toLocaleString()}`,
        `Use ${platform.hashtags.count} hashtags`,
        platform.hooks.tip,
        platform.ctas.tip
      ];
      break;
    case 'hashtag':
      tips.items = [
        `Recommended: ${platform.hashtags.count} hashtags`,
        platform.hashtags.style,
        platform.hashtags.tip
      ];
      break;
    case 'hook':
      tips.items = [
        platform.hooks.style,
        `Examples: ${platform.hooks.examples.slice(0, 2).join(', ')}`,
        platform.hooks.tip
      ];
      break;
    case 'cta':
      tips.items = [
        platform.ctas.style,
        `Examples: ${platform.ctas.examples.slice(0, 3).join(', ')}`,
        platform.ctas.tip
      ];
      break;
    case 'visual':
      tips.items = [
        `Formats: ${platform.contentFormats.join(', ')}`,
        `Style: ${platform.audienceStyle}`,
        platform.hooks.tip
      ];
      break;
    default:
      tips.items = [
        `Character limit: ${platform.charLimit.toLocaleString()}`,
        `Audience: ${platform.audienceStyle}`
      ];
  }
  
  return tips;
}











