import { useCallback, useContext, useState, useEffect, useMemo, useRef } from 'react'; // HUTTLE AI: cache fix
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useBrand } from '../context/BrandContext';
import { useDashboardCache } from '../context/DashboardContext'; // HUTTLE AI: cache fix
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  Target,
  Bell,
  Sparkles,
  ArrowRight,
  Beaker,
  Zap,
  ChevronRight,
  Copy,
  Check,
  MessageSquare,
  Hash,
  Type,
  BarChart3,
  Image as ImageIcon,
  FolderOpen,
  Loader2,
  RotateCcw,
  X,
  Flame,
  Info,
  Camera,
  ChevronDown,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import GuidedTour from '../components/GuidedTour';
import confetti from 'canvas-confetti';
import FloatingActionButton from '../components/FloatingActionButton';
import { BrandVoiceUpdateBanner } from '../components/BrandVoiceUpdateBanner';
import { hasProfileContext, isCreatorProfile } from '../utils/brandContextBuilder';
import { getHashtagPersonalizationContext } from '../utils/hashtagPersonalization';
import { getPlatformIcon, normalizePlatformLabelForIcon } from '../components/SocialIcons';
import { supabase, getContentLibraryItems } from '../config/supabase';
import { CONTENT_VAULT_UPDATED_EVENT } from '../services/contentService';
import {
  generateDashboardData,
  getDashboardCache, // HUTTLE AI: cache fix
  deleteDashboardCache, // HUTTLE AI: cache fix
  getDashboardGeneratedDate, // HUTTLE AI: cache fix
  getNextLocalDashboardRefreshAt,
  hasPersistableTrendingTopics,
  trackDashboardGenerationUsage,
  fetchDashboardForYouHashtags,
  fetchDashboardTrendingHashtagsForPlatforms,
  setCachedTrends,
  getBrandPersonalizationKey,
} from '../services/dashboardCacheService';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { sanitizeAIOutput } from '../utils/textHelpers'; // HUTTLE: sanitized

const TRENDING_FRESH_MS = 4 * 60 * 60 * 1000;

/** 'loading' | 'live' | 'stale' | 'fallback' | 'retrying' — derived from payload, not padded display list. */
function computeTrendingStatusFromData(data) {
  if (!data) return 'fallback';
  const topics = Array.isArray(data.trending_topics) ? data.trending_topics : [];
  if (topics.length === 0) return 'fallback';
  const hasReal = topics.some((t) => t && !t._isSampleTrend);
  if (!hasReal) return 'fallback';
  const ts = data.created_at;
  if (!ts) return 'stale';
  const t = new Date(ts).getTime();
  if (Number.isNaN(t)) return 'stale';
  return Date.now() - t <= TRENDING_FRESH_MS ? 'live' : 'stale';
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};
const MotionDiv = motion.div;
const TOTAL_HASHTAG_CAP = 10;
const TRENDING_NOW_CARD_CAP = 6;
const HASHTAG_MODE_STORAGE_KEY = 'huttle_hashtag_mode';

/** Matches dashboard cache `formatPlatformLabel` for Brand Profile / Settings platform strings. */
function toDashboardPlatformLabel(raw) {
  const v = String(raw || '').toLowerCase();
  if (v.includes('instagram')) return 'Instagram';
  if (v.includes('facebook')) return 'Facebook';
  if (v.includes('tiktok')) return 'TikTok';
  if (v.includes('youtube')) return 'YouTube';
  if (v === 'x' || v.includes('twitter')) return 'X';
  return 'Instagram';
}

function platformIdFromTrend(trend) {
  const raw = trend?.platform;
  if (typeof raw === 'string' && raw.length && !String(raw).includes(' ')) {
    const v = raw.toLowerCase();
    if (['instagram', 'tiktok', 'facebook', 'youtube', 'twitter', 'x'].includes(v)) {
      return v === 'x' ? 'twitter' : v;
    }
  }
  const label = String(trend?.relevant_platform || '').toLowerCase();
  if (label.includes('tiktok')) return 'tiktok';
  if (label.includes('facebook')) return 'facebook';
  if (label.includes('youtube')) return 'youtube';
  if (label.includes('x') || label.includes('twitter')) return 'twitter';
  return 'instagram';
}

/**
 * Round-robin up to `cap` trends across platform buckets so multi-platform users see a mix.
 */
const FALLBACK_TREND_SEEDS = [
  {
    topic: 'Behind-the-scenes storytelling',
    description: 'Audiences still reward process clips and imperfect, real moments over heavy editing.',
    format_type: 'Reel',
    momentum: 'Rising',
    trend_type: 'niche',
    niche_angle: 'Show the setup, bloopers, or “how we made this” beats.',
    hook_starter: 'Nobody told me this part of the process would be the hook…',
    why_its_working: 'BTS content builds trust fast because it feels human, not staged.',
  },
  {
    topic: 'Myth-busting carousels',
    description: 'Short, confident corrections to common beliefs still stop the scroll.',
    format_type: 'Carousel',
    momentum: 'Peaking',
    trend_type: 'hybrid',
    niche_angle: 'Lead with the myth, then replace it with a clearer mental model.',
    hook_starter: 'Myth: “You need perfect lighting.” Truth: you need this one framing choice.',
    why_its_working: 'Contrast + clarity triggers saves and shares in the feed.',
  },
  {
    topic: 'Voice-first hot takes',
    description: 'Talking-head clips with a strong opinion outperform generic tips.',
    format_type: 'Short-form video',
    momentum: 'Rising',
    trend_type: 'global',
    niche_angle: 'One belief you disagree with in your industry—say it plainly in 20 seconds.',
    hook_starter: 'Unpopular opinion: this “best practice” is costing you reach.',
    why_its_working: 'Polarity drives comments, which signals relevance to ranking systems.',
  },
  {
    topic: 'Before / after micro-stories',
    description: 'Tiny arcs (“then vs now”) still outperform static advice posts.',
    format_type: 'Reel',
    momentum: 'Steady',
    trend_type: 'niche',
    niche_angle: 'Pick a single metric or feeling that changed—not ten.',
    hook_starter: 'Same niche. Same offer. Two different hooks—only one scaled.',
    why_its_working: 'Narrative motion keeps watch time up without needing a long script.',
  },
  {
    topic: 'Comment-driven prompts',
    description: 'Posts that beg for a one-word or “this or that” reply still juice distribution.',
    format_type: 'Static',
    momentum: 'Rising',
    trend_type: 'hybrid',
    niche_angle: 'Ask for a keyword comment that doubles as segmentation.',
    hook_starter: 'Type “READY” if you want the checklist I used this week.',
    why_its_working: 'Comment velocity is a strong signal on most major platforms.',
  },
  {
    topic: 'Founder-style lessons learned',
    description: '“What I’d do differently” posts feel personal and save-worthy.',
    format_type: 'Carousel',
    momentum: 'Steady',
    trend_type: 'niche',
    niche_angle: 'Three lessons, one mistake you almost repeated, one you avoided.',
    hook_starter: 'If I restarted today, I’d delete these three tasks first.',
    why_its_working: 'Specific regrets beat vague inspiration for saves and shares.',
  },
];

function padTrendingListToCount(items, count, platformLabels) {
  const base = Array.isArray(items) ? [...items] : [];
  if (base.length >= count) return base.slice(0, count);
  const labels = platformLabels?.length ? platformLabels : ['Instagram'];
  for (let i = base.length; i < count; i += 1) {
    const seed = FALLBACK_TREND_SEEDS[(i - base.length) % FALLBACK_TREND_SEEDS.length];
    const platform = labels[i % labels.length];
    base.push({
      ...seed,
      relevant_platform: platform,
      platform: platform.toLowerCase().replace(/\s+/g, ''),
      confidence: 'medium',
      _isSampleTrend: true,
    });
  }
  return base;
}

