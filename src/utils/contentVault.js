import { Facebook, FileText, Hash, Instagram, MessageSquare, Sparkles, Target, Twitter, Video, Wand2, Youtube } from 'lucide-react';

export const CONTENT_TYPE_CONFIG = {
  caption: {
    label: 'Captions',
    singular: 'Caption',
    badgeClass: 'bg-cyan-50 text-cyan-700',
    accentClass: 'border-l-[#01BAD2]',
  },
  hook: {
    label: 'Hooks',
    singular: 'Hook',
    badgeClass: 'bg-purple-50 text-purple-700',
    accentClass: 'border-l-purple-400',
  },
  hashtag: {
    label: 'Hashtags',
    singular: 'Hashtag',
    badgeClass: 'bg-emerald-50 text-emerald-700',
    accentClass: 'border-l-emerald-400',
  },
  cta: {
    label: 'CTAs',
    singular: 'CTA',
    badgeClass: 'bg-orange-50 text-orange-700',
    accentClass: 'border-l-orange-400',
  },
  full_post: {
    label: 'Full Posts',
    singular: 'Full Post',
    badgeClass: 'bg-pink-50 text-pink-700',
    accentClass: 'border-l-pink-400',
  },
  blueprint: {
    label: 'Ignite Engine',
    singular: 'Ignite Engine',
    badgeClass: 'bg-red-50 text-red-700',
    accentClass: 'border-l-red-400',
  },
  remix: {
    label: 'Remixes',
    singular: 'Remix',
    badgeClass: 'bg-blue-50 text-blue-700',
    accentClass: 'border-l-blue-400',
  },
  plan: {
    label: 'Plans',
    singular: 'Plan',
    badgeClass: 'bg-slate-50 text-slate-700',
    accentClass: 'border-l-slate-400',
  },
  manual_post: {
    label: 'Manual',
    singular: 'Manual',
    badgeClass: 'bg-gray-50 text-gray-600',
    accentClass: 'border-l-gray-300',
  },
  legacy: {
    label: 'Saved',
    singular: 'Saved',
    badgeClass: 'bg-gray-50 text-gray-600',
    accentClass: 'border-l-gray-300',
  },
};

export const CONTENT_TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'caption', label: 'Captions' },
  { id: 'hook', label: 'Hooks' },
  { id: 'hashtag', label: 'Hashtags' },
  { id: 'cta', label: 'CTAs' },
  { id: 'full_post', label: 'Full Posts' },
  { id: 'plan', label: 'Plans' },
  { id: 'blueprint', label: 'Ignite Engine' },
  { id: 'remix', label: 'Remixes' },
  { id: 'manual_post', label: 'Manual' },
];

/** Dev-only collection names hidden from the Content Vault UI (trimmed, case-insensitive). */
const HIDDEN_VAULT_COLLECTION_NAMES_LOWER = new Set(['smoke test collection']);

/**
 * @param {string} [name]
 * @returns {boolean}
 */
export function isHiddenVaultCollectionName(name) {
  const normalized = String(name || '').trim().toLowerCase();
  return HIDDEN_VAULT_COLLECTION_NAMES_LOWER.has(normalized);
}

export const PLATFORM_OPTIONS = [
  { id: 'all', label: 'All Platforms' },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'tiktok', label: 'TikTok', icon: Video },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'x', label: 'X', icon: Twitter },
];

export function normalizePlatform(platform) {
  const value = String(platform || '').trim().toLowerCase();

  if (!value) return '';
  if (value.includes('instagram')) return 'instagram';
  if (value.includes('tiktok')) return 'tiktok';
  if (value.includes('facebook')) return 'facebook';
  if (value.includes('youtube')) return 'youtube';
  if (value === 'twitter' || value.includes('x')) return 'x';

  return value;
}

export function getPlatformOption(platform) {
  const normalizedPlatform = normalizePlatform(platform);
  return PLATFORM_OPTIONS.find((option) => option.id === normalizedPlatform) || null;
}

