import { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import {
  Wand2,
  Loader2,
  AlertTriangle,
  Pencil,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
} from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { useBrand } from '../context/BrandContext';
import { useSubscription } from '../context/SubscriptionContext';
import { createJobDirectly, triggerN8nWebhook } from '../services/planBuilderAPI';
import { supabase } from '../config/supabase';
import { saveToVault } from '../services/contentService';
import { AuthContext } from '../context/AuthContext';
import {
  InstagramIconMono,
  InstagramIcon,
  FacebookIconMono,
  FacebookIcon,
  TikTokIcon,
  TwitterXIconMono,
  TwitterXIcon,
  YouTubeIconMono,
  YouTubeIcon,
  getPlatformIcon,
  normalizePlatformLabelForIcon,
} from '../components/SocialIcons';
import useAIUsage from '../hooks/useAIUsage';
import { useSearchParams, Link } from 'react-router-dom';
import { buildContentVaultPayload } from '../utils/contentVault';
import { buildBrandContext } from '../utils/buildBrandContext';
import { sanitizeAIOutput } from '../utils/textHelpers';
import { getCachedTrends } from '../services/dashboardCacheService';
import { parsePlanBuilderDisplayResult, normalizeN8nAlternatePlanToV2 } from '../utils/planBuilderJobResult';
import {
  PLATFORM_CONTENT_RULES,
  getPlatformPromptRule,
  getHashtagConstraint,
  normalizePlatformRulesKey,
} from '../data/platformContentRules';

const CONTENT_GOALS = [
  'Grow followers',
  'Drive traffic',
  'Generate leads',
  'Increase sales',
  'Build brand awareness',
];

const FOLLOWER_RANGE_OPTIONS = [
  { value: '0-500', label: 'Just starting (0–500)' },
  { value: '500-5K', label: 'Growing (500–5K)' },
  { value: '5K-50K', label: 'Established (5K–50K)' },
  { value: '50K+', label: 'Large (50K+)' },
];

const PLAN_BUILDER_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: InstagramIcon, monoIcon: InstagramIconMono },
  { id: 'tiktok', name: 'TikTok', icon: TikTokIcon, monoIcon: TikTokIcon },
  { id: 'youtube', name: 'YouTube', icon: YouTubeIcon, monoIcon: YouTubeIconMono },
  { id: 'x', name: 'X', displayName: 'X (Twitter)', icon: TwitterXIcon, monoIcon: TwitterXIconMono },
  { id: 'facebook', name: 'Facebook', icon: FacebookIcon, monoIcon: FacebookIconMono },
];

const PLAN_BUILDER_PLATFORM_NAMES = new Set(PLAN_BUILDER_PLATFORMS.map((p) => p.name));

const PLATFORM_CARD_BORDER = {
  Instagram: '#E1306C',
  TikTok: '#01BAD2',
  YouTube: '#FF0000',
  X: '#14171A',
  Facebook: '#1877F2',
};

