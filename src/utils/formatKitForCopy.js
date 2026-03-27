/**
 * Formats kit slot contents for clipboard copy, platform-specific ordering.
 * @param {string} platform - 'instagram', 'tiktok', etc.
 * @param {Object} slots - { opening_line: 'text', caption: 'text', hashtags: 'text', ... }
 * @returns {string} Formatted text ready to paste
 */
export const formatKitForCopy = (platform, slots) => {
  const parts = [];

  switch (platform) {
    case 'instagram':
      if (slots.opening_line) parts.push(slots.opening_line);
      if (slots.caption) parts.push(slots.caption);
      if (slots.cta) parts.push(slots.cta);
      if (slots.hashtags) parts.push(slots.hashtags);
      break;

    case 'tiktok':
      if (slots.caption) parts.push(slots.caption);
      if (slots.cta) parts.push(slots.cta);
      if (slots.hashtags) parts.push(slots.hashtags);
      break;

    case 'youtube':
      if (slots.title) parts.push(`Title: ${slots.title}`);
      if (slots.description) parts.push(slots.description);
      if (slots.cta) parts.push(slots.cta);
      if (slots.tags) parts.push(`Tags: ${slots.tags}`);
      break;

    case 'twitter':
      // Twitter: post text with hashtags inline on same line
      {
        let tweet = slots.post_text || '';
        if (slots.hashtags) tweet += ` ${slots.hashtags}`;
        if (tweet.trim()) parts.push(tweet.trim());
      }
      break;

    case 'facebook':
      if (slots.opening_line) parts.push(slots.opening_line);
      if (slots.caption) parts.push(slots.caption);
      if (slots.cta) parts.push(slots.cta);
      if (slots.hashtags) parts.push(slots.hashtags);
      break;

    default:
      // Fallback: just join whatever slots exist
      Object.values(slots).filter(Boolean).forEach((v) => parts.push(v));
  }

  return parts.join('\n\n');
};
