/**
 * Blueprint Schema — Single source of truth for all Ignite Engine content types. // HUTTLE AI: updated 3
 *
 * Every platform + content_type combination declares its REQUIRED, OPTIONAL,
 * and EXCLUDED sections. Helper functions derive labels, score-weights, and
 * section lists used by the form, renderer, and n8n prompt builder.
 */

const BLUEPRINT_SCHEMA = {
  Instagram: {
    'Image Post': {
      required: ['visual_composition', 'hook_text', 'caption_framework', 'hashtag_strategy', 'cta', 'posting_time'],
      optional: ['pro_tips'],
      excluded: ['directors_cut', 'script', 'audio_vibe', 'transitions', 'story_arc', 'carousel_structure', 'voiceover'],
    },
    Reel: {
      required: ['hook', 'directors_cut', 'script', 'audio_vibe', 'caption_framework', 'hashtag_strategy', 'cta', 'posting_time'],
      optional: ['transitions', 'pro_tips'],
      excluded: ['visual_composition', 'carousel_structure', 'story_arc'],
    },
    Carousel: {
      required: ['hook_text', 'carousel_structure', 'visual_composition', 'caption_framework', 'hashtag_strategy', 'save_bait_strategy', 'cta', 'posting_time'],
      optional: ['pro_tips'],
      excluded: ['directors_cut', 'script', 'audio_vibe', 'transitions', 'story_arc', 'voiceover'],
    },
    Story: {
      required: ['story_arc', 'interactive_elements', 'cta', 'visual_style_guide'],
      optional: ['pro_tips'],
      excluded: ['directors_cut', 'script', 'caption_framework', 'hashtag_strategy', 'audio_vibe', 'carousel_structure', 'visual_composition'],
    },
  },
  TikTok: {
    Video: {
      required: ['hook', 'script', 'audio_vibe', 'caption_framework', 'hashtag_strategy', 'cta', 'posting_time', 'duet_stitch_potential'],
      optional: ['transitions', 'pro_tips'],
      excluded: ['visual_composition', 'carousel_structure', 'story_arc'],
    },
  },
  YouTube: {
    Short: {
      required: ['hook', 'script', 'thumbnail_concept', 'caption_framework', 'hashtag_strategy', 'cta', 'posting_time'],
      optional: ['pro_tips'],
      excluded: ['audio_vibe', 'carousel_structure', 'story_arc', 'interactive_elements'],
    },
    'Long-Form': {
      required: ['hook', 'script', 'thumbnail_concept', 'chapter_structure', 'caption_framework', 'hashtag_strategy', 'cta', 'posting_time'],
      optional: ['pro_tips'],
      excluded: ['audio_vibe', 'carousel_structure', 'story_arc', 'interactive_elements'],
    },
  },
  'X/Twitter': {
    Post: {
      required: ['hook_text', 'caption_framework', 'cta', 'hashtag_strategy', 'posting_time'],
      optional: ['pro_tips'],
      excluded: ['directors_cut', 'script', 'audio_vibe', 'carousel_structure', 'story_arc', 'visual_composition'],
    },
    Thread: {
      required: ['hook_text', 'thread_structure', 'caption_framework', 'cta', 'posting_time'],
      optional: ['hashtag_strategy', 'pro_tips'],
      excluded: ['directors_cut', 'script', 'audio_vibe', 'carousel_structure', 'story_arc', 'visual_composition'],
    },
  },
  LinkedIn: {
    Post: {
      required: ['hook_text', 'caption_framework', 'hashtag_strategy', 'cta', 'posting_time'],
      optional: ['pro_tips'],
      excluded: ['directors_cut', 'script', 'audio_vibe', 'carousel_structure', 'story_arc', 'interactive_elements'],
    },
    Article: {
      required: ['hook_text', 'article_structure', 'caption_framework', 'hashtag_strategy', 'cta', 'posting_time'],
      optional: ['pro_tips'],
      excluded: ['directors_cut', 'script', 'audio_vibe', 'carousel_structure', 'story_arc', 'interactive_elements'],
    },
  },
  Facebook: {
    Post: {
      required: ['hook_text', 'caption_framework', 'cta', 'boost_readiness_score', 'posting_time'],
      optional: ['hashtag_strategy', 'pro_tips'],
      excluded: ['directors_cut', 'script', 'audio_vibe', 'transitions', 'carousel_structure', 'story_arc'],
    },
    Reel: {
      required: ['hook', 'script', 'audio_vibe', 'caption_framework', 'cta', 'posting_time'],
      optional: ['transitions', 'pro_tips'],
      excluded: ['visual_composition', 'carousel_structure', 'story_arc', 'hashtag_strategy', 'interactive_elements'],
    },
    Story: {
      required: ['story_arc', 'interactive_elements', 'cta', 'visual_style_guide'],
      optional: ['pro_tips'],
      excluded: ['directors_cut', 'script', 'caption_framework', 'hashtag_strategy', 'audio_vibe', 'carousel_structure', 'visual_composition'],
    },
  },
};

const PLATFORM_ALIAS_MAP = {
  X: 'X/Twitter',
};

function resolvePlatformKey(platform) {
  return PLATFORM_ALIAS_MAP[platform] || platform;
}

export function getSectionsForType(platform, contentType) {
  const key = resolvePlatformKey(platform);
  const schema = BLUEPRINT_SCHEMA[key]?.[contentType];
  if (!schema) return { required: [], optional: [], excluded: [] };
  return { required: [...schema.required], optional: [...schema.optional], excluded: [...schema.excluded] };
}

