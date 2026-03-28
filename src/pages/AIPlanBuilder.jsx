import { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import {
  Wand2,
  Loader2,
  AlertTriangle,
  FolderPlus,
  Pencil,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  X,
  Calendar,
  PenLine,
  Smartphone,
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
  educational: { label: 'Educational', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  entertaining: { label: 'Entertaining', className: 'bg-amber-100 text-amber-900 border-amber-200' },
  authority: { label: 'Authority', className: 'bg-violet-100 text-violet-800 border-violet-200' },
  promotional: { label: 'Promotional', className: 'bg-rose-100 text-rose-800 border-rose-200' },
  default: { label: 'Post', className: 'bg-gray-100 text-gray-800 border-gray-200' },
};

function contentTypeBadgeProps(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('educat')) return CONTENT_TYPE_BADGE.educational;
  if (s.includes('entertain')) return CONTENT_TYPE_BADGE.entertaining;
  if (s.includes('author')) return CONTENT_TYPE_BADGE.authority;
  if (s.includes('promo')) return CONTENT_TYPE_BADGE.promotional;
  return { ...CONTENT_TYPE_BADGE.default, label: raw ? String(raw).slice(0, 24) : 'Post' };
}

const PILLAR_QUICK_ADD = ['Educational tips', 'Behind the scenes', 'Client results'];

/** Supabase `jobs.id` is UUID; reject ISO dates and other strings that break Realtime filters */
const PLAN_BUILDER_JOB_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rotating button label while a plan job is running — signals progress, not a freeze. */
const PLAN_BUILDER_LOADING_PHRASES = [
  'Analyzing your niche...',
  'Mapping content pillars...',
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
  if (post.caption) lines.push(`Caption: ${post.caption}`);
  const tags = Array.isArray(post.hashtags) ? post.hashtags : [];
  if (tags.length && !isTwitterLikePlatform(post.platform)) {
    lines.push(
      `Hashtags: ${tags.map((h) => (String(h).startsWith('#') ? h : `#${String(h).replace(/^#/, '')}`)).join(' ')}`
    );
  }
  if (post.cta) lines.push(`CTA: ${post.cta}`);
  return lines.join('\n\n');
}

function formatPostVaultBody(post) {
  return formatPostForClipboard(post);
}

function buildPlanBuilderClipboardDocument(plan, displayDays, mixLine, keyThemeLabels) {
  const title =
    plan?.planTitle ||
    plan?.summary?.title ||
    plan?.overview?.strategy ||
    'Content Plan';
  const lines = [];
  lines.push(title);
  lines.push('Generated by Huttle AI');
  lines.push('');
  lines.push('STRATEGY OVERVIEW');
  lines.push(`Content Mix: ${mixLine}`);
  lines.push(`Key Themes: ${keyThemeLabels.length ? keyThemeLabels.join(', ') : '—'}`);
  lines.push('');
  displayDays.forEach((day, di) => {
    lines.push(`━━━ DAY ${di + 1} ━━━`);
    getDayPosts(day).forEach((post) => {
      const plat = String(normalizePlatformLabelForIcon(post.platform) || post.platform || '').toUpperCase();
      const ct = contentTypeBadgeProps(post.contentType).label;
      const time = post.postTime || '—';
      lines.push(`📱 ${plat} — ${ct} — ${time}`);
      if (post.hook) lines.push(`Hook: ${post.hook}`);
      if (post.caption) lines.push(`Caption: ${post.caption}`);
      const tags = Array.isArray(post.hashtags) ? post.hashtags : [];
      if (tags.length && !isTwitterLikePlatform(post.platform)) {
        lines.push(
          `Hashtags: ${tags.map((h) => (String(h).startsWith('#') ? h : `#${String(h).replace(/^#/, '')}`)).join(' ')}`
        );
      }
      if (post.cta) lines.push(`CTA: ${post.cta}`);
      if (post.notes) lines.push(`Visual: ${post.notes}`);
      if (post.why_this_works) lines.push(`Why this works: ${post.why_this_works}`);
      lines.push('');
    });
  });
  const tips = plan?.weeklyTips || [];
  if (tips.length) {
    lines.push('WEEKLY TIPS');
    tips.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  }
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

function PlanBuilderPostCard({ post, dayNum, userId, showToast }) {
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [savingVault, setSavingVault] = useState(false);
  const [savedVault, setSavedVault] = useState(false);

  const platLabel = normalizePlatformLabelForIcon(post.platform) || post.platform || 'Platform';
  const borderC = PLATFORM_CARD_BORDER[platLabel] || '#64748b';
  const ct = contentTypeBadgeProps(post.contentType);
  const caption = sanitizeAIOutput(post.caption || post.topic || '');
  const hook = sanitizeAIOutput(post.hook || '');
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags.map(String).filter(Boolean) : [];
  const hideTags = isTwitterLikePlatform(post.platform);
  const visibleTags = detailsOpen ? hashtags : hashtags.slice(0, 3);
  const moreTagCount = !detailsOpen && hashtags.length > 3 ? hashtags.length - 3 : 0;
  const visualText = sanitizeAIOutput(post.notes || '');

  const handleCopyPost = () => {
    navigator.clipboard.writeText(formatPostForClipboard(post)).then(() => showToast('Post copied to clipboard', 'success'));
  };

  const handleSaveVault = async () => {
    if (!userId) {
      showToast('Sign in to save to your vault', 'warning');
      return;
    }
    setSavingVault(true);
    try {
      const result = await saveToVault(userId, {
        ...buildContentVaultPayload({
          name: `${platLabel} — Day ${dayNum}`,
          contentText: formatPostVaultBody(post),
          contentType: 'plan',
          toolSource: 'ai_plan_builder',
          toolLabel: 'AI Plan Builder',
          topic: (post.hook || '').slice(0, 80),
          platform: post.platform,
          description: 'Saved from AI Plan Builder',
          metadata: {
            day: dayNum,
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
      className="rounded-xl border border-gray-200 bg-white px-4 py-4 border-l-4"
      style={{ borderLeftColor: borderC }}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#0C1220]">
          {getPlatformIcon(post.platform, 'h-4 w-4')}
          {platLabel}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${ct.className}`}>
          {sanitizeAIOutput(ct.label)}
        </span>
        {post.postTime ? (
          <span className="inline-flex items-center gap-1 text-gray-500 text-xs ml-auto sm:ml-0">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {sanitizeAIOutput(post.postTime)}
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Hook</p>
        <p className="text-lg font-bold text-[#0C1220] leading-snug">{hook || '—'}</p>
      </div>

      {caption ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-500 mb-1">Caption</p>
          <p
            className={`text-sm text-gray-700 whitespace-pre-wrap ${
              captionExpanded || detailsOpen ? '' : 'line-clamp-3'
            }`}
          >
            {caption}
          </p>
          {!detailsOpen &&
          (caption.length > 100 || (caption.match(/\n/g) || []).length >= 2) ? (
            <button
              type="button"
              onClick={() => setCaptionExpanded((v) => !v)}
              className="mt-1 text-xs font-semibold text-[#01BAD2]"
            >
              {captionExpanded ? 'Show less' : 'Show more'}
            </button>
          ) : null}
        </div>
      ) : null}

      {!hideTags && hashtags.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {visibleTags.map((h, i) => (
            <span
              key={`${h}-${i}`}
              className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs text-gray-800"
            >
              {h.startsWith('#') ? h : `#${h.replace(/^#/, '')}`}
            </span>
          ))}
          {moreTagCount > 0 ? (
            <span className="text-xs text-gray-500">+{moreTagCount} more</span>
          ) : null}
        </div>
      ) : null}

      {post.cta ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-500">CTA</p>
          <p className="text-sm text-gray-800">{sanitizeAIOutput(post.cta)}</p>
        </div>
      ) : null}

      {visualText && !detailsOpen ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">📷 Visual</p>
          <p className="text-sm text-gray-700 line-clamp-1">{visualText}</p>
        </div>
      ) : null}

      {detailsOpen ? (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 text-sm">
          {caption ? (
            <div>
              <p className="text-xs font-semibold text-gray-500">Full caption</p>
              <p className="text-gray-700 whitespace-pre-wrap">{caption}</p>
            </div>
          ) : null}
          {!hideTags && hashtags.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-500">All hashtags</p>
              <p className="text-gray-800">
                {hashtags.map((h) => (h.startsWith('#') ? h : `#${h.replace(/^#/, '')}`)).join(' ')}
              </p>
            </div>
          ) : null}
          {visualText ? (
            <div>
              <p className="text-xs font-semibold text-gray-500">Visual direction</p>
              <p className="text-gray-700 whitespace-pre-wrap">{visualText}</p>
            </div>
          ) : null}
          {post.why_this_works ? (
            <div>
              <p className="text-xs font-semibold text-gray-500">Why this works</p>
              <p className="text-gray-700 whitespace-pre-wrap">{sanitizeAIOutput(post.why_this_works)}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopyPost}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
        >
          Copy post
        </button>
        <button
          type="button"
          onClick={handleSaveVault}
          disabled={savingVault || savedVault}
          className="rounded-lg bg-[#01BAD2] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0199b0] disabled:opacity-70"
        >
          {savedVault ? 'Saved ✓' : savingVault ? 'Saving…' : 'Save to vault'}
        </button>
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 inline-flex items-center gap-1"
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
  const [contentPillars, setContentPillars] = useState([]);
  const [pillarDraft, setPillarDraft] = useState('');
  const [followerRange, setFollowerRange] = useState('0-500');
  const [extraContext, setExtraContext] = useState('');
  const [optionalOpen, setOptionalOpen] = useState(false);

  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [editingInputs, setEditingInputs] = useState(true);
  const [savingAllVault, setSavingAllVault] = useState(false);

  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
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
        } catch (_) {
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
        } catch (_) {
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d75599bc-0f49-444b-a4c6-aaf631e54b4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ed988'},body:JSON.stringify({sessionId:'3ed988',location:'AIPlanBuilder.jsx:rejectJob',message:'job rejected',data:{hypothesisId:'H7',jobId,reason:typeof error==='string'?error.slice(0,300):String(error).slice(0,300)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d75599bc-0f49-444b-a4c6-aaf631e54b4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ed988'},body:JSON.stringify({sessionId:'3ed988',location:'AIPlanBuilder.jsx:realtimeUpdate',message:'postgres UPDATE jobs',data:{hypothesisId:'H7',status:job.status,progress:job.progress,errLen:typeof job.error==='string'?job.error.length:job.error!=null?1:0,isFailedCheck:isFailed(job),isCompleteCheck:isComplete(job)},timestamp:Date.now()})}).catch(()=>{});
          // #endregion

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
      .subscribe((status, err) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d75599bc-0f49-444b-a4c6-aaf631e54b4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ed988'},body:JSON.stringify({sessionId:'3ed988',location:'AIPlanBuilder.jsx:realtime',message:'realtime channel status',data:{hypothesisId:'H3',jobId,status,errMsg:String(err?.message||'').slice(0,160)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (status === 'SUBSCRIBED') {
          console.log('[PlanBuilder] Realtime subscribed for job', jobId);
        }
      });

    let pollIntervalId = null;
    let loggedFirstPollSuccess = false;
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d75599bc-0f49-444b-a4c6-aaf631e54b4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ed988'},body:JSON.stringify({sessionId:'3ed988',location:'AIPlanBuilder.jsx:poll',message:'jobs poll error',data:{hypothesisId:'H1',jobId,errCode:error.code,errMsg:String(error.message||'').slice(0,220),details:error.details},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            return;
          }
          if (!job) return;

          if (!loggedFirstPollSuccess && job) {
            loggedFirstPollSuccess = true;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d75599bc-0f49-444b-a4c6-aaf631e54b4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ed988'},body:JSON.stringify({sessionId:'3ed988',location:'AIPlanBuilder.jsx:poll',message:'jobs poll first row',data:{hypothesisId:'H4',status:job.status,hasResult:job.result!=null,hasProgress:'progress'in job,progressVal:job.progress,completed_at:job.completed_at?1:0,errorEmpty:typeof job.error==='string'&&job.error==='',errorLen:typeof job.error==='string'?job.error.length:job.error!=null?1:0,keys:Object.keys(job).slice(0,25)},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
          }

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

  const addPillar = () => {
    const t = pillarDraft.trim();
    if (!t) return;
    if (contentPillars.length >= 5) {
      showToast('Maximum 5 content pillars', 'warning');
      return;
    }
    if (contentPillars.some((p) => p.toLowerCase() === t.toLowerCase())) {
      setPillarDraft('');
      return;
    }
    setContentPillars((p) => [...p, t]);
    setPillarDraft('');
  };

  const removePillar = (idx) => {
    setContentPillars((p) => p.filter((_, i) => i !== idx));
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
    if (contentPillars.length < 1) {
      showToast('Add at least one content pillar', 'error');
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
        contentPillars,
        followerRange,
        extraContext: extraContext.trim() || null,
        trendContext,
        platform_rules_block: platformRulesBlock,
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
        contentPillars,
        followerRange,
        extraContext: extraContext.trim() || null,
        brandVoice: brandVoiceToneInput.trim(),
        brandContext: brandBlock,
        trendContext,
        platform_rules_block: platformRulesBlock,
        platforms_list: platformsArray.join(', '),
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
    <div className="flex-1 min-h-screen bg-[#F4F7FB] font-plan-body text-[#0C1220] ml-0 md:ml-12 lg:ml-64 pt-14 lg:pt-20 px-4 md:px-6 lg:px-8 pb-12 max-w-full overflow-x-hidden">
      <div className="mb-5 pb-1 md:mb-6 md:pb-1.5 max-w-4xl mx-auto lg:mx-0">
        <div className="flex items-center gap-3 md:gap-4">
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
        <div className="mt-1 mb-4 max-w-4xl mx-auto lg:mx-0">
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
        <div className="max-w-4xl mx-auto mb-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800">
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
            className={`max-w-4xl mx-auto pb-6 ${isGenerating ? 'opacity-90 pointer-events-none' : ''}`}
            aria-busy={isGenerating}
          >
            <div className="md:grid md:grid-cols-2 md:gap-6">
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

              <StepSection n={4} title="Content Pillars">
                <p className="text-xs text-gray-500">
                  3–5 themes you post about (min 1, max 5).
                </p>
                <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#01BAD2]/25 focus-within:border-[#01BAD2]">
                  <input
                    type="text"
                    value={pillarDraft}
                    disabled={isGenerating}
                    onChange={(e) => setPillarDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPillar())}
                    placeholder="Add a pillar..."
                    className="flex-1 min-w-0 border-0 px-4 py-2.5 text-sm focus:ring-0"
                  />
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={addPillar}
                    className="flex h-10 w-10 shrink-0 items-center justify-center border-l border-gray-200 bg-gray-50 text-[#01BAD2] hover:bg-[#01BAD2]/10"
                    aria-label="Add pillar"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-1 mb-0">
                  {PILLAR_QUICK_ADD.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => {
                        if (contentPillars.length >= 5) {
                          showToast('Maximum 5 content pillars', 'warning');
                          return;
                        }
                        if (contentPillars.some((p) => p.toLowerCase() === s.toLowerCase())) return;
                        setContentPillars((prev) => [...prev, s]);
                      }}
                      className="text-xs font-medium text-[#01BAD2] underline-offset-2 hover:underline"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
                {contentPillars.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {contentPillars.map((p, i) => (
                      <span
                        key={`${p}-${i}`}
                        className="inline-flex items-center gap-1 rounded-full border border-[#01BAD2]/20 bg-[#01BAD2]/8 px-3 py-1 text-sm text-[#0C1220]"
                      >
                        {p}
                        <button
                          type="button"
                          disabled={isGenerating}
                          className="rounded-full p-0.5 text-gray-500 hover:bg-[#01BAD2]/15 hover:text-[#0C1220]"
                          onClick={() => removePillar(i)}
                          aria-label={`Remove ${p}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </StepSection>

              <StepSection n={5} title="Follower Range">
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

              <StepSection n={6} title="Optional Context">
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
          ['Educational', mix.educational, 'bg-blue-500'],
          ['Entertaining', mix.entertaining, 'bg-amber-400'],
          ['Authority', mix.authority, 'bg-violet-500'],
          ['Promotional', mix.promotional, 'bg-rose-400'],
          ['Personal', mix.personal, 'bg-teal-500'],
        ].filter(([, val]) => Number(val) > 0);
        const mixTotal = mixEntries.reduce((s, [, n]) => s + Number(n), 0) || 1;
        const mixLine = mixEntries.length
          ? mixEntries.map(([label, val]) => `${label} ${Math.round((Number(val) / mixTotal) * 100)}%`).join(' | ')
          : '—';
        const keyThemes = extractKeyThemesForDisplay(plan, contentPillars);
        const optimalMap = extractOptimalTimesMap(plan);
        const clipboardDoc = buildPlanBuilderClipboardDocument(plan, displayDays, mixLine, keyThemes);

        const totalPosts = displayDays.reduce((sum, d) => sum + getDayPosts(d).length, 0);
        const platformList = [
          ...new Set(
            displayDays.flatMap((d) =>
              getDayPosts(d).map((p) => normalizePlatformLabelForIcon(p.platform) || p.platform).filter(Boolean)
            )
          ),
        ];
        const platformSet = new Set(platformList);
        const subtitlePlatforms =
          platformList.length > 0 ? platformList.join(', ') : selectedPlatforms.join(', ') || 'your platforms';

        const handleCopyFullPlan = () => {
          navigator.clipboard
            .writeText(clipboardDoc)
            .then(() => showToast('Full plan copied to clipboard', 'success'));
        };

        const handleSaveAllVault = async () => {
          if (!user?.id) {
            showToast('Sign in to save to your vault', 'warning');
            return;
          }
          if (totalPosts === 0) {
            showToast('No posts to save', 'warning');
            return;
          }
          setSavingAllVault(true);
          let saved = 0;
          try {
            for (let di = 0; di < displayDays.length; di += 1) {
              const day = displayDays[di];
              const dayNum = Number(day?.day) || di + 1;
              const posts = getDayPosts(day);
              for (let pi = 0; pi < posts.length; pi += 1) {
                const post = posts[pi];
                const platLabel = normalizePlatformLabelForIcon(post.platform) || post.platform || '';
                const result = await saveToVault(user.id, {
                  ...buildContentVaultPayload({
                    name: `${platLabel} — Day ${dayNum} (${pi + 1})`,
                    contentText: formatPostVaultBody(post),
                    contentType: 'plan',
                    toolSource: 'ai_plan_builder',
                    toolLabel: 'AI Plan Builder',
                    topic: (post.hook || '').slice(0, 80),
                    platform: post.platform,
                    description: 'Saved from AI Plan Builder',
                    metadata: {
                      day: dayNum,
                      contentType: post.contentType ?? '',
                      bestTime: post.postTime ?? '',
                    },
                  }),
                  type: 'plan_builder',
                });
                if (result.success) saved += 1;
              }
            }
            if (saved > 0) {
              showToast(`${saved} posts saved to your Content Vault`, 'success');
            } else {
              showToast('Could not save posts to vault', 'error');
            }
          } catch (err) {
            console.error('[AIPlanBuilder] save all vault:', err);
            showToast('Could not save posts to vault', 'error');
          } finally {
            setSavingAllVault(false);
          }
        };

        return (
          <>
            <div className="relative mt-10 max-w-[1200px] mx-auto space-y-8 pb-28 md:pb-32 font-plan-body">
              <Motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between border-b border-gray-200 pb-6"
              >
                <div className="min-w-0">
                  <h2 className="font-plan-display text-[22px] font-bold text-[#0C1220] leading-tight">
                    {sanitizeAIOutput(planTitle)}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {displayDays.length}-Day {subtitlePlatforms} Strategy
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700">
                      <Calendar className="h-3.5 w-3.5 text-gray-500" />
                      {displayDays.length} days
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700">
                      <Smartphone className="h-3.5 w-3.5 text-gray-500" />
                      {platformSet.size} platforms
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700">
                      <PenLine className="h-3.5 w-3.5 text-gray-500" />
                      {totalPosts} posts total
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyFullPlan}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Copy full plan
                  </button>
                  {user?.id ? (
                    <button
                      type="button"
                      onClick={handleSaveAllVault}
                      disabled={savingAllVault || totalPosts === 0}
                      className="rounded-xl bg-[#01BAD2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0199b0] disabled:opacity-60"
                    >
                      {savingAllVault ? 'Saving…' : 'Save all to vault'}
                    </button>
                  ) : null}
                </div>
              </Motion.div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-0">
                  <div className="flex-1 min-w-0 lg:pr-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Content mix
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-gray-800">
                      {mixEntries.length > 0 ? (
                        mixEntries.map(([label, val]) => (
                          <span key={label} className="inline-flex items-center gap-1 whitespace-nowrap">
                            <span>{MIX_DOT_EMOJI[label] || '⚪'}</span>
                            <span className="font-medium">{label}</span>
                            <span className="text-gray-500">{Math.round((Number(val) / mixTotal) * 100)}%</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>
                  </div>
                  <div className="hidden lg:block w-px shrink-0 bg-gray-200 self-stretch min-h-[3rem]" aria-hidden />
                  <div className="flex-1 min-w-0 lg:px-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Best times
                    </p>
                    <div className="space-y-1 text-xs text-gray-800">
                      {optimalMap && Object.keys(optimalMap).length > 0 ? (
                        Object.entries(optimalMap).map(([plat, times]) => (
                          <p key={plat}>
                            <span className="font-semibold text-gray-900">{plat}:</span>{' '}
                            {formatTimesForDisplay(times)}
                          </p>
                        ))
                      ) : (
                        <p className="text-gray-500">See each post for suggested posting times.</p>
                      )}
                    </div>
                  </div>
                  <div className="hidden lg:block w-px shrink-0 bg-gray-200 self-stretch min-h-[3rem]" aria-hidden />
                  <div className="flex-1 min-w-0 lg:pl-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Key themes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {keyThemes.length > 0 ? (
                        keyThemes.map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-800"
                          >
                            {sanitizeAIOutput(t)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

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

              <div className="space-y-10">
                {displayDays.map((day, di) => {
                  const dayNum = Number(day?.day) || di + 1;
                  const dayLabel = sanitizeAIOutput(day.date || day.theme || `Day ${dayNum}`);
                  return (
                    <section key={`plan-day-${di}-${dayNum}`}>
                      <div className="relative flex items-center justify-center py-2">
                        <div className="absolute inset-x-0 top-1/2 h-px bg-gray-200" aria-hidden />
                        <span className="relative bg-[#F4F7FB] px-3 text-sm font-semibold text-gray-600">
                          Day {di + 1} · {dayLabel}
                        </span>
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

            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
              <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 ml-0 md:ml-12 lg:ml-64 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-[#0C1220]">{totalPosts}</span> posts across{' '}
                  <span className="font-semibold text-[#0C1220]">{displayDays.length}</span> days
                </p>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={resetToForm}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
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
                  {user?.id ? (
                    <button
                      type="button"
                      onClick={handleSaveAllVault}
                      disabled={savingAllVault || totalPosts === 0}
                      className="rounded-xl bg-[#01BAD2] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0199b0] disabled:opacity-60"
                    >
                      {savingAllVault ? 'Saving…' : 'Save all to vault'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