function interleaveTrendsByPlatform(topics, cap, preferredPlatformLabels) {
  if (!Array.isArray(topics) || topics.length === 0) return [];

  const buckets = new Map();
  const firstSeenOrder = [];
  for (const t of topics) {
    const id = platformIdFromTrend(t);
    if (!buckets.has(id)) {
      buckets.set(id, []);
      firstSeenOrder.push(id);
    }
    buckets.get(id).push(t);
  }

  const preferredIds = (preferredPlatformLabels || []).map((lbl) => platformIdFromTrend({ relevant_platform: lbl }));
  const keys = [...buckets.keys()];
  keys.sort((a, b) => {
    const ia = preferredIds.indexOf(a);
    const ib = preferredIds.indexOf(b);
    if (ia === -1 && ib === -1) return firstSeenOrder.indexOf(a) - firstSeenOrder.indexOf(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const result = [];
  let round = 0;
  while (result.length < cap) {
    let added = false;
    for (const key of keys) {
      const arr = buckets.get(key);
      if (round < arr.length) {
        result.push(arr[round]);
        added = true;
        if (result.length >= cap) break;
      }
    }
    if (!added) break;
    round += 1;
  }
  return result;
}

function mergeFetchedHashtagsByPlatformRoundRobin(platformLabels, itemsPerPlatform) {
  const hashtagMap = new Map();
  const deduplicatedHashtags = [];
  if (!platformLabels.length) return deduplicatedHashtags;

  const hashtagsByPlatform = platformLabels.map((platform, index) => ({
    platform,
    hashtags: itemsPerPlatform[index] || [],
    index: 0,
  }));

  const perPlatformLimit = Math.floor(TOTAL_HASHTAG_CAP / platformLabels.length);
  const remainder = TOTAL_HASHTAG_CAP % platformLabels.length;
  const initialPlatformLimits = new Map(
    platformLabels.map((platform, index) => [
      platform,
      perPlatformLimit + (index < remainder ? 1 : 0),
    ])
  );

  for (const platformData of hashtagsByPlatform) {
    const initialLimit = initialPlatformLimits.get(platformData.platform) ?? 0;
    while (platformData.index < platformData.hashtags.length && platformData.index < initialLimit) {
      mergeHashtagIntoMap(hashtagMap, deduplicatedHashtags, platformData.hashtags[platformData.index]);
      platformData.index += 1;
    }
  }

  while (deduplicatedHashtags.length < TOTAL_HASHTAG_CAP) {
    let addedOrMerged = false;
    for (const platformData of hashtagsByPlatform) {
      if (platformData.index >= platformData.hashtags.length) continue;
      mergeHashtagIntoMap(hashtagMap, deduplicatedHashtags, platformData.hashtags[platformData.index]);
      platformData.index += 1;
      addedOrMerged = true;
      if (deduplicatedHashtags.length >= TOTAL_HASHTAG_CAP) break;
    }
    if (!addedOrMerged) break;
  }

  return deduplicatedHashtags;
}

function readStoredHashtagMode() {
  try {
    const v = localStorage.getItem(HASHTAG_MODE_STORAGE_KEY);
    if (v === 'for_you' || v === 'trending') return v;
  } catch {
    /* ignore */
  }
  return 'trending';
}
const HASHTAG_REACH_RANK = { high: 3, medium: 2, niche: 1 };

function mergeHashtagIntoMap(hashtagMap, deduplicatedHashtags, hashtag) {
  const normalizedHashtag = hashtag.hashtag?.toLowerCase().trim();
  if (!normalizedHashtag) return false;

  if (hashtagMap.has(normalizedHashtag)) {
    const existingHashtag = hashtagMap.get(normalizedHashtag);
    const mergedPlatforms = [
      ...existingHashtag.relevant_platforms,
      ...((Array.isArray(hashtag.relevant_platforms) ? hashtag.relevant_platforms : [hashtag.platform]).filter(Boolean)),
    ];
    existingHashtag.relevant_platforms = [...new Set(mergedPlatforms)];

    if ((HASHTAG_REACH_RANK[hashtag.estimated_reach] ?? 0) > (HASHTAG_REACH_RANK[existingHashtag.estimated_reach] ?? 0)) {
      existingHashtag.estimated_reach = hashtag.estimated_reach;
      existingHashtag.display_type_label = hashtag.display_type_label;
      existingHashtag.status = hashtag.status;
      existingHashtag.type = hashtag.type;
    }

    return false;
  }

  const hashtagEntry = {
    ...hashtag,
    relevant_platforms: [...new Set((Array.isArray(hashtag.relevant_platforms) ? hashtag.relevant_platforms : [hashtag.platform]).filter(Boolean))],
  };

  hashtagMap.set(normalizedHashtag, hashtagEntry);
  deduplicatedHashtags.push(hashtagEntry);
  return true;
}

/** Brand Voice tab: ensure # prefix and collapse #foo vs foo duplicates before render/copy. */
function normalizeBrandVoiceHashtagList(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  return tags
    .map((tag) => {
      const raw = tag?.hashtag ?? tag?.name ?? '';
      const str = String(raw || '').trim();
      const withHash = str.startsWith('#') ? str : `#${str.replace(/^#+/, '')}`;
      return { ...tag, hashtag: withHash };
    })
    .filter((tag) => {
      if (!tag.hashtag || tag.hashtag === '#') return false;
      const key = tag.hashtag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** General Trending tab only: enforce # prefix (incl. YouTube) and de-dupe by tag text before render. */
function normalizeGeneralTrendingHashtagList(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  return tags
    .map((tag) => {
      const raw = tag?.hashtag ?? tag?.name ?? '';
      const str = String(raw || '').trim();
      const withHash = str.startsWith('#') ? str : `#${str.replace(/^#+/, '')}`;
      return { ...tag, hashtag: withHash };
    })
    .filter((tag) => {
      if (!tag.hashtag || tag.hashtag === '#') return false;
      const key = tag.hashtag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const QUICK_CREATE_TOOLS = [
  { id: 'caption', name: 'Caption Generator', icon: MessageSquare, description: 'Create engaging social captions', color: 'from-blue-500 to-cyan-500' },
  { id: 'hashtags', name: 'Hashtag Generator', icon: Hash, description: 'Find trending hashtags', color: 'from-emerald-500 to-teal-500' },
  { id: 'hooks', name: 'Hook Builder', icon: Type, description: 'Craft attention-grabbing openers', color: 'from-violet-500 to-purple-500' },
  { id: 'cta', name: 'CTA Suggester', icon: Target, description: 'Powerful call-to-action phrases', color: 'from-orange-500 to-pink-500' },
  { id: 'scorer', name: 'Quality Scorer', icon: BarChart3, description: 'Score and improve your content', color: 'from-amber-500 to-orange-500' },
  { id: 'visual-brainstorm', name: 'Visual Brainstormer', icon: ImageIcon, description: 'AI image prompts & shoot guides', color: 'from-pink-500 to-rose-500' },
];

export default function Dashboard() {
  const { user, userProfile, loading: authLoading } = useContext(AuthContext);
  const { getDashboardSnapshot, loadSessionDashboardSnapshot, setDashboardSnapshot, clearDashboardSnapshot } = useDashboardCache(); // HUTTLE AI: cache fix
  const navigate = useNavigate();
  const { brandProfile, brandFetchComplete } = useBrand();
  const { showToast } = useToast();
  const { addNotification, addSocialUpdate } = useNotifications();
  const {
    userTier,
    getTierDisplayName,
    subscriptionStatus,
    isTrialing,
    trialDaysRemaining,
    trialEndsAt,
    refreshSubscription,
  } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const [copiedHashtag, setCopiedHashtag] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState('');
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [dashboardDayKey, setDashboardDayKey] = useState(() => getDashboardGeneratedDate());
  const dashboardDayKeyRef = useRef(dashboardDayKey);
  const dailyRefreshTimerRef = useRef(null);
  const [dashboardAlerts, setDashboardAlerts] = useState([]);
  const [isAlertsLoading, setIsAlertsLoading] = useState(false);
  const [recentVaultItems, setRecentVaultItems] = useState([]);
  const [copiedVaultItem, setCopiedVaultItem] = useState(null);
  const [hashtagMode, setHashtagMode] = useState(readStoredHashtagMode);
  const [forYouHashtags, setForYouHashtags] = useState(null);
  const [forYouLoading, setForYouLoading] = useState(false);
  const [forYouRetryCount, setForYouRetryCount] = useState(0);
  const forYouRequestKeyRef = useRef('');
  /** General Trending tab only — never fall back to dashboard `hashtags_of_day` (niche/slug mix). */
  const [generalTrendingHashtags, setGeneralTrendingHashtags] = useState([]);
  const [generalTrendingLoading, setGeneralTrendingLoading] = useState(false);
  const [generalTrendingReady, setGeneralTrendingReady] = useState(false);
  const [trendingStatus, setTrendingStatus] = useState('loading');
  const trendingRequestKeyRef = useRef('');
  const [showTrialWelcomeModal, setShowTrialWelcomeModal] = useState(false);
  const [trialWelcomeDate, setTrialWelcomeDate] = useState(null);
  const hasFetchedTodayRef = useRef(false); // HUTTLE AI: cache fix
  const activeDashboardRequestRef = useRef(0); // HUTTLE AI: cache fix
  const brandProfileRef = useRef(brandProfile); // HUTTLE AI: cache fix
  const lastPersonalizationKeyRef = useRef(null);
  dashboardDayKeyRef.current = dashboardDayKey;

  const copyHashtag = async (hashtag) => {
    try {
      await navigator.clipboard.writeText(hashtag);
      setCopiedHashtag(hashtag);
      showToast('Hashtag copied to clipboard!', 'success');
      setTimeout(() => setCopiedHashtag(null), 2000);
    } catch (err) {
      console.error('Failed to copy hashtag:', err);
      showToast('Failed to copy hashtag', 'error');
    }
  };

  const copyVaultItem = async (content, id) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedVaultItem(id);
      showToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopiedVaultItem(null), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const copyTrendHook = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTrendHookKey(key);
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setCopiedTrendHookKey(null), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const applyDashboardPayload = useCallback((nextDashboardData, generatedDate) => { // HUTTLE AI: cache fix
    if (!user?.id || !nextDashboardData) return; // HUTTLE AI: cache fix
    setDashboardData(nextDashboardData); // HUTTLE AI: cache fix
    setDashboardAlerts(Array.isArray(nextDashboardData.daily_alerts) ? nextDashboardData.daily_alerts : []); // HUTTLE AI: cache fix
    setDashboardError(''); // HUTTLE AI: cache fix
    setTrendingStatus(computeTrendingStatusFromData(nextDashboardData));
    setDashboardSnapshot(user.id, {
      generatedDate,
      data: nextDashboardData,
      personalizationKey: getBrandPersonalizationKey(brandProfileRef.current),
    }); // HUTTLE AI: cache fix
    if (Array.isArray(nextDashboardData.trending_topics)) {
      setCachedTrends(nextDashboardData.trending_topics);
    }
  }, [setDashboardSnapshot, user?.id]); // HUTTLE AI: cache fix

  const loadDashboardData = useCallback(async ({ forceRefresh = false } = {}) => { // HUTTLE AI: cache fix
    if (!user?.id) return { success: false }; // HUTTLE AI: cache fix

    const generatedDate = getDashboardGeneratedDate(); // HUTTLE AI: cache fix
    const requestId = activeDashboardRequestRef.current + 1; // HUTTLE AI: cache fix
    activeDashboardRequestRef.current = requestId; // HUTTLE AI: cache fix

    if (forceRefresh) { // HUTTLE AI: cache fix
      setTrendingStatus('retrying');
      clearDashboardSnapshot(user.id); // HUTTLE AI: cache fix
      const deleteResult = await deleteDashboardCache(user.id); // HUTTLE AI: cache fix
      if (!deleteResult.success) { // HUTTLE AI: cache fix
        console.error('[Dashboard] Daily dashboard cache delete failed before refresh:', deleteResult.errorMessage);
        setTrendingStatus('fallback');
        setIsDashboardLoading(false);
        setIsAlertsLoading(false);
        return { success: false, errorType: deleteResult.errorType, errorMessage: deleteResult.errorMessage };
      } // HUTTLE AI: cache fix
    } else { // HUTTLE AI: cache fix
      const perspKey = getBrandPersonalizationKey(brandProfileRef.current);
      const snapshotMatchesBrand = (snap) => snap?.personalizationKey === perspKey;

      const memorySnapshot = getDashboardSnapshot(user.id, generatedDate); // HUTTLE AI: cache fix
      if (
        memorySnapshot?.data
        && snapshotMatchesBrand(memorySnapshot)
        && hasPersistableTrendingTopics(memorySnapshot.data.trending_topics)
      ) { // HUTTLE AI: cache fix
        applyDashboardPayload(memorySnapshot.data, generatedDate); // HUTTLE AI: cache fix
        hasFetchedTodayRef.current = true; // HUTTLE AI: cache fix
        setIsDashboardLoading(false); // HUTTLE AI: cache fix
        setIsAlertsLoading(false); // HUTTLE AI: cache fix
        return { success: true, cacheHit: true, data: memorySnapshot.data }; // HUTTLE AI: cache fix
      } // HUTTLE AI: cache fix

      const sessionSnapshot = loadSessionDashboardSnapshot(user.id, generatedDate); // HUTTLE AI: cache fix
      if (
        sessionSnapshot?.data
        && snapshotMatchesBrand(sessionSnapshot)
        && hasPersistableTrendingTopics(sessionSnapshot.data.trending_topics)
      ) { // HUTTLE AI: cache fix
        applyDashboardPayload(sessionSnapshot.data, generatedDate); // HUTTLE AI: cache fix
        hasFetchedTodayRef.current = true; // HUTTLE AI: cache fix
        setIsDashboardLoading(false); // HUTTLE AI: cache fix
        setIsAlertsLoading(false); // HUTTLE AI: cache fix
        return { success: true, cacheHit: true, data: sessionSnapshot.data }; // HUTTLE AI: cache fix
      } // HUTTLE AI: cache fix

      const cachedResult = await getDashboardCache(user.id, brandProfileRef.current, { generatedDate }); // HUTTLE AI: cache fix
      if (activeDashboardRequestRef.current !== requestId) return { success: false, cancelled: true }; // HUTTLE AI: cache fix
      if (cachedResult.success && cachedResult.cacheHit && cachedResult.data) { // HUTTLE AI: cache fix
        applyDashboardPayload(cachedResult.data, cachedResult.generatedDate || generatedDate); // HUTTLE AI: cache fix
        hasFetchedTodayRef.current = true; // HUTTLE AI: cache fix
        setIsDashboardLoading(false); // HUTTLE AI: cache fix
        setIsAlertsLoading(false); // HUTTLE AI: cache fix
        return cachedResult; // HUTTLE AI: cache fix
      } // HUTTLE AI: cache fix

      if (!cachedResult.success && cachedResult.errorType === 'auth_error') { // HUTTLE AI: cache fix
        setDashboardError('Unable to load your daily briefing right now. Please try again.'); // HUTTLE AI: cache fix
        setTrendingStatus('fallback');
        return cachedResult; // HUTTLE AI: cache fix
      } // HUTTLE AI: cache fix
    } // HUTTLE AI: cache fix

    setDashboardError(''); // HUTTLE AI: cache fix
    setIsDashboardLoading(true); // HUTTLE AI: cache fix
    setIsAlertsLoading(true); // HUTTLE AI: cache fix
    if (!forceRefresh) {
      setTrendingStatus('loading');
    }

    try { // HUTTLE AI: cache fix
      const result = await generateDashboardData(user.id, brandProfileRef.current, { forceRefresh, generatedDate, skipCacheLookup: true }); // HUTTLE AI: cache fix
      if (activeDashboardRequestRef.current !== requestId) return { success: false, cancelled: true }; // HUTTLE AI: cache fix
      if (result.success && result.data) { // HUTTLE AI: cache fix
        applyDashboardPayload(result.data, result.generatedDate || generatedDate); // HUTTLE AI: cache fix
        hasFetchedTodayRef.current = true; // HUTTLE AI: cache fix
        if (result.shouldTrackUsage) { // HUTTLE AI: cache fix
          await trackDashboardGenerationUsage(user.id, 'dashboard_daily_generation'); // HUTTLE AI: cache fix
        } // HUTTLE AI: cache fix
        return result; // HUTTLE AI: cache fix
      } // HUTTLE AI: cache fix

      setDashboardError('Unable to load your daily briefing right now. Please try again.'); // HUTTLE AI: cache fix
      setTrendingStatus('fallback');
      return result; // HUTTLE AI: cache fix
    } catch (error) { // HUTTLE AI: cache fix
      console.error('[Dashboard] Failed to load daily dashboard:', error); // HUTTLE AI: cache fix
      setDashboardError('Unable to load your daily briefing right now. Please try again.'); // HUTTLE AI: cache fix
      setTrendingStatus('fallback');
      return { success: false, error }; // HUTTLE AI: cache fix
    } finally { // HUTTLE AI: cache fix
      if (activeDashboardRequestRef.current === requestId) { // HUTTLE AI: cache fix
        setIsDashboardLoading(false); // HUTTLE AI: cache fix
        setIsAlertsLoading(false); // HUTTLE AI: cache fix
      } // HUTTLE AI: cache fix
    } // HUTTLE AI: cache fix
  }, [applyDashboardPayload, clearDashboardSnapshot, getDashboardSnapshot, loadSessionDashboardSnapshot, user?.id]); // HUTTLE AI: cache fix

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const trialStarted = searchParams.get('trial');
    const nextParams = new URLSearchParams(searchParams);
    let shouldReplaceParams = false;

    if (success === 'true') {
      showToast(`Welcome to ${getTierDisplayName(userTier)}! Your upgrade is now active.`, 'success');
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#01bad2', '#2B8FC7', '#00ACC1', '#4DD0E1', '#ffffff'], disableForReducedMotion: true });
      }
      nextParams.delete('success');
      shouldReplaceParams = true;
    }
    if (canceled === 'true') {
      showToast('Checkout canceled. No changes were made to your subscription.', 'info');
      nextParams.delete('canceled');
      shouldReplaceParams = true;
    }

    if (trialStarted === 'started') {
      refreshSubscription();
      setTrialWelcomeDate(trialEndsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      setShowTrialWelcomeModal(true);
      nextParams.delete('trial');
      shouldReplaceParams = true;
    }

    if (shouldReplaceParams) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, showToast, userTier, getTierDisplayName, refreshSubscription, trialEndsAt]);

  useEffect(() => {
    if (!user?.id) return;

    const snapshotKey = `subscription-status-snapshot:${user.id}`;
    const previousSnapshot = JSON.parse(localStorage.getItem(snapshotKey) || '{}');
    const currentSnapshot = {
      status: subscriptionStatus || 'inactive',
      updatedAt: Date.now(),
    };

    if (previousSnapshot.status === 'trialing' && (subscriptionStatus === 'canceled' || subscriptionStatus === 'inactive')) {
      showToast('Your subscription access has ended. Choose a plan to get back to creating content.', 'info', 6000);
    }

    localStorage.setItem(snapshotKey, JSON.stringify(currentSnapshot));
  }, [subscriptionStatus, showToast, user?.id]);

  const brandPersonalizationKey = useMemo(
    () => getBrandPersonalizationKey(brandProfile),
    [brandProfile]
  );

  const isCreator = isCreatorProfile(brandProfile);
  const greetingFirstName = userProfile?.first_name?.trim() || '';
  const greetingHeadline = greetingFirstName ? `Hey ${greetingFirstName}! 👋` : 'Hey there! 👋';
  const greetingSubtitle = 'Ready to create something amazing today?';

  const getPrimaryContextValue = (value) => {
    if (Array.isArray(value)) return value.find(Boolean)?.toString().trim() || '';
    if (typeof value !== 'string') return '';
    return value.split(',').map((part) => part.trim()).find(Boolean) || '';
  };

  const normalizedNiche = getPrimaryContextValue(brandProfile?.niche);
  const normalizedIndustry = getPrimaryContextValue(brandProfile?.industry);
  const hasProfilePersonalization = hasProfileContext(brandProfile);

  const dashboardTrendingTopics = useMemo(
    () => (Array.isArray(dashboardData?.trending_topics) ? dashboardData.trending_topics : []),
    [dashboardData]
  );
  const dashboardInsights = useMemo(() => {
    const arr = Array.isArray(dashboardData?.ai_insights) ? dashboardData.ai_insights : [];
    if (arr.length > 0) return arr;
    return dashboardData?.ai_insight ? [dashboardData.ai_insight] : [];
  }, [dashboardData]);

  const trendWidgetTimestamp = useMemo(() => {
    if (trendingStatus !== 'live' && trendingStatus !== 'stale') return '';
    const ts = dashboardData?.created_at;
    if (!ts) return '';
    if (trendingStatus === 'stale') {
      const diffSec = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
      const hours = Math.floor(diffSec / 3600);
      if (hours < 1) return `Last updated ${formatRelativeTime(ts)}`;
      return hours === 1 ? 'Last updated 1 hour ago' : `Last updated ${hours} hours ago`;
    }
    return `Updated ${formatRelativeTime(ts)}`;
  }, [dashboardData?.created_at, trendingStatus]);

  const trendingBannerText = useMemo(() => {
    if (trendingStatus === 'fallback') {
      return 'Live trend data is temporarily unavailable. Showing sample content ideas while we retry.';
    }
    if (trendingStatus === 'loading' || trendingStatus === 'retrying') {
      return 'Trends are refreshing — check back in a few minutes.';
    }
    return '';
  }, [trendingStatus]);
  const hasNicheConfigured = Boolean(normalizedNiche || normalizedIndustry);
  const hashtagPersonalization = useMemo(
    () => getHashtagPersonalizationContext(brandProfile),
    [brandProfile]
  );

  const forYouPersonalizationExtended = useMemo(() => {
    if (!hashtagPersonalization) return null;
    return {
      ...hashtagPersonalization,
      subNiche: getPrimaryContextValue(brandProfile?.subNiche),
      city: brandProfile?.city?.trim() || null,
      industry: getPrimaryContextValue(brandProfile?.industry),
      creatorType: brandProfile?.creatorType || null,
      profileType: brandProfile?.profileType || null,
    };
  }, [hashtagPersonalization, brandProfile]);

  useEffect(() => {
    if (!hashtagPersonalization && hashtagMode === 'for_you') {
      setHashtagMode('trending');
      try {
        localStorage.setItem(HASHTAG_MODE_STORAGE_KEY, 'trending');
      } catch {
        /* ignore */
      }
    }
  }, [hashtagPersonalization, hashtagMode]);

  useEffect(() => {
    forYouRequestKeyRef.current = '';
    setForYouHashtags(null);
    trendingRequestKeyRef.current = '';
    setGeneralTrendingHashtags([]);
    setGeneralTrendingReady(false);
  }, [user?.id]);

  const tourSteps = [
    { title: 'Welcome to Huttle AI!', content: 'Let\'s take a quick tour to help you get the most out of your experience. We\'ll walk you through the key features.', icon: Sparkles },
    { title: 'Brand Profile', content: 'Under Account → Brand Profile in the sidebar, add your niche, audience, and platforms once. That powers personalization across the app.', icon: Target },
    { title: 'AI Power Tools', content: 'Generate captions, hashtags, hooks, and more with our AI Power Tools. Each generation uses your brand voice for consistent, on-brand content.', icon: Zap },
    { title: 'Trend Lab', content: 'Discover trending topics in your niche with Quick Scan, or do a Deep Dive into specific trends for actionable content ideas.', icon: TrendingUp },
    { title: 'You\'re All Set!', content: 'Explore your dashboard to discover AI insights and trending topics. Save everything to your Content Vault. Track your AI generation usage in the sidebar. Happy creating!', icon: Sparkles },
  ];

  const loadRecentVaultItems = useCallback(async () => {
    if (!user?.id) {
      setRecentVaultItems([]);
      return;
    }
    try {
      const result = await getContentLibraryItems(user.id);
      if (result.success && Array.isArray(result.data)) {
        const sorted = [...result.data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setRecentVaultItems(sorted.slice(0, 4).map((item) => ({
          id: item.id,
          name: item.name,
          content: item.content,
          type: item.type,
          date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          description: item.description,
        })));
      }
    } catch (err) {
      console.error('[Dashboard] Failed to load vault items:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadRecentVaultItems();
  }, [loadRecentVaultItems]);

  useEffect(() => {
    const onVaultUpdated = (event) => {
      if (user?.id && event?.detail?.userId === user.id) {
        void loadRecentVaultItems();
      }
    };
    window.addEventListener(CONTENT_VAULT_UPDATED_EVENT, onVaultUpdated);
    return () => window.removeEventListener(CONTENT_VAULT_UPDATED_EVENT, onVaultUpdated);
  }, [user?.id, loadRecentVaultItems]);

  useEffect(() => {
    hasFetchedTodayRef.current = false; // HUTTLE AI: cache fix
    activeDashboardRequestRef.current += 1; // HUTTLE AI: cache fix
    setDashboardData(null); // HUTTLE AI: cache fix
    setDashboardAlerts([]); // HUTTLE AI: cache fix
    setDashboardError(''); // HUTTLE AI: cache fix
    setIsDashboardLoading(false); // HUTTLE AI: cache fix
    setIsAlertsLoading(false); // HUTTLE AI: cache fix
    setTrendingStatus('loading');
    setDashboardDayKey(getDashboardGeneratedDate());
    lastPersonalizationKeyRef.current = null;
  }, [user?.id]); // HUTTLE AI: cache fix

  useEffect(() => {
    brandProfileRef.current = brandProfile; // HUTTLE AI: cache fix
  }, [brandProfile]); // HUTTLE AI: cache fix

  useEffect(() => {
    if (!user?.id || !brandFetchComplete) return;
    const key = brandPersonalizationKey;
    const prev = lastPersonalizationKeyRef.current;
    if (prev === key) return;

    const needsRefresh = prev !== null || hasFetchedTodayRef.current;
    lastPersonalizationKeyRef.current = key;
    if (!needsRefresh) return;

    clearDashboardSnapshot(user.id);
    hasFetchedTodayRef.current = false;
    forYouRequestKeyRef.current = '';
    trendingRequestKeyRef.current = '';
    setForYouHashtags(null);
    setGeneralTrendingHashtags([]);
    setGeneralTrendingReady(false);
    void loadDashboardData({ forceRefresh: true });
  }, [
    user?.id,
    brandFetchComplete,
    brandPersonalizationKey,
    clearDashboardSnapshot,
    loadDashboardData,
  ]);

  useEffect(() => {
    if (authLoading || !user?.id || hasFetchedTodayRef.current) return; // HUTTLE AI: cache fix
    loadDashboardData(); // HUTTLE AI: cache fix
    return () => { // HUTTLE AI: cache fix
      activeDashboardRequestRef.current += 1; // HUTTLE AI: cache fix
    }; // HUTTLE AI: cache fix
  }, [authLoading, loadDashboardData, user?.id]); // HUTTLE AI: cache fix

  useEffect(() => {
    if (!user?.id || authLoading) return undefined;

    const runDailyRefresh = () => {
      setDashboardDayKey(getDashboardGeneratedDate());
      hasFetchedTodayRef.current = false;
      forYouRequestKeyRef.current = '';
      trendingRequestKeyRef.current = '';
      loadDashboardData({ forceRefresh: true });
    };

    const scheduleNext = () => {
      if (dailyRefreshTimerRef.current !== null) {
        window.clearTimeout(dailyRefreshTimerRef.current);
        dailyRefreshTimerRef.current = null;
      }
      const now = Date.now();
      const at = getNextLocalDashboardRefreshAt(new Date(now));
      const ms = Math.max(0, at.getTime() - now);
      dailyRefreshTimerRef.current = window.setTimeout(() => {
        dailyRefreshTimerRef.current = null;
        runDailyRefresh();
        scheduleNext();
      }, ms);
    };

    scheduleNext();

    const onResume = () => {
      if (document.visibilityState !== 'visible') return;
      const current = getDashboardGeneratedDate();
      if (current !== dashboardDayKeyRef.current) {
        runDailyRefresh();
        scheduleNext();
      }
    };

    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);

    return () => {
      if (dailyRefreshTimerRef.current !== null) {
        window.clearTimeout(dailyRefreshTimerRef.current);
        dailyRefreshTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
    };
  }, [user?.id, authLoading, loadDashboardData]);

  // Social update notifications
  useEffect(() => {
    if (!dashboardAlerts.length) return;
    const lastCheck = localStorage.getItem('lastSocialUpdateCheck');
    const now = Date.now();
    const checkInterval = 14 * 24 * 60 * 60 * 1000;
    if (!lastCheck || (now - parseInt(lastCheck, 10)) > checkInterval) {
      const mostRecent = dashboardAlerts[0];
      if (mostRecent) {
        const lastNotified = localStorage.getItem('lastNotifiedSocialUpdate');
        const mostRecentId = String(mostRecent.id || '');
        if (lastNotified !== mostRecentId) {
          addSocialUpdate(mostRecent.platform || 'Platform', mostRecent.update_title || 'New social platform update', mostRecent.impact_level || 'medium');
          localStorage.setItem('lastNotifiedSocialUpdate', mostRecentId);
        }
      }
      localStorage.setItem('lastSocialUpdateCheck', now.toString());
    }
  }, [addSocialUpdate, dashboardAlerts]);

  const getMomentumStyles = (momentum) => {
    const value = (momentum || '').toLowerCase();
    if (value === 'rising') return { indicator: '↑', textClass: 'text-emerald-600', bgClass: 'bg-emerald-50', label: 'Rising' };
    if (value === 'peaking') return { indicator: '⚡', textClass: 'text-violet-600', bgClass: 'bg-violet-50', label: 'Peaking' };
    if (value === 'steady') return { indicator: '→', textClass: 'text-slate-600', bgClass: 'bg-slate-50', label: 'Steady' };
    if (value === 'declining') return { indicator: '↓', textClass: 'text-red-600', bgClass: 'bg-red-50', label: 'Declining' };
    return { indicator: '•', textClass: 'text-amber-600', bgClass: 'bg-amber-50', label: 'Trending' };
  };

  const normalizePlatformIdForBuilder = (trend) => platformIdFromTrend(trend);

  const [trendDetailsOpen, setTrendDetailsOpen] = useState({});
  const [copiedTrendHookKey, setCopiedTrendHookKey] = useState(null);

  const getInsightCategoryStyles = (category) => {
    const normalized = (category || '').toLowerCase();
    if (normalized === 'timing') return 'bg-amber-100 text-amber-700';
    if (normalized === 'audience') return 'bg-blue-100 text-blue-700';
    if (normalized === 'platform') return 'bg-purple-100 text-purple-700';
    if (normalized === 'content type') return 'bg-emerald-100 text-emerald-700';
    return 'bg-huttle-100 text-huttle-primary-dark';
  };

  // Welcome notification — once per account: DB atomic claim (survives cleared storage / fast navigation)
  useEffect(() => {
    if (!user?.id || authLoading || !brandFetchComplete) return;
    if (userProfile?.has_completed_onboarding === false) return;
    if (brandProfile.hasSeenWelcomeNotification !== false) return;

    const dismissStorageKey = `huttleDismissed:${user.id}`;
    const dismissKey = `welcome_${user.id}`;
    try {
      const dismissed = new Set(JSON.parse(localStorage.getItem(dismissStorageKey) || '[]'));
      if (dismissed.has(dismissKey)) return;
    } catch {
      /* ignore */
    }

    let cancelled = false;
    let showTimer = null;

    (async () => {
      const { data, error } = await supabase
        .from('user_profile')
        .update({
          has_seen_welcome_notification: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('has_seen_welcome_notification', false)
        .select('user_id');

      if (cancelled || error || !data?.length) {
        if (error) console.error('[Dashboard] Welcome notification claim failed:', error);
        return;
      }

      showTimer = window.setTimeout(() => {
        if (cancelled) return;
        addNotification({
          type: 'info',
          title: 'Welcome to Huttle AI!',
          message: 'Your AI-powered content creation assistant is ready. Generate your first piece of content to get started!',
          dismissKey,
          actionUrl: '/dashboard/ai-tools',
          actionLabel: 'Start Creating',
          persistent: false,
        });
      }, 2000);
    })();

    return () => {
      cancelled = true;
      if (showTimer !== null) window.clearTimeout(showTimer);
    };
  }, [
    addNotification,
    authLoading,
    brandFetchComplete,
    brandProfile.hasSeenWelcomeNotification,
    user?.id,
    userProfile?.has_completed_onboarding,
  ]);

  const getToolBadge = (name) => {
    if (!name) return 'Content';
    const lower = name.toLowerCase();
    if (lower.includes('caption')) return 'Caption';
    if (lower.includes('hashtag')) return 'Hashtags';
    if (lower.includes('hook')) return 'Hook';
    if (lower.includes('cta')) return 'CTA';
    if (lower.includes('visual')) return 'Visual';
    if (lower.includes('blueprint')) return 'Ignite Engine';
    if (lower.includes('remix')) return 'Remix';
    return 'Content';
  };

  const dashboardHashtags = useMemo(
    () => (Array.isArray(dashboardData?.hashtags_of_day) ? dashboardData.hashtags_of_day : []),
    [dashboardData]
  );
  const dashboardHashtagPlatforms = useMemo(
    () => (Array.isArray(dashboardData?.selected_platforms) ? dashboardData.selected_platforms : []),
    [dashboardData?.selected_platforms]
  );

  /** Prefer live Brand Profile platforms when loaded; avoids stale `selected_platforms` from the daily snapshot. */
  const resolvedDashboardPlatformLabels = useMemo(() => {
    if (brandFetchComplete && Array.isArray(brandProfile?.platforms) && brandProfile.platforms.length > 0) {
      return [...new Set(brandProfile.platforms.map(toDashboardPlatformLabel))];
    }
    if (dashboardHashtagPlatforms.length > 0) return dashboardHashtagPlatforms;
    if (Array.isArray(brandProfile?.platforms) && brandProfile.platforms.length > 0) {
      return [...new Set(brandProfile.platforms.map(toDashboardPlatformLabel))];
    }
    return ['Instagram'];
  }, [brandFetchComplete, brandProfile?.platforms, dashboardHashtagPlatforms]);

  const displayedDashboardTrendingTopics = useMemo(
    () => padTrendingListToCount(
      interleaveTrendsByPlatform(dashboardTrendingTopics, TRENDING_NOW_CARD_CAP, resolvedDashboardPlatformLabels),
      TRENDING_NOW_CARD_CAP,
      resolvedDashboardPlatformLabels,
    ),
    [dashboardTrendingTopics, resolvedDashboardPlatformLabels]
  );

  const displayedDashboardHashtags = useMemo(() => {
    const deduplicatedHashtags = [];
    const hashtagMap = new Map();
    const platformLabels = resolvedDashboardPlatformLabels;

    if (platformLabels.length === 0) {
      for (const hashtag of dashboardHashtags) {
        mergeHashtagIntoMap(hashtagMap, deduplicatedHashtags, hashtag);
        if (deduplicatedHashtags.length >= TOTAL_HASHTAG_CAP) break;
      }

      return deduplicatedHashtags;
    }

    const hashtagsByPlatform = platformLabels.map((platform) => ({
      platform,
      hashtags: dashboardHashtags.filter((tag) => tag.platform === platform),
      index: 0,
    }));

    const perPlatformLimit = Math.floor(TOTAL_HASHTAG_CAP / platformLabels.length);
    const remainder = TOTAL_HASHTAG_CAP % platformLabels.length;
    const initialPlatformLimits = new Map(
      platformLabels.map((platform, index) => [
        platform,
        perPlatformLimit + (index < remainder ? 1 : 0),
      ])
    );

    for (const platformData of hashtagsByPlatform) {
      const initialLimit = initialPlatformLimits.get(platformData.platform) ?? 0;

      while (platformData.index < platformData.hashtags.length && platformData.index < initialLimit) {
        mergeHashtagIntoMap(hashtagMap, deduplicatedHashtags, platformData.hashtags[platformData.index]);
        platformData.index += 1;
      }
    }

    while (deduplicatedHashtags.length < TOTAL_HASHTAG_CAP) {
      let addedOrMerged = false;

      for (const platformData of hashtagsByPlatform) {
        if (platformData.index >= platformData.hashtags.length) {
          continue;
        }

        mergeHashtagIntoMap(hashtagMap, deduplicatedHashtags, platformData.hashtags[platformData.index]);
        platformData.index += 1;
        addedOrMerged = true;

        if (deduplicatedHashtags.length >= TOTAL_HASHTAG_CAP) {
          break;
        }
      }

      if (!addedOrMerged) break;
    }

    return deduplicatedHashtags;
  }, [resolvedDashboardPlatformLabels, dashboardHashtags]);

  const retryForYouHashtags = useCallback(() => {
    forYouRequestKeyRef.current = '';
    setForYouHashtags(null);
    setForYouRetryCount((prev) => prev + 1);
  }, []);

  const retryTrending = async () => {
    if (isDashboardLoading) return;
    const result = await loadDashboardData({ forceRefresh: true });
    if (result?.success) {
      showToast('Dashboard refreshed!', 'success');
    } else if (!result?.cancelled) {
      showToast('Could not refresh your dashboard. Try again.', 'error');
    }
  };

  const useForYouHashtags = Boolean(hashtagPersonalization && hashtagMode === 'for_you');

  const widgetHashtagList = useMemo(() => {
    if (hashtagMode === 'trending') {
      if (!generalTrendingReady || generalTrendingLoading) return [];
      return normalizeGeneralTrendingHashtagList(generalTrendingHashtags);
    }
    if (useForYouHashtags) {
      if (forYouLoading && !forYouHashtags?.length) return [];
      return forYouHashtags?.length ? forYouHashtags : [];
    }
    return displayedDashboardHashtags;
  }, [
    hashtagMode,
    generalTrendingLoading,
    generalTrendingReady,
    generalTrendingHashtags,
    useForYouHashtags,
    forYouLoading,
    forYouHashtags,
    displayedDashboardHashtags,
  ]);

  const hashtagListForWidget = useMemo(() => {
    if (!useForYouHashtags || !widgetHashtagList?.length) return widgetHashtagList;
    return normalizeBrandVoiceHashtagList(widgetHashtagList);
  }, [useForYouHashtags, widgetHashtagList]);

  useEffect(() => {
    if (!user?.id || !hashtagPersonalization || hashtagMode !== 'for_you' || !forYouPersonalizationExtended) return;

    const generatedDate = getDashboardGeneratedDate();
    const platformKey = [...resolvedDashboardPlatformLabels].sort().join('|');
    const requestKey = `${user.id}_${generatedDate}_${forYouPersonalizationExtended.niche}_${platformKey}_foryou`;
    if (forYouRequestKeyRef.current === requestKey) return;

    let cancelled = false;
    (async () => {
      setForYouLoading(true);
      try {
        const results = await Promise.all(
          resolvedDashboardPlatformLabels.map((platformLabel) =>
            fetchDashboardForYouHashtags({
              personalization: forYouPersonalizationExtended,
              primaryPlatform: platformLabel,
              userId: user.id,
              generatedDate,
              forceRefresh: false,
            })
          )
        );
        if (cancelled) return;
        const itemsPerPlatform = results.map((r) => r.items || []);
        const merged = mergeFetchedHashtagsByPlatformRoundRobin(resolvedDashboardPlatformLabels, itemsPerPlatform);
        if (merged.length > 0) {
          forYouRequestKeyRef.current = requestKey;
          setForYouHashtags(merged);
        } else {
          setForYouHashtags(null);
        }
      } finally {
        if (!cancelled) setForYouLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, hashtagPersonalization, hashtagMode, resolvedDashboardPlatformLabels, forYouPersonalizationExtended, dashboardDayKey, forYouRetryCount]);

  useEffect(() => {
    if (!user?.id || hashtagMode !== 'trending') return;

    const generatedDate = getDashboardGeneratedDate();
    const platformKey = [...resolvedDashboardPlatformLabels].sort().join('|');
    const requestKey = `${user.id}_${generatedDate}_trending_${platformKey}`;
    if (trendingRequestKeyRef.current === requestKey) return;

    let cancelled = false;
    (async () => {
      setGeneralTrendingLoading(true);
      setGeneralTrendingReady(false);
      try {
        const results = await fetchDashboardTrendingHashtagsForPlatforms(
          resolvedDashboardPlatformLabels,
          {
            userId: user.id,
            generatedDate,
            forceRefresh: false,
          },
        );
        if (cancelled) return;
        const itemsPerPlatform = results.map((r) => r.items || []);
        const merged = mergeFetchedHashtagsByPlatformRoundRobin(resolvedDashboardPlatformLabels, itemsPerPlatform);
        trendingRequestKeyRef.current = requestKey;
        setGeneralTrendingHashtags(Array.isArray(merged) ? merged : []);
      } finally {
        if (!cancelled) {
          setGeneralTrendingLoading(false);
          setGeneralTrendingReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      setGeneralTrendingLoading(false);
    };
  }, [user?.id, hashtagMode, resolvedDashboardPlatformLabels, dashboardDayKey]);

  const dashboardTrendingMode = dashboardData?.trending_mode || 'niche_specific';
  const primaryPlatformLabel = dashboardData?.primary_platform_label
    || resolvedDashboardPlatformLabels[0]
    || 'Instagram';
  const showPlatformWideNicheNudge = Boolean(dashboardData?.show_platform_wide_niche_nudge);
  const trendingFallbackMessage = dashboardData?.trending_fallback_message || 'Trends are refreshing — check back in a few minutes.';
  const hashtagsFallbackMessage = dashboardData?.hashtags_fallback_message || 'Hashtags loading — check back shortly.';
  const hashtagsFromPreviousDay = Boolean(dashboardData?.hashtags_from_previous_day);
  const hashtagWidgetListLoading = isDashboardLoading
    || (useForYouHashtags && forYouLoading && !forYouHashtags?.length)
    || (hashtagMode === 'trending' && (!generalTrendingReady || generalTrendingLoading));

  const hashtagWidgetHasRows = hashtagListForWidget.length > 0;
  const showHashtagsPreviousDayBanner = hashtagsFromPreviousDay
    && !(useForYouHashtags && forYouHashtags?.length > 0);

  const persistHashtagMode = (mode) => {
    setHashtagMode(mode);
    try {
      localStorage.setItem(HASHTAG_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-transparent ml-0 md:ml-12 lg:ml-64 pt-14 lg:pt-14 px-4 sm:px-6 lg:px-8 pb-12">
      <GuidedTour steps={tourSteps} storageKey="dashboardTour" />

      {/* Welcome Header */}
      <MotionDiv className="relative mb-6 pt-2 sm:pt-3" initial="hidden" animate="visible" custom={0} variants={fadeUp}>
        <div>
          {isCreator ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-green-600">Active Now</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight" data-testid="dashboard-greeting">
                {greetingHeadline}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{greetingSubtitle}</p>
              {hasProfilePersonalization === false && (
                <p className="mt-2 text-xs text-gray-500">
                  Complete your Brand Profile (sidebar → Account) for a personalized feed — we’ll remind you in notifications until it’s done.
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight" data-testid="dashboard-greeting">
                {greetingHeadline}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{greetingSubtitle}</p>
              {hasProfilePersonalization === false && (
                <p className="mt-2 text-xs text-gray-500">
                  Complete your Brand Profile (sidebar → Account) for a personalized feed — we’ll remind you in notifications until it’s done.
                </p>
              )}
            </>
          )}
          {isTrialing && (
            <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
              trialDaysRemaining !== null && trialDaysRemaining <= 2
                ? 'bg-amber-100 text-amber-800'
                : 'bg-cyan-100 text-cyan-800'
            }`}>
              <span>
                {trialDaysRemaining === 0
                  ? "⚠️ Trial ends today - you'll be charged tonight"
                  : `🎯 Trial · ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left`}
              </span>
            </div>
          )}
        </div>
      </MotionDiv>

      <BrandVoiceUpdateBanner />

      {/* Hero Section - Trending Now (2/3) + Hashtags of the Day (1/3) */}
      <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Trending Now - Hero */}
        <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp} className="lg:col-span-2" data-testid="trending-widget">
          <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100/80 shadow-sm h-full">
            <div className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-huttle-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-900">Trending Now</h2>
                    <p className="text-xs text-gray-500">
                      {dashboardTrendingMode === 'platform_wide'
                        ? `What's trending on ${primaryPlatformLabel}`
                        : hasNicheConfigured
                          ? `Hot topics in ${normalizedNiche || normalizedIndustry}`
                          : 'General trends across platforms'}
                    </p>
                    {Boolean(trendingBannerText) && (
                      <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                        {trendingBannerText}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                      <span>{trendWidgetTimestamp}</span>
                      <span
                        className="inline-flex items-center"
                        title="Trends refresh daily on the schedule shown above."
                      >
                        <Info className="w-3.5 h-3.5 text-gray-400" aria-hidden />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                {isDashboardLoading && (
                  <>
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                      <div key={item} className="animate-pulse p-4 border border-gray-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                          <div className="flex-1">
                            <div className="h-4 w-2/3 bg-gray-200 rounded mb-1" />
                            <div className="h-3 w-1/3 bg-gray-100 rounded" />
                          </div>
                        </div>
                        <div className="h-3 w-full bg-gray-100 rounded mb-1.5" />
                        <div className="h-3 w-5/6 bg-gray-100 rounded mb-3" />
                        <div className="h-3 w-full bg-gray-50 rounded mb-1" />
                        <div className="flex gap-2 mt-3">
                          <div className="h-6 w-16 bg-gray-200 rounded-lg" />
                          <div className="h-6 w-20 bg-gray-100 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {!isDashboardLoading && dashboardError && (
                  <div className="col-span-full rounded-xl border border-red-100 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{dashboardError}</p>
                    <p className="text-xs text-red-500 mt-1">Reload the page to try again.</p>
                  </div>
                )}

                {!isDashboardLoading && !dashboardError && displayedDashboardTrendingTopics.map((trend, index) => {
                  const momentumStyles = getMomentumStyles(trend.momentum);
                  const cardKey = `trend-${index}`;
                  const sanitizedTrendTopic = sanitizeAIOutput(trend.topic) || 'Untitled trend';
                  const sanitizedTrendPlatform = sanitizeAIOutput(trend.relevant_platform) || 'Multi-platform';
                  const sanitizedTrendDescription = sanitizeAIOutput(trend.description || trend.context);
                  const formatBadge = sanitizeAIOutput(trend.format_type);
                  const nicheAngle = sanitizeAIOutput(trend.niche_angle);
                  const hookLine = sanitizeAIOutput(trend.hook_starter);
                  const whyLine = sanitizeAIOutput(trend.why_its_working);
                  const platformId = normalizePlatformIdForBuilder(trend);
                  const trendType = (trend.trend_type || 'global').toLowerCase();
                  const detailsOpen = Boolean(trendDetailsOpen[cardKey]);
                  const confidenceHigh = trend.confidence === 'high';
                  const hasExpandableDetails = Boolean(nicheAngle || hookLine || whyLine);

                  return (
                    <div
                      key={`${trend.topic}-${index}`}
                      data-testid="trend-card"
                      className="rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                              {getPlatformIcon(sanitizedTrendPlatform, 'w-4 h-4 text-gray-600')}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm leading-snug text-gray-900 hyphens-none text-pretty min-w-0">{sanitizedTrendTopic}</p>
                              {formatBadge && (
                                <span
                                  data-testid="trend-format-badge"
                                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"
                                >
                                  <Camera className="w-3 h-3" aria-hidden />
                                  {formatBadge}
                                </span>
                              )}
                              <span className="block text-[11px] text-gray-600 font-medium mt-0.5">{sanitizedTrendPlatform}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
                            {trend._isSampleTrend && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-100">
                                Sample
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${momentumStyles.bgClass} ${momentumStyles.textClass}`}>
                              <span>{momentumStyles.indicator}</span>
                              <span className="capitalize">{momentumStyles.label || trend.momentum}</span>
                            </span>
                          </div>
                        </div>

                        {sanitizedTrendDescription && (
                          <p
                            className={`text-xs text-gray-700 leading-relaxed mb-3 hyphens-none ${detailsOpen ? '' : 'line-clamp-3'}`}
                          >
                            {sanitizedTrendDescription}
                          </p>
                        )}

                        {hasExpandableDetails && (
                          <div className="mb-3">
                            <button
                              type="button"
                              onClick={() => setTrendDetailsOpen((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }))}
                              className="text-xs font-semibold text-huttle-primary inline-flex items-center gap-1"
                              aria-expanded={detailsOpen}
                            >
                              {detailsOpen ? 'Hide details' : 'See details'}
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} aria-hidden />
                            </button>
                          </div>
                        )}

                        {detailsOpen && nicheAngle && (
                          <div
                            data-testid="trend-niche-section"
                            className="mb-3 rounded-r-lg border-l-2 border-cyan-400 bg-cyan-50/80 pl-3 pr-2.5 py-2"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-900 mb-1">For your niche</p>
                            <p className="text-xs text-gray-800 leading-relaxed hyphens-none">{nicheAngle}</p>
                          </div>
                        )}

                        {detailsOpen && hookLine && (
                          <div className="mb-3 flex items-start gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Your hook</p>
                              <p data-testid="trend-hook-text" className="text-xs text-gray-900 leading-relaxed hyphens-none">
                                &quot;{hookLine}&quot;
                              </p>
                            </div>
                            <button
                              type="button"
                              data-testid="trend-hook-copy"
                              onClick={() => copyTrendHook(cardKey, hookLine)}
                              className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-600 hover:text-huttle-primary hover:bg-gray-50 transition-colors"
                            >
                              {copiedTrendHookKey === cardKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedTrendHookKey === cardKey ? <span className="text-[10px] font-semibold text-emerald-600">✓ Copied</span> : <span className="text-[10px] font-semibold">Copy</span>}
                            </button>
                          </div>
                        )}

                        {detailsOpen && whyLine && (
                          <p className="text-[11px] text-gray-500 mb-3 flex gap-1.5">
                            <span aria-hidden>⚡</span>
                            <span className="hyphens-none">{whyLine}</span>
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            data-testid="trend-create-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/dashboard/full-post-builder', {
                                state: {
                                  source: 'trending',
                                  topic: sanitizedTrendTopic,
                                  platform: platformId,
                                  format_type: trend.format_type || null,
                                  hook: hookLine || null,
                                  niche_angle: nicheAngle || null,
                                  description: sanitizedTrendDescription || null,
                                },
                              });
                            }}
                            className="inline-flex min-h-11 items-center gap-1 px-3 py-1.5 text-[11px] font-semibold bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors"
                          >
                            <Sparkles className="w-3 h-3" /> Create
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate('/dashboard/trend-lab', { state: { deepDiveTopic: sanitizedTrendTopic, autoRun: true } }); }}
                            className="inline-flex min-h-11 items-center gap-1 px-3 py-1.5 text-[11px] font-semibold border border-gray-200 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Beaker className="w-3 h-3" /> Deep Dive
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${confidenceHigh ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                            {confidenceHigh ? 'high' : 'medium'} confidence
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              trendType === 'niche'
                                ? 'bg-cyan-100 text-cyan-900'
                                : trendType === 'hybrid'
                                  ? 'bg-violet-100 text-violet-900'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {trendType}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!isDashboardLoading && !dashboardError && displayedDashboardTrendingTopics.length === 0 && (
                  <div className="col-span-full p-4 text-xs text-gray-500 rounded-xl border border-gray-100 bg-gray-50/60">
                    <p className="text-sm text-gray-700 mb-3">{trendingFallbackMessage}</p>
                    <button
                      onClick={retryTrending}
                      disabled={isDashboardLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-white transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {showPlatformWideNicheNudge && (
                <div className="text-xs text-gray-400 mt-3 text-center">
                  Showing platform-wide trends. Add your niche in Brand Profile (sidebar) for personalized trends.
                </div>
              )}

              <Link to="/dashboard/trend-lab" className="mt-4 w-full py-2.5 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm">
                <Beaker className="w-4 h-4" /> Explore Trend Lab
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Hashtags of the Day */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} data-testid="hashtag-widget">
          <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100/80 shadow-sm h-full">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-huttle-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900">Hashtags of the Day</h2>
                  <p className="text-xs text-gray-500">
                    {hashtagPersonalization
                      ? (hashtagMode === 'trending'
                        ? 'General trending hashtags for your selected platforms'
                        : 'Niche-specific tags aligned to your brand voice')
                      : 'General trending hashtags for your selected platforms'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {!hashtagPersonalization && (
                      <span className="text-amber-800/90">Add your niche in Brand Profile to unlock Brand voice. </span>
                    )}
                    Updates daily at 6:00 AM your time
                  </p>
                </div>
              </div>

              <div className="mb-4 inline-flex rounded-lg border border-gray-200/90 bg-gray-50/40 p-0.5 gap-0.5 w-full max-w-[min(100%,320px)]">
                <button
                  type="button"
                  data-testid="dashboard-hashtag-tab-trending"
                  aria-pressed={hashtagMode === 'trending'}
                  onClick={() => persistHashtagMode('trending')}
                  className={`flex-1 inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-center text-[11px] sm:text-[12px] font-semibold transition-colors ${
                    hashtagMode === 'trending'
                      ? 'bg-[#01BAD2] text-white shadow-sm'
                      : 'bg-white/90 text-gray-600 border border-gray-200/90 hover:bg-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 opacity-90 shrink-0" aria-hidden />
                  General trending
                </button>
                <button
                  type="button"
                  data-testid="dashboard-hashtag-tab-for-you"
                  aria-pressed={hashtagMode === 'for_you'}
                  aria-disabled={!hashtagPersonalization}
                  onClick={() => {
                    if (!hashtagPersonalization) {
                      showToast('Add your niche in Brand Profile to unlock brand-specific hashtags.', 'info');
                      navigate('/dashboard/brand-voice');
                      return;
                    }
                    persistHashtagMode('for_you');
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-center text-[11px] sm:text-[12px] font-semibold transition-colors ${
                    hashtagMode === 'for_you'
                      ? 'bg-[#01BAD2] text-white shadow-sm'
                      : 'bg-white/90 text-gray-600 border border-gray-200/90 hover:bg-white'
                  } ${!hashtagPersonalization ? 'opacity-75' : ''}`}
                  title={!hashtagPersonalization ? 'Add your niche in Brand Profile to unlock Brand voice hashtags' : undefined}
                >
                  <Sparkles className="w-3.5 h-3.5 opacity-90 shrink-0" aria-hidden />
                  Brand voice
                </button>
              </div>

              {hashtagWidgetListLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="animate-pulse flex items-center gap-2 p-2.5 border border-gray-100 rounded-lg">
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                      <div className="h-3 w-16 bg-gray-100 rounded ml-auto" />
                    </div>
                  ))}
                </div>
              ) : hashtagWidgetHasRows ? (
                <div className="space-y-1.5">
                  {showHashtagsPreviousDayBanner && (
                    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                      From yesterday — updating now
                    </div>
                  )}

                  {hashtagListForWidget.map((tag, index) => {
                    const reachColor = tag.estimated_reach === 'high'
                      ? 'bg-emerald-100 text-emerald-700'
                      : tag.estimated_reach === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-violet-100 text-violet-700';
                    const showNicheTierBadge =
                      hashtagMode === 'trending' && tag.category === 'niche';
                    const platformLabels = (() => {
                      const fromArr = Array.isArray(tag.relevant_platforms)
                        ? tag.relevant_platforms.filter(Boolean)
                        : [];
                      const deduped = [...new Set(fromArr)];
                      if (deduped.length) return deduped;
                      return tag.platform ? [tag.platform] : [];
                    })();
                    const platformTitles = platformLabels
                      .map((p) => normalizePlatformLabelForIcon(p) || p)
                      .filter(Boolean);
                    return (
                      <button
                        key={`${tag.hashtag}-${index}`}
                        data-testid="dashboard-hashtag-item"
                        onClick={() => copyHashtag(tag.hashtag)}
                        className="group flex w-full items-center gap-3 p-2.5 text-left rounded-lg border border-gray-100 hover:border-huttle-primary/30 hover:bg-huttle-50/30 transition-all"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900 truncate">{tag.hashtag}</span>
                          {showNicheTierBadge && (
                            <span className="flex-shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 tracking-wide">
                              Niche
                            </span>
                          )}
                          {platformLabels.length > 0 && (
                            <div
                              className="flex flex-shrink-0 items-center gap-1"
                              aria-label={platformTitles.length ? `Good for: ${platformTitles.join(', ')}` : undefined}
                            >
                              {platformLabels.map((platform, pIdx) => {
                                const icon = getPlatformIcon(platform, 'w-3.5 h-3.5 text-gray-600');
                                if (!icon) return null;
                                const label = normalizePlatformLabelForIcon(platform) || platform;
                                return (
                                  <span
                                    key={`${label}-${pIdx}`}
                                    title={label}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gray-100 bg-gray-50 text-gray-700"
                                  >
                                    {icon}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${reachColor}`}>
                            {tag.estimated_reach?.toUpperCase() || 'MEDIUM'}
                          </span>
                          {copiedHashtag === tag.hashtag ? (
                            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-300 group-hover:text-huttle-primary shrink-0 transition-colors" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      const allTags = hashtagListForWidget.map(t => t.hashtag).join(' ');
                      navigator.clipboard.writeText(allTags).then(() => showToast('All hashtags copied!', 'success'));
                    }}
                    disabled={!hashtagWidgetHasRows}
                    className="mt-3 w-full py-2 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy All Hashtags
                  </button>
                </div>
              ) : useForYouHashtags ? (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-500 mb-3">Personalized hashtags couldn't load. Try again.</p>
                  <button
                    type="button"
                    onClick={retryForYouHashtags}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500 p-3 border border-gray-100 rounded-xl">{hashtagsFallbackMessage}</p>
              )}

            </div>
          </div>
        </motion.div>
      </div>

      {/* AI Insights - Full Width */}
      <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp} className="mb-6">
        <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100/80 shadow-sm">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-huttle-primary" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">AI Insights</h2>
                <p className="text-xs text-gray-500">Daily niche intelligence</p>
              </div>
            </div>
            {isDashboardLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="animate-pulse rounded-xl border border-gray-100 p-4">
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-3" />
                    <div className="h-3 w-full bg-gray-100 rounded mb-2" />
                    <div className="h-3 w-5/6 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : dashboardInsights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dashboardInsights.map((insight, i) => { // HUTTLE: sanitized
                  const sanitizedInsightCategory = sanitizeAIOutput(insight.category); // HUTTLE: sanitized
                  const sanitizedInsightHeadline = sanitizeAIOutput(insight.headline); // HUTTLE: sanitized
                  const sanitizedInsightDetail = sanitizeAIOutput(insight.detail); // HUTTLE: sanitized
                  return ( // HUTTLE: sanitized
                    <div
                      key={i}
                      className="relative rounded-xl border border-huttle-100 bg-gradient-to-br from-huttle-50/50 to-cyan-50/40 p-4"
                    >
                      <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full ${getInsightCategoryStyles(sanitizedInsightCategory)}`}>
                        {sanitizedInsightCategory}
                      </span>
                      <h4 className="font-bold text-sm text-gray-900 mb-2 pr-16">{sanitizedInsightHeadline}</h4>
                      <p className="text-xs text-gray-700 leading-relaxed">{sanitizedInsightDetail}</p>
                    </div>
                  ); // HUTTLE: sanitized
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No daily insights available yet.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick Create (compact) above Recently Saved */}
      <div className="relative grid grid-cols-1 gap-6 mb-6">
        {/* Quick Create - Compact */}
        <motion.div custom={6} initial="hidden" animate="visible" variants={fadeUp}>
          <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100/80 shadow-sm h-full">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-huttle-primary" />
                  </div>
                  <h2 className="font-bold text-gray-900 text-sm">Quick Create</h2>
                </div>
                <Link to="/dashboard/ai-tools" className="text-xs font-semibold text-huttle-primary hover:text-huttle-primary-dark flex items-center gap-1 group">
                  All Tools <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {QUICK_CREATE_TOOLS.map((tool) => (
                  <motion.button
                    key={tool.id}
                    onClick={() => navigate(`/dashboard/ai-tools?tool=${tool.id}`)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 hover:border-huttle-primary/30 hover:bg-huttle-50/30 transition-all text-left"
                  >
                    <div className="w-7 h-7 rounded-md bg-gray-50 group-hover:bg-huttle-primary/10 flex items-center justify-center flex-shrink-0 transition-colors">
                      <tool.icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-huttle-primary transition-colors" />
                    </div>
                    <span className="font-medium text-xs text-gray-800">{tool.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recently Saved */}
        <motion.div custom={7} initial="hidden" animate="visible" variants={fadeUp}>
          <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100/80 shadow-sm h-full">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                    <FolderOpen className="w-4 h-4 text-huttle-primary" />
                  </div>
                  <h2 className="font-bold text-gray-900 text-sm">Recently Saved</h2>
                </div>
                <Link to="/dashboard/library" className="flex items-center gap-1 text-huttle-primary text-xs font-semibold hover:text-huttle-primary-dark transition-colors group">
                  View All
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {recentVaultItems.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <FolderOpen className="w-5 h-5 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Your content vault is empty</h3>
                  <p className="text-xs text-gray-500 mb-3">Generate your first piece of content</p>
                  <Link
                    to="/dashboard/ai-tools"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-huttle-gradient hover:bg-huttle-primary-dark text-white rounded-lg font-semibold text-xs transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Start Creating
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentVaultItems.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-start justify-between p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-huttle-50 text-huttle-primary text-xs font-bold rounded-full">
                            {getToolBadge(item.name || item.description)}
                          </span>
                          <span className="text-xs text-gray-400">{item.date}</span>
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-2">
                          {item.content || item.name || 'Content item'}
                        </p>
                      </div>
                      <button
                        onClick={() => copyVaultItem(item.content || item.name, item.id)}
                        className="p-2 hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                        title="Copy"
                      >
                        {copiedVaultItem === item.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Daily Alerts */}
      <motion.div custom={8} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100/80 shadow-sm">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                <Bell className="w-5 h-5 text-huttle-primary" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Daily Alerts</h2>
                <p className="text-xs text-gray-500">Important platform updates</p>
              </div>
            </div>
            <div className="space-y-3">
              {isAlertsLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2].map((item) => (
                    <div key={item} className="animate-pulse p-4 border border-gray-100 rounded-xl">
                      <div className="h-4 w-1/2 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-full bg-gray-100 rounded mb-1" />
                      <div className="h-3 w-3/4 bg-gray-100 rounded" />
                    </div>
                  ))}
                </div>
              )}
              {!isAlertsLoading && dashboardAlerts.length === 0 && (
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <p className="text-xs text-gray-600 mb-2">No alerts yet. We will surface important platform updates here.</p>
                  <Link to="/dashboard/social-updates" className="inline-flex items-center gap-1 text-xs font-semibold text-huttle-primary hover:text-huttle-primary-dark">
                    Open Social Updates <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
              {!isAlertsLoading && dashboardAlerts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dashboardAlerts.map((alert) => { // HUTTLE: sanitized
                    const impact = String(alert.impact_level || 'medium').toLowerCase(); // HUTTLE: sanitized
                    const typeColor = impact === 'high' ? 'bg-red-100 text-red-700' : impact === 'low' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'; // HUTTLE: sanitized
                    const sanitizedAlertTitle = sanitizeAIOutput(alert.update_title) || 'Platform update'; // HUTTLE: sanitized
                    const sanitizedAlertSummary = sanitizeAIOutput(alert.update_summary) || 'A new social platform update is available.'; // HUTTLE: sanitized
                    return (
                      <div key={alert.id} className="p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <h4 className="font-semibold text-sm text-gray-900">{sanitizedAlertTitle}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${typeColor}`}>{impact}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">{sanitizedAlertSummary}</p>
                        <Link to="/dashboard/social-updates" className="text-xs font-semibold text-huttle-primary hover:text-huttle-primary-dark flex items-center gap-1 group">
                          View Update <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <FloatingActionButton />

      {showTrialWelcomeModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-cyan-100 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-huttle-primary to-cyan-400" />
            <button
              onClick={() => setShowTrialWelcomeModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close trial welcome"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <div className="p-8">
              <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-5 text-2xl">
                🎉
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your 7-day trial has started!</h2>
              <p className="text-gray-600 mb-3">
                Your card will not be charged until{' '}
                <span className="font-semibold text-gray-900">
                  {trialWelcomeDate?.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                .
              </p>
              <p className="text-gray-600 mb-6">You have full Pro access. Let&apos;s create some content.</p>
              <button
                onClick={() => setShowTrialWelcomeModal(false)}
                className="btn-primary"
              >
                Start Creating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
