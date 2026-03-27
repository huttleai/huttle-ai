/** Shared with AI Power Tools visual brainstorm — platform format groups. */
export const PLATFORM_FORMATS = {
  Instagram: ['Image', 'Carousel', 'Video', 'Story', 'Reel'],
  TikTok: ['Short Video', 'Duet', 'Stitch', 'LIVE'],
  'X/Twitter': ['Image', 'Video', 'Thread'],
  Facebook: ['Image', 'Video', 'Reel', 'Story'],
  YouTube: ['Short', 'Long-Form Video', 'Community Post'],
};

export const VISUAL_PLATFORM_ID_TO_FORMAT_GROUP = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'X/Twitter',
  facebook: 'Facebook',
  youtube: 'YouTube',
};

export function getFormatsForVisualPlatformId(platformId) {
  const key = VISUAL_PLATFORM_ID_TO_FORMAT_GROUP[String(platformId || '').toLowerCase()];
  if (key && PLATFORM_FORMATS[key]) return PLATFORM_FORMATS[key];
  return PLATFORM_FORMATS.Instagram;
}
