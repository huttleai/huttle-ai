// Utility functions for downloading post content

/**
 * Download a single post as a formatted text file
 */
export const downloadPostAsText = (post) => {
  const content = formatPostForDownload(post);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(post.title)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Download a single post as JSON
 */
export const downloadPostAsJSON = (post) => {
  const blob = new Blob([JSON.stringify(post, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(post.title)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Download multiple posts as a ZIP-like package (JSON format)
 */
export const downloadMultiplePosts = (posts) => {
  const packageData = {
    exportDate: new Date().toISOString(),
    totalPosts: posts.length,
    posts: posts,
  };
  
  const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `huttle-posts-export-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Format post content as readable text
 */
const formatPostForDownload = (post) => {
  let content = '';
  
  content += `═══════════════════════════════════════\n`;
  content += `   HUTTLE AI - POST EXPORT\n`;
  content += `═══════════════════════════════════════\n\n`;
  
  content += `📝 TITLE: ${post.title}\n\n`;
  
  if (post.platforms && post.platforms.length > 0) {
    content += `📱 PLATFORMS: ${post.platforms.join(', ')}\n\n`;
  }
  
  if (post.contentType) {
    content += `📋 CONTENT TYPE: ${post.contentType}\n\n`;
  }
  
  if (post.scheduledDate && post.scheduledTime) {
    content += `📅 SCHEDULED: ${post.scheduledDate} at ${post.scheduledTime}\n\n`;
  }
  
  content += `═══════════════════════════════════════\n`;
  content += `   CAPTION\n`;
  content += `═══════════════════════════════════════\n\n`;
  content += `${post.caption || 'No caption provided'}\n\n`;
  
  if (post.hashtags) {
    content += `═══════════════════════════════════════\n`;
    content += `   HASHTAGS\n`;
    content += `═══════════════════════════════════════\n\n`;
    content += `${post.hashtags}\n\n`;
  }
  
  if (post.keywords) {
    content += `═══════════════════════════════════════\n`;
    content += `   KEYWORDS\n`;
    content += `═══════════════════════════════════════\n\n`;
    content += `${post.keywords}\n\n`;
  }
  
  if (post.imagePrompt) {
    content += `═══════════════════════════════════════\n`;
    content += `   IMAGE CONCEPT\n`;
    content += `═══════════════════════════════════════\n\n`;
    content += `${post.imagePrompt}\n\n`;
  }
  
  if (post.videoPrompt) {
    content += `═══════════════════════════════════════\n`;
    content += `   VIDEO CONCEPT\n`;
    content += `═══════════════════════════════════════\n\n`;
    content += `${post.videoPrompt}\n\n`;
  }
  
  content += `═══════════════════════════════════════\n`;
  content += `   METADATA\n`;
  content += `═══════════════════════════════════════\n\n`;
  content += `Created: ${post.createdAt || 'N/A'}\n`;
  content += `Status: ${post.status || 'N/A'}\n`;
  content += `Post ID: ${post.id}\n\n`;
  
  content += `═══════════════════════════════════════\n`;
  content += `   Exported from Huttle AI\n`;
  content += `   ${new Date().toLocaleString()}\n`;
  content += `═══════════════════════════════════════\n`;
  
  return content;
};

/**
 * Sanitize filename for safe download
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .substring(0, 50);
};

/**
 * Copy post content to clipboard
 */
export const copyPostToClipboard = async (post) => {
  const content = formatPostForDownload(post);
  
  try {
    await navigator.clipboard.writeText(content);
    return { success: true, message: 'Post copied to clipboard!' };
  } catch {
    return { success: false, message: 'Failed to copy to clipboard' };
  }
};

/**
 * Download post content optimized for specific platform
 */
export const downloadForPlatform = (post, platform) => {
  let content = '';
  
  switch (platform.toLowerCase()) {
    case 'instagram':
      content += `${post.caption || ''}\n\n`;
      content += `${post.hashtags || ''}\n`;
      if (post.imagePrompt) {
        content += `\n---\nImage Concept: ${post.imagePrompt}\n`;
      }
      break;
      
    case 'twitter':
    case 'x': {
      // Twitter has character limit
      const twitterCaption = post.caption ? post.caption.substring(0, 250) : '';
      content += `${twitterCaption}\n`;
      if (post.hashtags) {
        const hashtagsLength = post.hashtags.length;
        if (twitterCaption.length + hashtagsLength < 280) {
          content += `${post.hashtags}\n`;
        }
      }
      break;
    }
      
    case 'linkedin':
      content += `${post.caption || ''}\n\n`;
      if (post.keywords) {
        content += `Keywords: ${post.keywords}\n\n`;
      }
      content += `${post.hashtags || ''}\n`;
      break;
      
    case 'facebook':
      content += `${post.caption || ''}\n\n`;
      content += `${post.hashtags || ''}\n`;
      break;
      
    case 'tiktok':
      content += `${post.caption || ''}\n\n`;
      content += `${post.hashtags || ''}\n\n`;
      if (post.videoPrompt) {
        content += `Video Concept: ${post.videoPrompt}\n`;
      }
      break;

    case 'youtube':
      content += `Title: ${post.title}\n\n`;
      content += `Description:\n${post.caption || ''}\n\n`;
      if (post.hashtags) {
        content += `Tags: ${post.hashtags.replace(/#/g, '')}\n\n`;
      }
      if (post.videoPrompt) {
        content += `Video Concept: ${post.videoPrompt}\n`;
      }
      break;
      
    default:
      content = formatPostForDownload(post);
  }
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(post.title)}_${platform}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