export function inferContentType(row) {
  const metadata = row?.metadata || {};
  const toolSrc = String(metadata.tool_source || metadata.toolSource || '').toLowerCase();
  if (toolSrc === 'manual' || metadata.source === 'manual') {
    return 'manual_post';
  }
  const rawType = metadata.content_type || metadata.contentType || '';
  const normalized = String(rawType).trim().toLowerCase();

  if (normalized === 'manual_post' || normalized === 'manual') {
    return 'manual_post';
  }

  if (CONTENT_TYPE_CONFIG[normalized]) {
    return normalized;
  }

  const description = `${row?.description || ''} ${row?.name || ''}`.toLowerCase();

  if (description.includes('caption')) return 'caption';
  if (description.includes('hook')) return 'hook';
  if (description.includes('hashtag')) return 'hashtag';
  if (description.includes('cta')) return 'cta';
  if (description.includes('full post')) return 'full_post';
  if (description.includes('blueprint')) return 'blueprint';
  if (description.includes('remix') || description.includes('repurpose')) return 'remix';
  if (description.includes('plan')) return 'plan';

  return 'legacy';
}

export function isVaultRow(row) {
  if (!row) return false;
  const metadata = row?.metadata || {};
  const t = row.type;
  return (
    t === 'text' ||
    t === 'image' ||
    t === 'video' ||
    Boolean(metadata.content_type || metadata.contentType || row.content)
  );
}

export function mapContentRowToVaultItem(row, collectionIds = []) {
  const metadata = row?.metadata || {};
  const contentType = inferContentType(row);
  const contentText = row?.content || row?.description || row?.name || '';
  const platform = normalizePlatform(metadata.platform || metadata.platforms?.[0] || '');
  const copyHistory = Array.isArray(metadata.copy_history) ? metadata.copy_history : [];
  const copyCount = Number(metadata.copy_count || 0);

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name || '',
    contentType,
    contentText,
    platform,
    topic: metadata.topic || metadata.input || metadata.goal || '',
    toolSource: metadata.tool_source || metadata.toolSource || metadata.source || '',
    toolLabel: metadata.tool_label || '',
    copyCount,
    copyHistory,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata,
    collectionIds,
    raw: row,
  };
}

export function countCopiesThisWeek(items) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return items.reduce((total, item) => {
    const weeklyCopies = (item.copyHistory || []).filter((entry) => {
      const timestamp = new Date(entry).getTime();
      return Number.isFinite(timestamp) && timestamp >= sevenDaysAgo;
    }).length;

    return total + weeklyCopies;
  }, 0);
}

export function buildContentVaultPayload({
  contentText,
  contentType,
  toolSource,
  toolLabel,
  topic = '',
  platform = '',
  name = '',
  description = '',
  metadata = {},
}) {
  const normalizedType = CONTENT_TYPE_CONFIG[contentType] ? contentType : 'legacy';
  const normalizedPlatform = normalizePlatform(platform);
  const safeContentText = typeof contentText === 'string' ? contentText.trim() : '';
  const resolvedName = name || buildVaultItemName(normalizedType, topic, safeContentText);
  const resolvedDescription = description || `Saved from ${toolLabel || humanizeToolSource(toolSource) || 'Huttle AI'}`;

  return {
    name: resolvedName,
    type: 'text',
    content: safeContentText,
    size_bytes: 0,
    description: resolvedDescription,
    metadata: {
      ...metadata,
      content_type: normalizedType,
      tool_source: toolSource || '',
      tool_label: toolLabel || '',
      platform: normalizedPlatform || '',
      topic: topic?.trim() || '',
      copy_count: Number(metadata.copy_count || 0),
      copy_history: Array.isArray(metadata.copy_history) ? metadata.copy_history : [],
    },
  };
}

export function buildVaultItemName(contentType, topic, contentText) {
  const typeLabel = CONTENT_TYPE_CONFIG[contentType]?.singular || 'Content';
  const sourceText = topic?.trim() || contentText?.trim() || new Date().toLocaleDateString();
  const compactSource = sourceText.replace(/\s+/g, ' ').slice(0, 48);

  return compactSource ? `${typeLabel} - ${compactSource}` : `${typeLabel} - ${new Date().toLocaleDateString()}`;
}

