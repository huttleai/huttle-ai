export const PLATFORM_CONTENT_RULES = {
  tiktok: {
    displayName: 'TikTok',
    hashtags: {
      max: 5,
      optimal: '3–5',
      strategy: 'Mix 1 broad + 1–2 niche + 1 trending. Hard cap of 5 enforced by platform since Sept 2025.',
    },
    caption: {
      maxChars: 4000,
      visibleBeforeTruncation: 100,
      tip: 'Front-load keywords in first 100 chars — TikTok indexes captions for search.',
    },
    video: {
      optimalSeconds: '15–30s for reach, 60–90s for educational/storytelling',
      maxSeconds: 600,
      aspectRatio: '9:16 vertical required — other ratios get letterboxed',
      hook: 'Must land in first 1–2 seconds',
    },
    promptRule: 'Generate exactly 3–5 hashtags. NEVER exceed 5. TikTok hard-caps at 5 since Sept 2025.',
  },

  instagram: {
    displayName: 'Instagram',
    hashtags: {
      max: 5,
      optimal: '3–5',
      strategy: 'Instagram officially limited hashtags to 5 per post/Reel as of Dec 2025. Use targeted, relevant tags only.',
    },
    caption: {
      maxChars: 2200,
      visibleBeforeTruncation: 125,
      tip: 'Hook must be in first 125 chars — everything else is hidden behind "more".',
    },
    video: {
      optimalSeconds: '15–60s for Reels (algorithm recommends under 90s for discovery)',
      maxSecondsReels: 90,
      maxSecondsStory: 60,
      aspectRatio: '9:16 vertical for Reels; 3:4 (1080x1440) for feed posts',
      hook: 'Hook must land in first 1.5 seconds',
    },
    promptRule: 'Generate exactly 3–5 hashtags. NEVER exceed 5. Instagram enforced this limit Dec 2025.',
  },

  // LinkedIn not yet supported — rules hidden from productized platform selectors
  // linkedin: {
  //   displayName: 'LinkedIn',
  //   ...
  // },

  youtube: {
    displayName: 'YouTube',
    hashtags: {
      max: 60,
      optimal: '2–3',
      strategy: 'YouTube ignores all hashtags if you use over 60. Use 2–3 in description only. Niche + location + trending mix.',
    },
    caption: {
      titleMaxChars: 100,
      titleVisibleInSearch: 70,
      descriptionMaxChars: 5000,
      descriptionVisibleInSearch: 157,
      tip: 'Lead title and description with keywords. First 157 chars of description appear in search.',
    },
    video: {
      optimalMinutes: '7–15 min for watch time; Shorts under 60s',
      aspectRatio: '16:9 for standard; 9:16 for Shorts',
      hook: 'First 30 seconds must deliver value or viewers leave',
    },
    promptRule: 'Generate 2–3 hashtags for description placement only. Prioritize keyword-rich title and description over hashtag volume.',
  },

  x: {
    displayName: 'X (Twitter)',
    hashtags: {
      max: 2,
      optimal: '1–2',
      strategy: '1–2 timely hashtags tied to trending conversations. More than 2 drops engagement significantly.',
    },
    caption: {
      maxChars: 280,
      premiumMaxChars: 25000,
      optimalChars: '71–100',
      tip: 'Posts 71–100 chars get 17% more engagement. Every character counts on X.',
    },
    video: {
      optimalSeconds: '15–45s',
      maxSeconds: 140,
      aspectRatio: '16:9 landscape or 1:1 square',
      hook: 'Value must be immediate — X users scroll fast',
    },
    promptRule: 'Generate 1–2 hashtags MAXIMUM. Under 280 characters for the post text. Hook must be punchy and front-loaded.',
  },

  facebook: {
    displayName: 'Facebook',
    hashtags: {
      max: 3,
      optimal: '0–3',
      strategy: 'Hashtags have minimal algorithmic impact on Facebook. Use only when highly relevant. 0 is acceptable.',
    },
    caption: {
      maxChars: 63206,
      optimalChars: '40–80',
      tip: 'Posts under 80 chars get 66% more engagement. Use a teaser and link to external content for longer stories.',
    },
    video: {
      optimalSeconds: 'Under 60s for feed; 60–180s for storytelling; 15s for max retention',
      aspectRatio: '1:1 square for mobile feed; 16:9 for desktop/Watch',
      hook: 'Front-load in first 3 seconds — Facebook auto-plays muted',
    },
    promptRule: 'Generate 0–3 hashtags. Posts perform best under 80 characters. Conversational and community-focused tone.',
  },
};

export function normalizePlatformRulesKey(platformKey) {
  const k = String(platformKey ?? '').trim().toLowerCase();
  if (!k) return k;
  // Match display strings like "X (Twitter)" and legacy "twitter"
  if (k === 'twitter' || k.includes('twitter')) return 'x';
  return k;
}