const CONTENT_TYPE_BADGE = {
  educational: { label: 'Educational', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  entertaining: { label: 'Entertaining', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  authority: { label: 'Authority', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  promotional: { label: 'Promotional', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  bts: { label: 'Behind the Scenes', className: 'bg-green-100 text-green-700 border-green-200' },
  default: { label: 'Post', className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

function contentTypeBadgeProps(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('educat')) return CONTENT_TYPE_BADGE.educational;
  if (s.includes('bts') || s.includes('behind')) return CONTENT_TYPE_BADGE.bts;
  if (s.includes('entertain')) return CONTENT_TYPE_BADGE.entertaining;
  if (s.includes('author')) return CONTENT_TYPE_BADGE.authority;
  if (s.includes('promo')) return CONTENT_TYPE_BADGE.promotional;
  return { ...CONTENT_TYPE_BADGE.default, label: raw ? String(raw).slice(0, 24) : 'Post' };
}

/** Supabase `jobs.id` is UUID; reject ISO dates and other strings that break Realtime filters */
const PLAN_BUILDER_JOB_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rotating button label while a plan job is running — signals progress, not a freeze. */
const PLAN_BUILDER_LOADING_PHRASES = [
  'Analyzing your niche...',
  'Mapping your content themes...',
  'Scheduling optimal times...',
  'Writing your plan...',
  'Building your strategy...',
];

function isTwitterLikePlatform(name) {
  const n = normalizePlatformLabelForIcon(name);
  return n === 'X';
}

function getDayPosts(day) {
  if (!day) return [];
  if (Array.isArray(day.posts)) return day.posts;
  if (Array.isArray(day.items)) return day.items;
  return [];
}

/** Prefer the richest `days` array (n8n sometimes duplicates a partial top-level `days`). */
function getPlanDaysForDisplay(plan) {
  if (!plan || typeof plan !== 'object') return [];
  const top = Array.isArray(plan.days) ? plan.days : [];
  const nested = plan.plan && typeof plan.plan === 'object' && Array.isArray(plan.plan.days) ? plan.plan.days : [];
  const postCount = (days) => days.reduce((sum, d) => sum + getDayPosts(d).length, 0);
  const topPosts = postCount(top);
  const nestedPosts = postCount(nested);
  if (nested.length > top.length || nestedPosts > topPosts) return nested;
  if (top.length > 0 || topPosts > 0) return top;
  if (nested.length > 0) return nested;
  if (Array.isArray(plan.weeks)) {
    const flat = plan.weeks.flatMap((w) => {
      if (!w || typeof w !== 'object') return [];
      if (Array.isArray(w.days)) return w.days;
      return [];
    });
    if (flat.length) return flat;
  }
  return [];
}

function formatTimesForDisplay(times) {
  if (Array.isArray(times)) return times.map((t) => String(t).trim()).join(' · ');
  if (typeof times === 'string') return times.replace(/\s*,\s*/g, ' · ');
  return String(times ?? '');
}

function extractOptimalTimesMap(plan) {
  const s = plan?.summary;
  if (s?.optimalTimes && typeof s.optimalTimes === 'object' && !Array.isArray(s.optimalTimes)) {
    return s.optimalTimes;
  }
  if (s?.optimal_times && typeof s.optimal_times === 'object' && !Array.isArray(s.optimal_times)) {
    return s.optimal_times;
  }
  const notes = plan?.overview?.strategy_notes;
  if (typeof notes !== 'string' || !notes.trim()) return null;
  const out = {};
  for (const line of notes.split('\n')) {
    const t = line.trim();
    if (!t || /^key themes/i.test(t)) continue;
    const idx = t.indexOf(':');
    if (idx === -1) continue;
    const plat = t.slice(0, idx).trim();
    const rest = t.slice(idx + 1).trim();
    if (plat && rest) out[plat] = rest;
  }
  return Object.keys(out).length ? out : null;
}

function extractKeyThemesForDisplay(plan, pillarFallback) {
  const s = plan?.summary;
  if (Array.isArray(s?.keyThemes) && s.keyThemes.length) return s.keyThemes.map(String);
  const notes = plan?.overview?.strategy_notes || '';
  const line = notes.split('\n').find((l) => /^key themes/i.test(l.trim()));
  if (line) {
    const part = line.replace(/^key themes:\s*/i, '').trim();
    return part.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return Array.isArray(pillarFallback) && pillarFallback.length ? pillarFallback.map(String) : [];
}

function formatPostForClipboard(post) {
  const lines = [];
  if (post.hook) lines.push(`Hook: ${post.hook}`);
  if (post.caption) lines.push(post.caption);
  const tags = Array.isArray(post.hashtags) ? post.hashtags : [];
  if (tags.length && !isTwitterLikePlatform(post.platform)) {
    lines.push(
      tags.map((h) => (String(h).startsWith('#') ? h : `#${String(h).replace(/^#/, '')}`)).join(' ')
    );
  }
  if (post.cta) lines.push(`CTA: ${post.cta}`);
  return lines.join('\n\n');
}

function formatPostVaultBody(post) {
  return formatPostForClipboard(post);
}

const DAYS_OF_WEEK_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getDayDisplayLabel(day, index) {
  const rawLabel = sanitizeAIOutput(day?.date || day?.theme || '');
  const dayOfWeek = DAYS_OF_WEEK_NAMES.find((d) => rawLabel.toLowerCase().includes(d.toLowerCase()));
  const isDuplicateNum = /^day\s*\d+$/i.test(rawLabel.trim());
  if (dayOfWeek) return `Day ${index + 1} · ${dayOfWeek}`;
  if (rawLabel && !isDuplicateNum) return `Day ${index + 1} · ${rawLabel}`;
  return `Day ${index + 1}`;
}

function formatFullPlan(plan, displayDays) {
  const title = plan?.planTitle || plan?.summary?.title || plan?.overview?.strategy || 'Your Content Plan';
  const lines = [];
  lines.push(title);
  lines.push('Generated by Huttle AI');
  lines.push('');

  const strategy = plan?.overview?.strategy || plan?.summary?.strategy;
  if (strategy && strategy !== title) {
    lines.push('━━━ STRATEGY OVERVIEW ━━━');
    lines.push(strategy);
    lines.push('');
  }

  displayDays.forEach((day, i) => {
    lines.push(`━━━ ${getDayDisplayLabel(day, i).toUpperCase()} ━━━`);
    lines.push('');
    getDayPosts(day).forEach((post) => {
      const plat = String(normalizePlatformLabelForIcon(post.platform) || post.platform || '').toUpperCase();
      const ct = contentTypeBadgeProps(post.contentType).label;
      const time = post.postTime || '';
      lines.push(`📱 ${plat} — ${ct}${time ? ` — ${time}` : ''}`);
      if (post.hook) lines.push(`Hook: ${post.hook}`);
      lines.push('');
      if (post.caption) lines.push(post.caption);
      lines.push('');
      const tags = Array.isArray(post.hashtags) ? post.hashtags : [];
      if (tags.length && !isTwitterLikePlatform(post.platform)) {
        lines.push(tags.map((h) => (String(h).startsWith('#') ? h : `#${String(h).replace(/^#/, '')}`)).join(' '));
      }
      if (post.cta) lines.push(`\nCTA: ${post.cta}`);
      lines.push('');
      lines.push('─────────────────────');
      lines.push('');
    });
  });

  return lines.join('\n').trim();
}

const MIX_DOT_EMOJI = {
  Educational: '🔵',
  Entertaining: '🟡',
  Authority: '🟣',
  Promotional: '🔴',
  Personal: '🟢',
  Post: '⚪',
};

const MIX_BAR_COLOR = {
  Educational: 'bg-blue-400',
  Entertaining: 'bg-amber-400',
  Authority: 'bg-purple-400',
  Promotional: 'bg-rose-400',
  Personal: 'bg-green-400',
};

function PlanBuilderPostCard({ post, dayNum, dayLabel, userId, showToast }) {
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [hashtagsExpanded, setHashtagsExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [savingVault, setSavingVault] = useState(false);
  const [savedVault, setSavedVault] = useState(false);
  const [copiedPost, setCopiedPost] = useState(false);

  const platLabel = normalizePlatformLabelForIcon(post.platform) || post.platform || 'Platform';
  const borderC = PLATFORM_CARD_BORDER[platLabel] || '#64748b';
  const ct = contentTypeBadgeProps(post.contentType);
  const caption = sanitizeAIOutput(post.caption || post.topic || '');
  const hook = sanitizeAIOutput(post.hook || '');
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags.map(String).filter(Boolean) : [];
  const hideTags = isTwitterLikePlatform(post.platform);
  const visibleTags = hashtagsExpanded ? hashtags : hashtags.slice(0, 3);
  const moreTagCount = !hashtagsExpanded && hashtags.length > 3 ? hashtags.length - 3 : 0;

  const explicitVisualRaw = String(post.visualDirection ?? post.visual_direction ?? '').trim();
  const notesRaw = String(post.notes ?? '').trim();
  const visualText = sanitizeAIOutput(explicitVisualRaw || notesRaw);
  const proTipInDetails =
    notesRaw.length > 0 &&
    explicitVisualRaw.length > 0 &&
    sanitizeAIOutput(notesRaw) !== sanitizeAIOutput(explicitVisualRaw);

  const whyThisWorksText = sanitizeAIOutput(String(post.why_this_works ?? post.whyThisWorks ?? '')).trim();
  const formatText = sanitizeAIOutput(String(post.format ?? '')).trim();
  const topicRaw = post.topic != null ? String(post.topic).trim() : '';
  const topicText = sanitizeAIOutput(topicRaw).trim();
  const captionIsOnlyTopic = !String(post.caption ?? '').trim() && topicRaw.length > 0;
  const showTopicInDetails = topicText.length > 0 && !captionIsOnlyTopic;

  const hasFullDetailsContent =
    whyThisWorksText.length > 0 ||
    proTipInDetails ||
    formatText.length > 0 ||
    showTopicInDetails;

  const captionNeedsToggle =
    caption.length > 100 || (caption.match(/\n/g) || []).length >= 2;

  const handleCopyPost = () => {
    navigator.clipboard.writeText(formatPostForClipboard(post)).then(() => {
      setCopiedPost(true);
      showToast('Post copied to clipboard', 'success');
      setTimeout(() => setCopiedPost(false), 2000);
    });
  };

  const handleSaveVault = async () => {
    if (savedVault) return;
    if (!userId) {
      showToast('Sign in to save to your vault', 'warning');
      return;
    }
    setSavingVault(true);
    try {
      const postSnippet = sanitizeAIOutput(
        String(post.hook || post.caption || post.topic || '').replace(/\s+/g, ' ').trim()
      ).slice(0, 60);
      const result = await saveToVault(userId, {
        ...buildContentVaultPayload({
          name: `${dayLabel} - ${platLabel}${postSnippet ? ` - ${postSnippet}` : ''}`,
          contentText: formatPostVaultBody(post),
          contentType: 'plan',
          toolSource: 'ai_plan_builder',
          toolLabel: 'AI Plan Builder',
          topic: postSnippet,
          platform: post.platform,
          description: `AI Plan Builder | ${dayLabel} | ${platLabel}`,
          metadata: {
            day: dayNum,
            day_label: dayLabel,
            contentType: post.contentType ?? '',
            bestTime: post.postTime ?? '',
          },
        }),
        type: 'plan_builder',
      });
      if (result.success) setSavedVault(true);
      else showToast(result.error || 'Could not save to vault', 'error');
    } catch (e) {
      console.error('[AIPlanBuilder] save post vault:', e);
      showToast('Could not save to vault', 'error');
    } finally {
      setSavingVault(false);
    }
  };

  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white border-l-4 shadow-sm overflow-hidden"
      style={{ borderLeftColor: borderC }}
    >
      <div className="px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#0C1220]">
            {getPlatformIcon(post.platform, 'h-4 w-4')}
            {platLabel}
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${ct.className}`}>
            {sanitizeAIOutput(ct.label)}
          </span>
          {post.postTime && (
            <span className="inline-flex items-center gap-1 text-gray-500 text-xs ml-auto">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {sanitizeAIOutput(post.postTime)}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-[13fr_7fr]">
          <div className="lg:pr-6">
            <p className="font-bold text-lg text-[#0C1220] leading-snug font-plan-display">{hook || '—'}</p>

        {caption && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Caption</p>
            <p
              className={`text-sm text-gray-700 whitespace-pre-wrap ${
                captionExpanded ? '' : 'line-clamp-3'
              }`}
            >
              {caption}
            </p>
            {captionNeedsToggle && (
              <button
                type="button"
                onClick={() => setCaptionExpanded((v) => !v)}
                className="mt-1 text-xs font-semibold text-[#01BAD2] hover:text-[#0199b0]"
              >
                {captionExpanded ? 'Show less ↑' : 'Show more ↓'}
              </button>
            )}
          </div>
        )}

        {!hideTags && hashtags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {visibleTags.map((h, i) => (
              <span
                key={`${h}-${i}`}
                className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs text-gray-700"
              >
                {h.startsWith('#') ? h : `#${h.replace(/^#/, '')}`}
              </span>
            ))}
            {moreTagCount > 0 && (
              <button
                type="button"
                onClick={() => setHashtagsExpanded(true)}
                className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                +{moreTagCount} more
              </button>
            )}
          </div>
        )}

        {post.cta && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">CTA</p>
            <p className="text-sm text-gray-800">{sanitizeAIOutput(post.cta)}</p>
          </div>
        )}

          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 lg:mt-0 lg:pt-0 lg:border-t-0 lg:border-l lg:border-gray-100 lg:pl-6 flex flex-col gap-3">
            {visualText && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1">📷 Visual direction</p>
                <p className="text-sm text-gray-700 mt-1 line-clamp-2">{visualText}</p>
              </div>
            )}

            {post.pillar && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Content pillar</p>
                <span className="inline-block mt-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {sanitizeAIOutput(String(post.pillar))}
                </span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-3 mt-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyPost}
                disabled={copiedPost}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-70 transition-colors"
              >
                {copiedPost ? 'Copied ✓' : 'Copy post'}
              </button>
              <button
                type="button"
                onClick={handleSaveVault}
                disabled={savingVault || savedVault}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-70 ${
                  savedVault
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-[#01BAD2] text-white hover:bg-[#0199b0]'
                }`}
              >
                {savedVault ? 'Saved ✓' : savingVault ? 'Saving…' : 'Save to Vault'}
              </button>
              {hasFullDetailsContent && (
                <button
                  type="button"
                  onClick={() => setDetailsOpen((v) => !v)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 inline-flex items-center gap-1 hover:bg-gray-50 transition-colors"
                >
                  {detailsOpen ? (
                    <>
                      Full details <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      Full details <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {hasFullDetailsContent && (
          <div
            className={`grid transition-all duration-200 ease-in-out ${
              detailsOpen ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-4 border-t border-gray-100 pt-4 text-sm">
                {whyThisWorksText.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400">Why this works</p>
                    <p className="text-sm text-gray-600 italic mt-1">{whyThisWorksText}</p>
                  </div>
                )}
                {proTipInDetails && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400">Pro tip</p>
                    <p className="text-sm text-gray-600 mt-1">{sanitizeAIOutput(notesRaw)}</p>
                  </div>
                )}
                {(formatText.length > 0 || showTopicInDetails) && (
                  <div className="space-y-3">
                    {formatText.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-400">Format</p>
                        <p className="text-sm text-gray-700 font-medium mt-1">{formatText}</p>
                      </div>
                    )}
                    {showTopicInDetails && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-400">Topic</p>
                        <p className="text-sm text-gray-600 mt-1">{topicText}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepSection({ n, title, children }) {
  return (
    <section className="border-t border-gray-100 pt-3 pb-1 first:border-0 first:pt-0">
      <div className="flex items-start gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#01BAD2] text-sm font-semibold text-white font-plan-display shadow-sm">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-plan-display text-lg font-semibold text-[#0C1220] leading-tight mb-0">{title}</h2>
          <div className="mt-2 space-y-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

function formatJobError(err) {
  if (err == null) return 'Plan generation failed. Please try again.';
  if (typeof err === 'string') return err.trim() || 'Plan generation failed. Please try again.';
  if (typeof err === 'object' && err.message) return String(err.message);
  try {
    return JSON.stringify(err);
  } catch {
    return 'Plan generation failed. Please try again.';
  }
}

/** PostgREST / n8n may leave `error` as empty string; `job.error != null` wrongly treats "" as failure. */
function jobHasMeaningfulError(error) {
  if (error == null) return false;
  if (typeof error === 'string') return error.trim().length > 0;
  if (typeof error === 'object') {
    try {
      return Object.keys(error).length > 0;
    } catch {
      return true;
    }
  }
  return Boolean(error);
}

function normalizeJobStatus(status) {
  return String(status ?? '')
    .trim()
    .toLowerCase();
}

const isComplete = (job) => {
  const s = normalizeJobStatus(job.status);
  return (
    s === 'completed' ||
    s === 'done' ||
    s === 'success' ||
    (job.result != null && Number(job.progress) === 100) ||
    job.completed_at != null
  );
};

const isFailed = (job) => {
  const s = normalizeJobStatus(job.status);
  return s === 'failed' || s === 'error' || jobHasMeaningfulError(job.error);
};

/**
 * AI Plan Builder — async job + Supabase Realtime (unchanged flow).
 */
export default function AIPlanBuilder() {
  const { showToast } = useToast();
  const { brandProfile, brandFetchComplete } = useBrand();
  const { getTierDisplayName, userTier } = useSubscription();
  const planUsage = useAIUsage('planBuilder');
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useContext(AuthContext);

  const [selectedGoal, setSelectedGoal] = useState(CONTENT_GOALS[0]);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [postingFreqMode, setPostingFreqMode] = useState('5');
  const [postingFreqCustom, setPostingFreqCustom] = useState(5);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [nicheInput, setNicheInput] = useState('');
  const [targetAudienceInput, setTargetAudienceInput] = useState('');
  const [brandVoiceToneInput, setBrandVoiceToneInput] = useState('');
  const [followerRange, setFollowerRange] = useState('0-500');
  const [extraContext, setExtraContext] = useState('');
  const [optionalOpen, setOptionalOpen] = useState(false);

  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [editingInputs, setEditingInputs] = useState(true);
  const [savingAllVault, setSavingAllVault] = useState(false);
  const [savedFullPlan, setSavedFullPlan] = useState(false);

  useEffect(() => {
    setSavedFullPlan(false);
  }, [generatedPlan]);

  const [currentJobId, setCurrentJobId] = useState(null);
  const [, setJobStatus] = useState(null);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

  const resolvedPostingFrequency = useMemo(() => {
    if (postingFreqMode === 'custom') {
      return Math.min(14, Math.max(1, Number(postingFreqCustom) || 1));
    }
    return Number(postingFreqMode) || 5;
  }, [postingFreqMode, postingFreqCustom]);

  useEffect(() => {
    if (!brandFetchComplete) return;
    setNicheInput((prev) => (prev.trim() ? prev : (brandProfile?.niche || '')));
    setTargetAudienceInput((prev) => (prev.trim() ? prev : (brandProfile?.targetAudience ? String(brandProfile.targetAudience) : '')));
    const tone = [brandProfile?.brandVoice, ...(brandProfile?.toneChips || [])].filter(Boolean).join(', ');
    setBrandVoiceToneInput((prev) => (prev.trim() ? prev : tone));
  }, [brandFetchComplete, brandProfile]);

  useEffect(() => {
    if (selectedPlatforms.length > 0) return;
    const fromBrand = brandProfile?.platforms?.length > 0 ? brandProfile.platforms : [];
    if (fromBrand.length) {
      const mapped = fromBrand
        .map((p) => normalizePlatformLabelForIcon(p) || p)
        .filter(Boolean)
        .filter((n) => PLAN_BUILDER_PLATFORM_NAMES.has(n));
      if (mapped.length) setSelectedPlatforms(Array.from(new Set(mapped)));
    }
  }, [brandProfile?.platforms, selectedPlatforms.length]);

  useEffect(() => {
    if (!brandFetchComplete) return;
    setSelectedPlatforms((prev) => {
      const next = [
        ...new Set(
          prev
            .map((n) => normalizePlatformLabelForIcon(n) || n)
            .filter((n) => PLAN_BUILDER_PLATFORM_NAMES.has(n))
        ),
      ];
      if (next.length === prev.length && next.every((v, i) => v === (normalizePlatformLabelForIcon(prev[i]) || prev[i]))) {
        return prev;
      }
      return next;
    });
  }, [brandFetchComplete]);

  useEffect(() => {
    const goalParam = searchParams.get('goal');
    if (!goalParam) return;
    if (CONTENT_GOALS.includes(goalParam)) setSelectedGoal(goalParam);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('goal');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingPhraseIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setLoadingPhraseIndex((i) => (i + 1) % PLAN_BUILDER_LOADING_PHRASES.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  const handleJobFailed = useCallback(
    (errorMessage) => {
      setIsGenerating(false);
      setCurrentJobId(null);
      const msg = formatJobError(errorMessage);
      setGenerationError(msg);
      showToast(msg, 'error');
    },
    [showToast]
  );

  const handleJobComplete = useCallback(
    (job) => {
      let planData = job?.result;
      if (typeof planData === 'string') {
        try {
          planData = JSON.parse(planData);
        } catch {
          /* leave as string — safeParse in planBuilderJobResult will handle it */
        }
      }

      if (!planData) {
        handleJobFailed('Plan generation completed but no result was returned');
        return;
      }

      const preNormalized = normalizeN8nAlternatePlanToV2(planData) ?? planData;
      let payload = preNormalized;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          /* leave as string — safeParse in planBuilderJobResult will handle it */
        }
      }
      const parsed = parsePlanBuilderDisplayResult(payload);
      if (parsed.kind === 'fallback' && (!parsed.rawText || parsed.rawText === 'No plan content returned.')) {
        console.warn('[PlanBuilder] Empty fallback body');
      }

      setGeneratedPlan(parsed);
      setIsGenerating(false);
      setCurrentJobId(null);
      setGenerationError(null);
      setEditingInputs(false);
      planUsage.refreshUsage();
      showToast(parsed.kind === 'v2' ? '✓ Plan generated' : '✓ Plan ready — review below.', 'success');
    },
    [showToast, planUsage, handleJobFailed]
  );

  const handleJobCompleteRef = useRef(handleJobComplete);
  const handleJobFailedRef = useRef(handleJobFailed);

  useEffect(() => {
    handleJobCompleteRef.current = handleJobComplete;
    handleJobFailedRef.current = handleJobFailed;
  });

  useEffect(() => {
    if (!currentJobId) return;
    const jobId = currentJobId;

    console.log('[PlanBuilder] Creating Realtime channel with jobId:', jobId, typeof jobId);

    if (!jobId || typeof jobId !== 'string' || !jobId.includes('-')) {
      console.error('[PlanBuilder] Invalid jobId, skipping Realtime:', jobId);
      return;
    }
    if (!PLAN_BUILDER_JOB_UUID_RE.test(jobId)) {
      console.error('[PlanBuilder] Invalid jobId, skipping Realtime:', jobId);
      return;
    }

    let resolved = false;

    const resolveJob = (job) => {
      if (resolved) return;
      resolved = true;
      handleJobCompleteRef.current(job);
    };

    const rejectJob = (error) => {
      if (resolved) return;
      resolved = true;
      handleJobFailedRef.current(error);
    };

    const channel = supabase
      .channel(`plan-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const job = payload.new;
          console.log('[PlanBuilder] Realtime UPDATE:', job.status, 'progress:', job.progress, JSON.stringify(job));

          setJobStatus(job.status);

          if (isFailed(job)) {
            rejectJob(job.error || 'Plan generation failed');
            return;
          }

          if (isComplete(job)) {
            resolveJob(job);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[PlanBuilder] Realtime subscribed for job', jobId);
        }
      });

    let pollIntervalId = null;
    const pollStartId = window.setTimeout(() => {
      pollIntervalId = window.setInterval(async () => {
        if (resolved) return;
        try {
          const { data: job, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', jobId)
            .maybeSingle();

          if (error) {
            return;
          }
          if (!job) return;

          if (isFailed(job)) {
            rejectJob(job.error || 'Plan generation failed');
            return;
          }

          if (isComplete(job)) {
            resolveJob(job);
          }
        } catch (e) {
          console.error('[PlanBuilder] Poll error', e);
        }
      }, 2000);
    }, 2000);

    const softTimeoutId = window.setTimeout(() => {
      if (resolved) return;
      rejectJob('This is taking longer than expected. Your plan may still be generating — check back in a few minutes.');
    }, 300000);

    return () => {
      supabase.removeChannel(channel);
      window.clearTimeout(pollStartId);
      if (pollIntervalId != null) window.clearInterval(pollIntervalId);
      window.clearTimeout(softTimeoutId);
    };
  }, [currentJobId]);

  const handlePlatformToggle = (platformName) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformName) ? prev.filter((p) => p !== platformName) : [...prev, platformName]
    );
  };

  const resetToForm = () => {
    setGeneratedPlan(null);
    setEditingInputs(true);
    setGenerationError(null);
  };

  const handleGeneratePlan = async () => {
    if (selectedPlatforms.length === 0) {
      showToast('Please select at least one platform', 'error');
      return;
    }

    if (!planUsage.canGenerate) {
      showToast("You've reached your monthly Plan Builder limit. Resets on the 1st.", 'warning');
      return;
    }

    await planUsage.trackFeatureUsage({ platforms: selectedPlatforms, goal: selectedGoal });

    setGenerationError(null);
    setIsGenerating(true);
    setGeneratedPlan(null);
    setJobStatus('pending');

    try {
      const cachedTrends = getCachedTrends();
      const trendContext =
        Array.isArray(cachedTrends) && cachedTrends.length > 0
          ? `Current trending topics in the user's niche:\n${cachedTrends.slice(0, 4).map((t) => `- "${t.title || t.topic}" (${t.format_type || 'short-form'}, ${t.momentum || 'steady'})`).join('\n')}\nIncorporate 1-2 of these trending topics into the content plan where they naturally fit.`
          : '';

      const platformsArray = [
        ...new Set(
          selectedPlatforms
            .map((n) => normalizePlatformLabelForIcon(n) || n)
            .filter((n) => PLAN_BUILDER_PLATFORM_NAMES.has(n))
        ),
      ];

      const platformRulesBlock = platformsArray
        .map((p) => {
          const key = normalizePlatformRulesKey(p);
          const rules = PLATFORM_CONTENT_RULES[key] || PLATFORM_CONTENT_RULES.instagram;
          return [
            `--- ${rules.displayName} ---`,
            getPlatformPromptRule(key),
            `Posting frequency: ${rules.postingFrequency ?? 'Match cadence to your plan period and platform norms'}`,
            `Hashtags per post: ${getHashtagConstraint(key)}`,
          ].join('\n');
        })
        .join('\n\n');

      const { jobId: createdJobId, error: createError } = await createJobDirectly({
        contentGoal: selectedGoal,
        timePeriod: selectedPeriod,
        postingFrequency: resolvedPostingFrequency,
        platformFocus: platformsArray,
        niche: nicheInput.trim() || brandProfile?.niche || 'general',
        targetAudience: targetAudienceInput.trim(),
        brandVoiceTone: brandVoiceToneInput.trim(),
        followerRange,
        extraContext: extraContext.trim() || null,
        trendContext,
        platform_rules_block: platformRulesBlock,
        businessName: brandProfile?.businessName || brandProfile?.brandName || '',
        brandName: brandProfile?.brandName || '',
        website: brandProfile?.website || '',
      });

      if (createError || !createdJobId) {
        throw new Error(createError?.message || 'Failed to create job');
      }

      const jobId =
        typeof createdJobId === 'string' && PLAN_BUILDER_JOB_UUID_RE.test(createdJobId)
          ? createdJobId
          : null;
        if (!jobId) {
          console.error(
            '[PlanBuilder] createJobDirectly returned invalid job id (expected UUID from jobs.id):',
            createdJobId
          );
          throw new Error('Failed to create job: invalid job id');
        }

      flushSync(() => {
        setCurrentJobId(jobId);
      });

      const brandBlock = buildBrandContext(brandProfile, { first_name: user?.user_metadata?.first_name });
      const { success: webhookSuccess, error: webhookError } = await triggerN8nWebhook(jobId, {
        contentGoal: selectedGoal,
        timePeriod: String(selectedPeriod),
        postingFrequency: resolvedPostingFrequency,
        platformFocus: platformsArray,
        niche: nicheInput.trim() || brandProfile?.niche || 'general',
        targetAudience: targetAudienceInput.trim(),
        brandVoiceTone: brandVoiceToneInput.trim(),
        followerRange,
        extraContext: extraContext.trim() || null,
        brandVoice: brandVoiceToneInput.trim(),
        brandContext: brandBlock,
        trendContext,
        platform_rules_block: platformRulesBlock,
        platforms_list: platformsArray.join(', '),
        profileType: brandProfile?.profileType,
        firstName: brandProfile?.firstName,
        businessPrimaryGoal: brandProfile?.businessPrimaryGoal || null,
        creatorMonetizationPath: brandProfile?.creatorMonetizationPath || null,
        isLocalBusiness: brandProfile?.isLocalBusiness || false,
        city: brandProfile?.city || null,
        audienceLocationType: brandProfile?.audienceLocationType || 'local',
        contentMixOverride: brandProfile?.contentMix || null,
      });

      if (!webhookSuccess) {
        console.error('[PlanBuilder] n8n webhook trigger failed:', webhookError);
        try {
          const { generateContentPlan } = await import('../services/grokAPI');
          const grokResult = await generateContentPlan(
            `${selectedGoal} on ${platformsArray.join(', ')}. Brand voice: ${brandVoiceToneInput || 'engaging'}`,
            brandProfile,
            selectedPeriod,
            { platformRulesBlock }
          );

          if (grokResult.success && grokResult.plan) {
            const planText = grokResult.plan;
            const fallbackResult = {
              rawPlan: planText,
              goal: selectedGoal,
              period: selectedPeriod,
              platforms: platformsArray,
            };
            handleJobComplete({ result: fallbackResult });
            return;
          }
        } catch (fallbackError) {
          console.error('[PlanBuilder] Grok fallback also failed:', fallbackError);
        }

        const failMsg = 'Plan generation service unavailable. Please try again later.';
        setGenerationError(failMsg);
        showToast(failMsg, 'error');
        setIsGenerating(false);
        setCurrentJobId(null);
        return;
      }

      showToast('Your AI plan is being generated...', 'info');
    } catch (error) {
      console.error('handleGeneratePlan error:', error);
      setIsGenerating(false);
      const msg = formatJobError(error?.message || error);
      setGenerationError(msg);
      showToast(msg, 'error');
    }
  };

  const generateButtonSummary = useMemo(() => {
    const n = selectedPeriod;
    const w = resolvedPostingFrequency;
    const pl =
      selectedPlatforms.length > 0
        ? selectedPlatforms.join(', ')
        : 'your platforms';
    return `Generating a ${n}-day plan for ${w} post${w === 1 ? '' : 's'}/week across ${pl}.`;
  }, [selectedPeriod, resolvedPostingFrequency, selectedPlatforms]);

  const atLimit = planUsage.featureLimit > 0 && planUsage.featureUsed >= planUsage.featureLimit;

  return (
    <div className="flex-1 min-h-screen bg-gray-50 font-plan-body text-[#0C1220] ml-0 md:ml-12 lg:ml-64 pt-14 lg:pt-20 px-4 md:px-6 lg:px-8 pb-12 max-w-full overflow-x-hidden">
      <div className="mb-5 pb-1 md:mb-6 md:pb-1.5 max-w-7xl">
        <div className="flex items-center gap-3 md:gap-4 py-2">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white flex items-center justify-center border border-gray-200/80 shadow-sm">
            <Wand2 className="w-6 h-6 md:w-7 md:h-7 text-[#01BAD2]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-plan-display font-bold text-[#0C1220]">
              AI Plan Builder
            </h1>
            <p className="text-sm md:text-base text-gray-500 font-plan-body">
              Generate your content strategy
            </p>
          </div>
        </div>
      </div>

      {atLimit && (
        <div className="mt-1 mb-4 max-w-7xl">
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            You&apos;ve used all {planUsage.featureLimit} AI Plan generations for this month on your{' '}
            {userTier ? getTierDisplayName(userTier) : 'current'} plan. Your allowance resets on the 1st.{' '}
            <Link to="/dashboard/subscription" className="font-semibold text-[#01BAD2] underline underline-offset-2">
              Manage subscription
            </Link>
          </p>
        </div>
      )}

      {generationError && !isGenerating && (
        <div className="max-w-7xl mb-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>{generationError}</span>
            <button
              type="button"
              onClick={() => setGenerationError(null)}
              className="shrink-0 text-red-900 font-semibold underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {(() => {
        const showFormPanel =
          !generatedPlan || editingInputs || generatedPlan?.kind === 'fallback';
        const fieldClass =
          'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#0C1220] placeholder:text-gray-400 focus:border-[#01BAD2] focus:outline-none focus:ring-2 focus:ring-[#01BAD2]/25';
        const selectClass = `${fieldClass} appearance-none pr-10`;
        const pillBase =
          'rounded-full border px-3 py-1.5 text-sm font-medium shrink-0';
        const pillInactive = 'border-gray-200 bg-white text-gray-700 hover:border-[#01BAD2]/50';
        const pillActive = 'border-[#01BAD2] bg-[#01BAD2] text-white shadow-sm';

        if (!showFormPanel) return null;

        return (
          <div
            className={`max-w-6xl mx-auto pb-6 ${isGenerating ? 'opacity-90 pointer-events-none' : ''}`}
            aria-busy={isGenerating}
          >
            <div className="md:grid md:grid-cols-[11fr_9fr] md:gap-8">
              <div className="space-y-5 md:space-y-4">
              <StepSection n={1} title="Your Goal">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Content Goal
                  </label>
                  <div className="relative">
                    <select
                      value={selectedGoal}
                      onChange={(e) => setSelectedGoal(e.target.value)}
                      disabled={isGenerating}
                      className={selectClass}
                    >
                      {CONTENT_GOALS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Time Period
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[7, 14].map((d) => (
                      <button
                        key={d}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setSelectedPeriod(d)}
                        className={`${pillBase} px-4 py-2 min-w-[100px] flex-1 sm:flex-none ${selectedPeriod === d ? pillActive : pillInactive}`}
                      >
                        {d} Days
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Posting Frequency
                  </label>
                  <p className="text-xs text-gray-500 mb-1">How many posts per week?</p>
                  <div className="flex flex-nowrap gap-1.5 md:flex-wrap md:gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-thin">
                    {['3', '5', '7'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setPostingFreqMode(m)}
                        className={`${pillBase} flex-1 min-w-0 md:flex-none text-center ${postingFreqMode === m ? pillActive : pillInactive}`}
                      >
                        {m}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setPostingFreqMode('custom')}
                      className={`${pillBase} flex-1 min-w-0 md:flex-none text-center ${postingFreqMode === 'custom' ? pillActive : pillInactive}`}
                    >
                      Custom
                    </button>
                  </div>
                  {postingFreqMode === 'custom' && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={14}
                        disabled={isGenerating}
                        value={postingFreqCustom}
                        onChange={(e) => setPostingFreqCustom(Number(e.target.value))}
                        className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#01BAD2] focus:outline-none focus:ring-2 focus:ring-[#01BAD2]/25"
                      />
                      <span className="text-sm text-gray-600">posts per week (1–14)</span>
                    </div>
                  )}
                </div>
              </StepSection>

              <StepSection n={2} title="Your Brand">
                <Link
                  to="/dashboard/brand-voice"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#01BAD2] hover:underline mt-0 mb-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  From your Brand Profile — edit anytime
                </Link>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Niche / Industry</label>
                    <input
                      type="text"
                      value={nicheInput}
                      disabled={isGenerating}
                      onChange={(e) => setNicheInput(e.target.value)}
                      placeholder="e.g. Fitness coaching, SaaS, local bakery"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Target Audience</label>
                    <input
                      type="text"
                      value={targetAudienceInput}
                      disabled={isGenerating}
                      onChange={(e) => setTargetAudienceInput(e.target.value)}
                      placeholder="Who you create content for"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Brand Voice Tone</label>
                    <input
                      type="text"
                      value={brandVoiceToneInput}
                      disabled={isGenerating}
                      onChange={(e) => setBrandVoiceToneInput(e.target.value)}
                      placeholder="e.g. Warm, direct, expert-but-friendly"
                      className={fieldClass}
                    />
                  </div>
                </div>
              </StepSection>
              </div>

              <div className="space-y-5 md:space-y-4 mt-5 md:mt-0">
              <StepSection n={3} title="Platform Focus">
                <div className="grid grid-cols-3 gap-1.5 md:flex md:flex-wrap md:gap-2">
                  {PLAN_BUILDER_PLATFORMS.map((platform) => {
                    const Mono = platform.monoIcon || platform.icon;
                    const name = platform.name;
                    const isSelected = selectedPlatforms.includes(name);
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => handlePlatformToggle(name)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium ${
                          isSelected
                            ? 'border-[#01BAD2] bg-[#01BAD2]/10 text-[#0C1220]'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-[#01BAD2]/40'
                        }`}
                      >
                        <span className={isSelected ? 'text-[#01BAD2]' : 'text-gray-500'}>
                          <Mono className="h-4 w-4" />
                        </span>
                        {platform.displayName || name}
                      </button>
                    );
                  })}
                </div>
              </StepSection>

              <StepSection n={4} title="Follower Range">
                <div className="relative">
                  <select
                    value={followerRange}
                    disabled={isGenerating}
                    onChange={(e) => setFollowerRange(e.target.value)}
                    className={selectClass}
                  >
                    {FOLLOWER_RANGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </StepSection>

              <StepSection n={5} title="Optional Context">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setOptionalOpen(!optionalOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-left text-sm font-semibold text-[#0C1220] hover:border-[#01BAD2]/40"
                >
                  <span>Anything else AI should know?</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 ${optionalOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {optionalOpen && (
                  <textarea
                    value={extraContext}
                    disabled={isGenerating}
                    onChange={(e) => setExtraContext(e.target.value)}
                    placeholder="e.g. Running a spring promo in 2 weeks, short-form video performs best for us"
                    rows={4}
                    className={`${fieldClass} mt-2 resize-y`}
                  />
                )}
              </StepSection>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 space-y-3">
              <p className="text-center text-sm text-gray-600 font-plan-body">{generateButtonSummary}</p>
              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={isGenerating || atLimit || !planUsage.canGenerate}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#01BAD2] px-3 py-2.5 font-plan-display text-base font-semibold text-white shadow-md transition-all hover:bg-[#0199b0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                    <span className="text-center leading-snug">
                      {PLAN_BUILDER_LOADING_PHRASES[loadingPhraseIndex]}
                    </span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" />
                    Generate content plan
                  </>
                )}
              </button>
              {isGenerating ? (
                <p className="text-center text-sm text-gray-400">
                  This takes 60–90 seconds. Grab a coffee ☕
                </p>
              ) : null}
            </div>
          </div>
        );
      })()}

      {isGenerating && (
        <div className="max-w-[1100px] mx-auto mt-10 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Preview</p>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-full rounded bg-gray-200 animate-pulse" />
                <div className="h-16 rounded-lg border border-gray-200 bg-gradient-to-b from-white to-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!generatedPlan && !isGenerating && (
        <div className="max-w-[1100px] mx-auto mt-10 rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 px-4 py-12">
          <div className="grid grid-cols-7 gap-1 opacity-40 mb-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-100" />
            ))}
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <Wand2 className="h-8 w-8 text-[#01BAD2]/50" />
            <p className="font-plan-display text-lg font-semibold text-gray-600">Your strategy will appear here</p>
            <p className="text-sm text-gray-500 max-w-sm">
              Complete the form and generate a plan to see your day-by-day calendar.
            </p>
          </div>
        </div>
      )}

      {generatedPlan?.kind === 'fallback' && (
        <Motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6"
        >
          <div className="flex gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Plan received (classic format)</h2>
              <p className="text-sm text-gray-600 mt-1">
                Your plan was generated but can&apos;t display in the new format. Here&apos;s what we received:
              </p>
            </div>
          </div>
          <pre className="max-h-96 overflow-auto text-xs bg-white border border-amber-100 rounded-lg p-4 whitespace-pre-wrap font-mono text-gray-800">
            {generatedPlan.rawText}
          </pre>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(generatedPlan.rawText).then(() => showToast('Copied', 'success'))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={resetToForm}
              className="px-4 py-2 bg-huttle-primary text-white rounded-lg text-sm font-medium"
            >
              Start Over
            </button>
          </div>
        </Motion.div>
      )}

      {generatedPlan?.kind === 'v2' && (() => {
        const plan = generatedPlan.plan;
        const overview = plan?.overview || {};
        const displayDays = getPlanDaysForDisplay(plan);
        const planTitle =
          plan?.planTitle ||
          plan?.summary?.title ||
          overview?.strategy ||
          'Your content plan';

        const mix = overview.contentMix && typeof overview.contentMix === 'object' ? overview.contentMix : {};
        const mixEntries = [
          ['Educational', mix.educational],
          ['Entertaining', mix.entertaining],
          ['Authority', mix.authority],
          ['Promotional', mix.promotional],
          ['Personal', mix.personal],
        ].filter(([, val]) => Number(val) > 0);
        const mixTotal = mixEntries.reduce((s, [, n]) => s + Number(n), 0) || 1;

        const keyThemes = extractKeyThemesForDisplay(plan, []);
        const optimalMap = extractOptimalTimesMap(plan);
        const filteredOptimalEntries = optimalMap
          ? Object.entries(optimalMap).filter(([plat]) => {
              const norm = (normalizePlatformLabelForIcon(plat) || plat).toLowerCase();
              return selectedPlatforms.some((sp) => sp.toLowerCase() === norm || plat.toLowerCase() === sp.toLowerCase());
            })
          : [];

        const totalPosts = displayDays.reduce((sum, d) => sum + getDayPosts(d).length, 0);
        const platformList = [
          ...new Set(
            displayDays.flatMap((d) =>
              getDayPosts(d).map((p) => normalizePlatformLabelForIcon(p.platform) || p.platform).filter(Boolean)
            )
          ),
        ];
        const platformCount = new Set(platformList).size;
        const subtitlePlatforms =
          platformList.length > 0 ? platformList.join(', ') : selectedPlatforms.join(', ') || 'your platforms';
        const niche = nicheInput.trim() || brandProfile?.niche || '';

        const handleCopyFullPlan = () => {
          const doc = formatFullPlan(plan, displayDays);
          navigator.clipboard
            .writeText(doc)
            .then(() => showToast('Full plan copied to clipboard', 'success'));
        };

        const handleSaveFullPlan = async () => {
          if (!user?.id) {
            showToast('Sign in to save to your vault', 'warning');
            return;
          }
          if (totalPosts === 0) {
            showToast('No posts to save', 'warning');
            return;
          }
          setSavingAllVault(true);
          try {
            const dateLabels = displayDays
              .map((day, index) => getDayDisplayLabel(day, index))
              .filter(Boolean);
            const dateRangeLabel = dateLabels.length > 1
              ? `${dateLabels[0]} to ${dateLabels[dateLabels.length - 1]}`
              : (dateLabels[0] || `${selectedPeriod} Days`);
            const result = await saveToVault(user.id, buildContentVaultPayload({
              name: `${niche || 'Content'} Plan - ${dateRangeLabel}`,
              contentText: formatFullPlan(plan, displayDays),
              contentType: 'plan',
              toolSource: 'ai_plan_builder',
              toolLabel: 'AI Plan Builder',
              topic: niche || planTitle,
              platform: '',
              description: `AI Plan Builder | ${dateRangeLabel} | ${subtitlePlatforms}`,
              metadata: {
                goal: selectedGoal,
                period_days: selectedPeriod,
                total_posts: totalPosts,
                platforms: platformList,
                user_id: user.id,
                saved_at: new Date().toISOString(),
                date_range: dateRangeLabel,
              },
            }));
            if (!result.success) {
              throw new Error(result.error || 'Could not save full plan');
            }
            setSavedFullPlan(true);
            showToast('Saved to vault ✓', 'success');
          } catch (err) {
            console.error('[AIPlanBuilder] save full plan vault:', err);
            showToast('Could not save full plan to vault', 'error');
          } finally {
            setSavingAllVault(false);
          }
        };

        const saveAllBtnClass = savedFullPlan
          ? 'rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-sm font-semibold text-green-700'
          : 'rounded-xl bg-[#01BAD2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0199b0] disabled:opacity-60';
        const saveAllBtnText = savedFullPlan
          ? 'Saved ✓'
          : savingAllVault ? 'Saving…' : 'Save Full Plan';

        return (
          <>
            <div className="relative mt-8 max-w-7xl space-y-6 pb-28 md:pb-32 font-plan-body">
              {/* Plan Header */}
              <Motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="px-5 py-5 sm:px-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-plan-display text-2xl font-bold text-[#0C1220] leading-tight">
                        {sanitizeAIOutput(planTitle)}
                      </h2>
                      <p className="mt-2 text-sm text-gray-500">
                        {selectedPeriod}-Day {subtitlePlatforms} Strategy{niche ? ` for ${niche}` : ''}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700">
                          📅 {selectedPeriod} days
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700">
                          📱 {platformCount} platforms
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700">
                          ✍️ {totalPosts} posts
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 flex-wrap lg:flex-nowrap">
                      <button
                        type="button"
                        onClick={handleCopyFullPlan}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        Copy full plan
                      </button>
                      {user?.id && (
                        <button
                          type="button"
                          onClick={handleSaveFullPlan}
                          disabled={savingAllVault || savedFullPlan || totalPosts === 0}
                          className={saveAllBtnClass}
                        >
                          {saveAllBtnText}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Motion.div>

              {/* Strategy Strip */}
              {(mixEntries.length > 0 || filteredOptimalEntries.length > 0 || keyThemes.length > 0) && (
                <div className="rounded-xl bg-gray-100 overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                    {mixEntries.length > 0 && (
                      <div className="px-6 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                          Content mix
                        </p>
                        <div className="space-y-1 text-xs text-gray-800">
                          {mixEntries.map(([label, val]) => (
                            <p key={label}>
                              <span>{MIX_DOT_EMOJI[label] || '⚪'}</span>{' '}
                              <span className="font-medium">{label}</span>{' '}
                              <span className="text-gray-500">{Math.round((Number(val) / mixTotal) * 100)}%</span>
                            </p>
                          ))}
                        </div>
                        <div className="flex rounded-full overflow-hidden h-2 w-full mt-3">
                          {mixEntries.map(([label, val]) => (
                            <div
                              key={label}
                              style={{ width: `${Math.round((Number(val) / mixTotal) * 100)}%` }}
                              className={MIX_BAR_COLOR[label] || 'bg-gray-300'}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {filteredOptimalEntries.length > 0 && (
                      <div className="px-6 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                          Best times
                        </p>
                        <div className="space-y-1 text-xs text-gray-800">
                          {filteredOptimalEntries.map(([plat, times]) => (
                            <p key={plat}>
                              <span className="font-semibold text-gray-900">{plat}</span>{' '}
                              {formatTimesForDisplay(times).replace(/:00/g, '')}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {keyThemes.length > 0 && (
                      <div className="px-6 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                          Key themes
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {keyThemes.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-800"
                            >
                              {sanitizeAIOutput(t)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Weekly Tips */}
              {Array.isArray(plan.weeklyTips) && plan.weeklyTips.length > 0 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {plan.weeklyTips.map((tip, idx) => (
                    <div key={idx} className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                      <p className="text-sm text-gray-800">{sanitizeAIOutput(tip)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Day-by-Day Posts */}
              <div className="space-y-8">
                {displayDays.filter(day => getDayPosts(day).length > 0).map((day, di) => {
                  const dayNum = Number(day?.day) || di + 1;
                  return (
                    <section key={`plan-day-${di}-${dayNum}`}>
                      <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-gray-200" />
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full border border-gray-200">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Day {dayNum}
                          </span>
                          {day.date && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="text-xs text-gray-400">{sanitizeAIOutput(day.date)}</span>
                            </>
                          )}
                          {day.theme && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="text-xs text-cyan-600 font-medium">{sanitizeAIOutput(day.theme)}</span>
                            </>
                          )}
                        </div>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <div className="mt-4 space-y-4">
                        {getDayPosts(day).map((post, pi) => (
                          <Motion.div
                            key={`post-${di}-${pi}-${dayNum}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(pi, 8) * 0.04 }}
                          >
                            <PlanBuilderPostCard
                              post={post}
                              dayNum={dayNum}
                              dayLabel={getDayDisplayLabel(day, di)}
                              userId={user?.id}
                              showToast={showToast}
                            />
                          </Motion.div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
              <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 ml-0 md:ml-12 lg:ml-64 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  {totalPosts} posts across {displayDays.length} days
                </p>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={resetToForm}
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  >
                    Start over
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyFullPlan}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Copy full plan
                  </button>
                  {user?.id && (
                    <button
                      type="button"
                      onClick={handleSaveFullPlan}
                      disabled={savingAllVault || savedFullPlan || totalPosts === 0}
                      className={
                        savedFullPlan
                          ? 'rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm font-semibold text-green-700'
                          : 'rounded-xl bg-[#01BAD2] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0199b0] disabled:opacity-60'
                      }
                    >
                      {saveAllBtnText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