export function humanizeToolSource(toolSource) {
  const value = String(toolSource || '').trim();

  if (!value) return 'Huttle AI';

  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getToolSourceIcon(toolSource) {
  const value = String(toolSource || '').toLowerCase();

  if (value.includes('caption')) return MessageSquare;
  if (value.includes('hook')) return Wand2;
  if (value.includes('hashtag')) return Hash;
  if (value.includes('cta')) return Target;
  if (value.includes('full_post') || value.includes('post_builder')) return FileText;
  if (value.includes('blueprint')) return Sparkles;

  return FileText;
}

export function buildUseAgainTarget(item) {
  const encodedTopic = encodeURIComponent(item.topic || '');
  const encodedPlatform = encodeURIComponent(item.platform || '');
  const encodedContent = encodeURIComponent(item.contentText || '');
  const encodedAudience = encodeURIComponent(item.metadata?.target_audience || '');
  const encodedPostType = encodeURIComponent(item.metadata?.post_type || '');
  const encodedGoal = encodeURIComponent(item.metadata?.goal || '');
  const source = String(item.toolSource || '').toLowerCase();
  const blueprintPlatform = encodeURIComponent(
    item.metadata?.platform_display
    || (item.platform === 'instagram' ? 'Instagram' : '')
    || (item.platform === 'tiktok' ? 'TikTok' : '')
    || (item.platform === 'facebook' ? 'Facebook' : '')
    || (item.platform === 'youtube' ? 'YouTube' : '')
    || (item.platform === 'x' ? 'X' : '')
  );

  if (source === 'manual' || source === 'manual_post') {
    return `/dashboard/ai-tools?tab=captions&input=${encodedContent}`;
  }

  if (source === 'caption_generator') {
    return `/dashboard/ai-tools?tab=captions&input=${encodedTopic || encodedContent}&platform=${encodedPlatform}`;
  }

  if (source === 'hook_builder') {
    return `/dashboard/ai-tools?tab=hooks&input=${encodedTopic || encodedContent}&platform=${encodedPlatform}`;
  }

  if (source === 'hashtag_generator') {
    return `/dashboard/ai-tools?tab=hashtags&input=${encodedTopic || encodedContent}&platform=${encodedPlatform}`;
  }

  if (source === 'cta_suggester') {
    return `/dashboard/ai-tools?tab=ctas&input=${encodedTopic || encodedContent}&platform=${encodedPlatform}`;
  }

  if (source === 'visual_brainstorm') {
    return `/dashboard/ai-tools?tab=visuals&input=${encodedTopic || encodedContent}&platform=${encodedPlatform}`;
  }

  if (source === 'content_scorer' || source === 'scorer') {
    return `/dashboard/ai-tools?tab=scorer&input=${encodedContent}`;
  }

  if (source === 'full_post_builder' || source === 'full-post-builder') {
    return `/dashboard/full-post-builder?topic=${encodedTopic || encodedContent}&platform=${encodedPlatform}`;
  }

  if (source === 'ignite_engine') { // HUTTLE AI: updated 3
    return `/dashboard/ignite-engine?topic=${encodedTopic}&platform=${blueprintPlatform}&postType=${encodedPostType}&audience=${encodedAudience}`;
  }

  if (source === 'content_remix') {
    return `/dashboard/content-remix?input=${encodedContent}&goal=${encodedGoal}`;
  }

  if (source === 'content_repurposer') {
    return `/dashboard/content-remix?input=${encodedContent}`;
  }

  if (source === 'ai_plan_builder') {
    return `/dashboard/plan-builder?goal=${encodedGoal}`;
  }

  const byType = String(item.contentType || '').toLowerCase();
  if (byType === 'caption') {
    return `/dashboard/ai-tools?tab=captions&input=${encodedTopic || encodedContent}&platform=${encodedPlatform}`;
  }
  if (byType === 'hashtag') {
    return `/dashboard/ai-tools?tab=hashtags&input=${encodedTopic || encodedContent}&platform=${encodedPlatform}`;
  }
  if (byType === 'hook') {
    return `/dashboard/ai-tools?tab=hooks&input=${encodedTopic || encodedContent}&platform=${encodedPlatform}`;
  }
  if (byType === 'cta') {
    return `/dashboard/ai-tools?tab=ctas&input=${encodedTopic || encodedContent}&platform=${encodedPlatform}`;
  }
  if (byType === 'full_post') {
    return `/dashboard/full-post-builder?topic=${encodedTopic || encodedContent}&platform=${encodedPlatform}`;
  }

  return '/dashboard/ai-tools?tab=captions';
}