function captionLengthSummary(caption) {
  if (!caption) return 'see platform guidelines';
  if (caption.optimalChars) return caption.optimalChars;
  if (caption.maxChars != null) return `${caption.maxChars} chars max`;
  if (caption.titleMaxChars != null && caption.descriptionMaxChars != null) {
    const vis = caption.descriptionVisibleInSearch;
    const searchBit =
      vis != null ? `; first ${vis} chars of description surface in search` : '';
    return `title ≤${caption.titleMaxChars} chars; description ≤${caption.descriptionMaxChars} chars${searchBit}`;
  }
  return 'see platform guidelines';
}

// Helper: get prompt-injection rule string for a given platform
export function getPlatformPromptRule(platformKey) {
  const platform = PLATFORM_CONTENT_RULES[normalizePlatformRulesKey(platformKey)];
  if (!platform) return '';
  const cap = platform.caption;
  const lengthHint = captionLengthSummary(cap);
  return [
    `PLATFORM RULES FOR ${platform.displayName.toUpperCase()}:`,
    `- Hashtags: ${platform.promptRule}`,
    `- Caption: Optimal length is ${lengthHint}. ${cap.tip}`,
    `- Video hook guidance: ${platform.video?.hook || 'Front-load value immediately'}`,
  ].join('\n');
}

// Helper: get hashtag count constraint for prompt
export function getHashtagConstraint(platformKey) {
  const platform = PLATFORM_CONTENT_RULES[normalizePlatformRulesKey(platformKey)];
  if (!platform) return 'Use 3–5 hashtags';
  return `${platform.hashtags.optimal} hashtags (max ${platform.hashtags.max}): ${platform.hashtags.strategy}`;
}

/** Numeric cap for slicing / JSON array length (AI tools). */
export function getHashtagMaxForPlatform(platformKey) {
  const platform = PLATFORM_CONTENT_RULES[normalizePlatformRulesKey(platformKey)];
  const max = platform?.hashtags.max ?? PLATFORM_CONTENT_RULES.instagram.hashtags.max;
  // Platforms like YouTube allow many tags in theory; the ranked hashtag tool still returns a short optimal set.
  if (max > 20) return 3;
  return max;
}

/**
 * Inclusive hashtag count range for AlgorithmChecker / checkAlgorithmAlignment.
 * Maps UI platform ids (e.g. twitter) to rules keys via normalizePlatformRulesKey.
 */
export function getAlgorithmHashtagBounds(platformKey) {
  const k = normalizePlatformRulesKey(platformKey);
  const rules = PLATFORM_CONTENT_RULES[k] || PLATFORM_CONTENT_RULES.instagram;
  const rawMax = rules.hashtags.max;
  const optimal = rules.hashtags.optimal;

  if (k === 'youtube') {
    return { min: 2, max: 3, label: `${optimal} keyword tags in copy`, optimal };
  }
  if (k === 'x') {
    return { min: 1, max: Math.min(2, rawMax), label: `${optimal} timely hashtags`, optimal };
  }
  if (k === 'facebook') {
    return { min: 0, max: rawMax, label: `${optimal} hashtags (optional on Facebook)`, optimal };
  }
  const max = Math.min(5, rawMax);
  return { min: 3, max, label: `${optimal} relevant hashtags`, optimal };
}

/**
 * Minimum hashtags required to accept grounded (Sonar/Perplexity) results without Grok fallback.
 * Capped at 5 for historical quality bar; never below 1 or above platform max.
 */
export function getMinAcceptableHashtagCountForPlatform(platformKey) {
  const max = getHashtagMaxForPlatform(platformKey);
  return Math.min(5, Math.max(1, max));
}

/** Full rules row for a platform (defaults to Instagram). */
export function getPlatformContentRulesRecord(platformKey) {
  return PLATFORM_CONTENT_RULES[normalizePlatformRulesKey(platformKey)] ?? PLATFORM_CONTENT_RULES.instagram;
}

/** Character window for “above the fold” / preview (Grok hook prompts). */
export function getCaptionVisibleBeforeHint(platformKey) {
  const cap = getPlatformContentRulesRecord(platformKey).caption;
  if (cap.visibleBeforeTruncation != null) return String(cap.visibleBeforeTruncation);
  if (cap.descriptionVisibleInSearch != null) return String(cap.descriptionVisibleInSearch);
  if (cap.titleVisibleInSearch != null) return `~${cap.titleVisibleInSearch} chars visible for title in search`;
  return 'prioritize keywords in the opening line';
}

/** Short caption length phrase for CTA / copy prompts. */
export function getCaptionOptimalLengthPhrase(platformKey) {
  return captionLengthSummary(getPlatformContentRulesRecord(platformKey).caption);
}