const BLUEPRINT_LABELS = {
  'Instagram|Image Post': '📸 Instagram Image Post Brief',
  'Instagram|Reel': '🎬 Instagram Reel Brief',
  'Instagram|Carousel': '🎠 Instagram Carousel Brief',
  'Instagram|Story': '📖 Instagram Story Brief',
  'TikTok|Video': '🎵 TikTok Video Brief',
  'YouTube|Short': '▶️ YouTube Short Brief',
  'YouTube|Long-Form': '🎥 YouTube Long-Form Brief',
  'X/Twitter|Post': '🐦 X/Twitter Post Brief',
  'X|Post': '🐦 X/Twitter Post Brief',
  'X/Twitter|Thread': '🧵 X/Twitter Thread Brief',
  'X|Thread': '🧵 X/Twitter Thread Brief',
  'LinkedIn|Post': '💼 LinkedIn Post Brief',
  'LinkedIn|Article': '📝 LinkedIn Article Brief',
  'Facebook|Post': '📘 Facebook Post Brief',
  'Facebook|Reel': '🎬 Facebook Reel Brief',
  'Facebook|Story': '📖 Facebook Story Brief',
};

export function getBlueprintLabel(platform, contentType) {
  const key = resolvePlatformKey(platform);
  return BLUEPRINT_LABELS[`${key}|${contentType}`] || BLUEPRINT_LABELS[`${platform}|${contentType}`] || `📋 ${platform} ${contentType} Brief`;
}

const SCORE_WEIGHTS = {
  image_post: { visual_impact: 30, hook_power: 25, caption_strength: 20, hashtag_reach: 15, cta_effectiveness: 10 },
  reel: { hook_retention: 30, script_flow: 25, audio_match: 20, visual_pacing: 15, cta_effectiveness: 10 },
  video: { hook_retention: 30, script_flow: 25, audio_match: 20, visual_pacing: 15, cta_effectiveness: 10 },
  carousel: { hook_power: 25, slide_structure: 30, save_bait: 20, caption_strength: 15, cta_effectiveness: 10 },
  story: { hook_power: 30, story_arc: 30, interactive_elements: 25, cta_effectiveness: 15 },
  thread: { hook_power: 35, thread_flow: 30, engagement_bait: 20, cta_effectiveness: 15 },
  post: { hook_power: 30, caption_strength: 30, hashtag_reach: 20, cta_effectiveness: 20 },
  article: { hook_power: 25, article_structure: 30, depth_score: 25, cta_effectiveness: 20 },
  short: { hook_retention: 35, script_flow: 25, thumbnail_appeal: 20, cta_effectiveness: 20 },
  'long-form': { hook_retention: 25, content_depth: 30, thumbnail_appeal: 20, chapter_flow: 15, cta_effectiveness: 10 },
};

export function getViralScoreWeights(platform, contentType) {
  const normalizedType = contentType.toLowerCase().replace(/\s+/g, '_');
  return SCORE_WEIGHTS[normalizedType] || SCORE_WEIGHTS.post;
}

export function getContentTypesForPlatform(platform) {
  const key = resolvePlatformKey(platform);
  const platformSchema = BLUEPRINT_SCHEMA[key];
  return platformSchema ? Object.keys(platformSchema) : [];
}

export function isVideoContentType(contentType) {
  return ['Reel', 'Video', 'Short', 'Long-Form'].includes(contentType);
}

const SECTION_META = {
  visual_composition: { icon: '📸', label: 'Visual Composition' },
  hook_text: { icon: '✍️', label: 'Hook Text' },
  hook: { icon: '🪝', label: 'Hook' },
  directors_cut: { icon: '🎬', label: "Director's Cut" },
  script: { icon: '📜', label: 'Script' },
  audio_vibe: { icon: '🎵', label: 'Audio Vibe' },
  caption_framework: { icon: '📝', label: 'Caption Framework' },
  hashtag_strategy: { icon: '#️⃣', label: 'Hashtag Strategy' },
  carousel_structure: { icon: '🎠', label: 'Carousel Structure' },
  story_arc: { icon: '📖', label: 'Story Arc' },
  interactive_elements: { icon: '🎯', label: 'Interactive Elements' },
  visual_style_guide: { icon: '🎨', label: 'Visual Style Guide' },
  thread_structure: { icon: '🧵', label: 'Thread Structure' },
  article_structure: { icon: '📄', label: 'Article Structure' },
  thumbnail_concept: { icon: '🖼️', label: 'Thumbnail Concept' },
  chapter_structure: { icon: '📑', label: 'Chapter Structure' },
  duet_stitch_potential: { icon: '🤝', label: 'Duet/Stitch Potential' },
  boost_readiness_score: { icon: '🚀', label: 'Boost Readiness' },
  save_bait_strategy: { icon: '🔖', label: 'Save Bait Strategy' },
  cta: { icon: '🎯', label: 'CTA' },
  posting_time: { icon: '⏰', label: 'Posting Time' },
  pro_tips: { icon: '💡', label: 'Pro Tips' },
  transitions: { icon: '🔄', label: 'Transitions' },
  voiceover: { icon: '🎙️', label: 'Voiceover' },
};

export function getSectionMeta(sectionKey) {
  return SECTION_META[sectionKey] || { icon: '📋', label: sectionKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
}

export function getAllSectionMeta() {
  return SECTION_META;
}

export { BLUEPRINT_SCHEMA };
