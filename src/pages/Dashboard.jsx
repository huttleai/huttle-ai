import { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useBrand } from '../context/BrandContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  Target,
  Bell,
  Sparkles,
  AlertCircle,
  Plus,
  ArrowRight,
  Beaker,
  Zap,
  ChevronRight,
  ArrowUpRight,
  Copy,
  Check,
  MessageSquare,
  Hash,
  Type,
  BarChart3,
  Image as ImageIcon,
  FolderOpen,
  Clock,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import GuidedTour from '../components/GuidedTour';
import confetti from 'canvas-confetti';
import { getPersonalizedGreeting, hasProfileContext, isCreatorProfile } from '../utils/brandContextBuilder';
import { getPlatformIcon } from '../components/SocialIcons';
import { supabase } from '../config/supabase';
import { getContentLibraryItems } from '../config/supabase';
import {
  generateDashboardData,
  trackDashboardGenerationUsage,
} from '../services/dashboardCacheService';

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

const QUICK_CREATE_TOOLS = [
  { id: 'caption', name: 'Caption Generator', icon: MessageSquare, description: 'Create engaging social captions', color: 'from-blue-500 to-cyan-500' },
  { id: 'hashtags', name: 'Hashtag Generator', icon: Hash, description: 'Find trending hashtags', color: 'from-emerald-500 to-teal-500' },
  { id: 'hooks', name: 'Hook Builder', icon: Type, description: 'Craft attention-grabbing openers', color: 'from-violet-500 to-purple-500' },
  { id: 'cta', name: 'CTA Suggester', icon: Target, description: 'Powerful call-to-action phrases', color: 'from-orange-500 to-pink-500' },
  { id: 'scorer', name: 'Quality Scorer', icon: BarChart3, description: 'Score and improve your content', color: 'from-amber-500 to-orange-500' },
  { id: 'visual-brainstorm', name: 'Visual Brainstormer', icon: ImageIcon, description: 'AI image prompts & shoot guides', color: 'from-pink-500 to-rose-500' },
];

export default function Dashboard() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const { brandProfile, loading: isBrandProfileLoading } = useBrand();
  const { showToast } = useToast();
  const { addNotification, addSocialUpdate } = useNotifications();
  const { userTier, getTierDisplayName } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const [copiedHashtag, setCopiedHashtag] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState('');
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isHashtagsRefreshing, setIsHashtagsRefreshing] = useState(false);
  const [dashboardAlerts, setDashboardAlerts] = useState([]);
  const [isAlertsLoading, setIsAlertsLoading] = useState(false);
  const [recentVaultItems, setRecentVaultItems] = useState([]);
  const [copiedVaultItem, setCopiedVaultItem] = useState(null);
  const [selectedHashtagPlatform, setSelectedHashtagPlatform] = useState('All');
  const dashboardLoadedRef = useRef(false);
  const brandProfileRef = useRef(brandProfile);
  const brandLoadingRef = useRef(isBrandProfileLoading);

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

  const refreshHashtags = async () => {
    if (!user?.id || isHashtagsRefreshing) return;
    setIsHashtagsRefreshing(true);
    try {
      const result = await generateDashboardData(user.id, brandProfile, { forceRefreshHashtags: true });
      if (result.success) {
        setDashboardData(result.data);
        if (result.shouldTrackUsage) {
          await trackDashboardGenerationUsage(user.id, 'dashboard_daily_generation');
        }
        showToast('Hashtags refreshed!', 'success');
      } else {
        showToast('Could not refresh hashtags. Try again.', 'error');
      }
    } catch (err) {
      console.error('[Dashboard] Failed to refresh hashtags:', err);
      showToast('Could not refresh hashtags. Try again.', 'error');
    } finally {
      setIsHashtagsRefreshing(false);
    }
  };

  const retryTrending = async () => {
    if (!user?.id || isDashboardLoading) return;
    setIsDashboardLoading(true);
    setDashboardError('');
    try {
      const result = await generateDashboardData(user.id, brandProfile, { forceRefreshTrending: true });
      if (result.success) {
        setDashboardData(result.data);
        if (result.shouldTrackUsage) {
          await trackDashboardGenerationUsage(user.id, 'dashboard_daily_generation');
        }
        showToast('Refreshing trends...', 'info');
      } else {
        setDashboardError('Unable to load your daily briefing right now. Please try again.');
      }
    } catch (error) {
      console.error('[Dashboard] Failed to refresh trends:', error);
      setDashboardError('Unable to load your daily briefing right now. Please try again.');
    } finally {
      setIsDashboardLoading(false);
    }
  };

  const [timeGreeting, setTimeGreeting] = useState('');
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeGreeting('Good morning');
    else if (hour < 17) setTimeGreeting('Good afternoon');
    else setTimeGreeting('Good evening');
  }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    if (success === 'true') {
      showToast(`Welcome to ${getTierDisplayName(userTier)}! Your upgrade is now active.`, 'success');
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#01bad2', '#2B8FC7', '#00ACC1', '#4DD0E1', '#ffffff'], disableForReducedMotion: true });
      }
      searchParams.delete('success');
      setSearchParams(searchParams, { replace: true });
    }
    if (canceled === 'true') {
      showToast('Checkout canceled. No changes were made to your subscription.', 'info');
      searchParams.delete('canceled');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, showToast, userTier, getTierDisplayName]);

  const isCreator = isCreatorProfile(brandProfile);
  const personalizedGreeting = getPersonalizedGreeting(
    brandProfile,
    user?.user_metadata?.name || user?.user_metadata?.full_name || user?.name || user?.email?.split('@')[0] || 'Creator'
  );

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
  const displayedDashboardTrendingTopics = useMemo(
    () => dashboardTrendingTopics.slice(0, 6),
    [dashboardTrendingTopics]
  );
  const dashboardInsights = useMemo(() => {
    const arr = Array.isArray(dashboardData?.ai_insights) ? dashboardData.ai_insights : [];
    if (arr.length > 0) return arr;
    return dashboardData?.ai_insight ? [dashboardData.ai_insight] : [];
  }, [dashboardData]);
  const [expandedTrend, setExpandedTrend] = useState(null);

  const hasNicheConfigured = Boolean(normalizedNiche || normalizedIndustry);
  const tourSteps = [
    { title: 'Welcome to Huttle AI!', content: 'Let\'s take a quick tour to help you get the most out of your experience. We\'ll walk you through the key features.', icon: Sparkles },
    { title: 'Set Up Your Brand Voice', content: 'Head to Brand Voice in the sidebar to define your brand personality, tone, and target audience. This ensures all AI-generated content matches your unique style.', icon: Target },
    { title: 'AI Power Tools', content: 'Generate captions, hashtags, hooks, and more with our AI Power Tools. Each generation uses your brand voice for consistent, on-brand content.', icon: Zap },
    { title: 'Trend Lab', content: 'Discover trending topics in your niche with Quick Scan, or do a Deep Dive into specific trends for actionable content ideas.', icon: TrendingUp },
    { title: 'You\'re All Set!', content: 'Explore your dashboard to discover AI insights and trending topics. Save everything to your Content Vault. Track your AI generation usage in the sidebar. Happy creating!', icon: Sparkles },
  ];

  // Load recent vault items
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    const loadRecentVault = async () => {
      try {
        const result = await getContentLibraryItems(user.id);
        if (!isMounted) return;
        if (result.success && Array.isArray(result.data)) {
          const sorted = [...result.data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setRecentVaultItems(sorted.slice(0, 4).map(item => ({
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
    };
    loadRecentVault();
    return () => { isMounted = false; };
  }, [user?.id]);

  useEffect(() => {
    dashboardLoadedRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    brandProfileRef.current = brandProfile;
  }, [brandProfile]);

  useEffect(() => {
    brandLoadingRef.current = isBrandProfileLoading;
  }, [isBrandProfileLoading]);

  useEffect(() => {
    let isActive = true;

    const waitForBrandProfile = async () => {
      while (isActive && brandLoadingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    };

    const loadDailyDashboard = async () => {
      await waitForBrandProfile();
      if (!isActive || !user?.id) return;
      setDashboardError('');
      setIsDashboardLoading(true);
      try {
        const generatedResult = await generateDashboardData(user.id, brandProfileRef.current);
        if (!isActive) return;
        if (generatedResult.success) {
          setDashboardData(generatedResult.data);
          if (generatedResult.shouldTrackUsage) {
            await trackDashboardGenerationUsage(user.id, 'dashboard_daily_generation');
          }
        } else {
          setDashboardError('Unable to load your daily briefing right now. Please try again.');
        }
      } catch (error) {
        console.error('[Dashboard] Failed to load daily dashboard:', error);
        setDashboardError('Unable to load your daily briefing right now. Please try again.');
      } finally {
        if (isActive) {
          setIsDashboardLoading(false);
        }
      }
    };

    if (authLoading) return () => { isActive = false; };
    if (!user) return () => { isActive = false; };
    if (dashboardLoadedRef.current) return () => { isActive = false; };

    dashboardLoadedRef.current = true;
    console.log('[Dashboard] Auth ready, loading dashboard...');
    loadDailyDashboard();

    return () => { isActive = false; };
  }, [user, authLoading]);

  useEffect(() => {
    let isMounted = true;
    const loadDashboardAlerts = async () => {
      if (!user?.id) return;
      setIsAlertsLoading(true);
      try {
        const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('social_updates')
          .select('id, platform, update_title, update_summary, impact_level, fetched_at')
          .gte('fetched_at', cutoffDate)
          .order('fetched_at', { ascending: false })
          .limit(2);
        if (!isMounted) return;
        if (error) { setDashboardAlerts([]); return; }
        setDashboardAlerts(Array.isArray(data) ? data : []);
      } catch { if (isMounted) setDashboardAlerts([]); }
      finally { if (isMounted) setIsAlertsLoading(false); }
    };
    loadDashboardAlerts();
    return () => { isMounted = false; };
  }, [user?.id]);

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
    if (value === 'rising') return { indicator: '↑', textClass: 'text-emerald-600', bgClass: 'bg-emerald-50' };
    if (value === 'declining') return { indicator: '↓', textClass: 'text-red-600', bgClass: 'bg-red-50' };
    return { indicator: '•', textClass: 'text-amber-600', bgClass: 'bg-amber-50' };
  };

  const getInsightCategoryStyles = (category) => {
    const normalized = (category || '').toLowerCase();
    if (normalized === 'timing') return 'bg-amber-100 text-amber-700';
    if (normalized === 'audience') return 'bg-blue-100 text-blue-700';
    if (normalized === 'platform') return 'bg-purple-100 text-purple-700';
    if (normalized === 'content type') return 'bg-emerald-100 text-emerald-700';
    return 'bg-huttle-100 text-huttle-primary-dark';
  };

  // Welcome notification
  useEffect(() => {
    if (!user?.id) return;
    const welcomeKey = `hasSeenWelcome:${user.id}`;
    const hasSeenWelcome = localStorage.getItem(welcomeKey);
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => {
        addNotification({
          type: 'info',
          title: 'Welcome to Huttle AI!',
          message: 'Your AI-powered content creation assistant is ready. Generate your first piece of content to get started!',
          dismissKey: `welcome_${user.id}`,
          actionUrl: '/dashboard/ai-tools',
          actionLabel: 'Start Creating',
          persistent: false,
        });
        localStorage.setItem(welcomeKey, 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [addNotification, user?.id]);

  const getToolBadge = (name) => {
    if (!name) return 'Content';
    const lower = name.toLowerCase();
    if (lower.includes('caption')) return 'Caption';
    if (lower.includes('hashtag')) return 'Hashtags';
    if (lower.includes('hook')) return 'Hook';
    if (lower.includes('cta')) return 'CTA';
    if (lower.includes('visual')) return 'Visual';
    if (lower.includes('blueprint')) return 'Blueprint';
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
  const displayedDashboardHashtags = useMemo(() => {
    const deduplicatedHashtags = [];
    const hashtagMap = new Map();

    if (dashboardHashtagPlatforms.length === 0) {
      for (const hashtag of dashboardHashtags) {
        mergeHashtagIntoMap(hashtagMap, deduplicatedHashtags, hashtag);
        if (deduplicatedHashtags.length >= TOTAL_HASHTAG_CAP) break;
      }

      return deduplicatedHashtags;
    }

    const hashtagsByPlatform = dashboardHashtagPlatforms.map((platform) => ({
      platform,
      hashtags: dashboardHashtags.filter((tag) => tag.platform === platform),
      index: 0,
    }));

    const perPlatformLimit = Math.floor(TOTAL_HASHTAG_CAP / dashboardHashtagPlatforms.length);
    const remainder = TOTAL_HASHTAG_CAP % dashboardHashtagPlatforms.length;
    const initialPlatformLimits = new Map(
      dashboardHashtagPlatforms.map((platform, index) => [
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
  }, [dashboardHashtagPlatforms, dashboardHashtags]);
  const filteredDashboardHashtags = useMemo(() => {
    if (selectedHashtagPlatform === 'All') {
      return displayedDashboardHashtags;
    }

    return displayedDashboardHashtags.filter((tag) => tag.relevant_platforms?.includes(selectedHashtagPlatform));
  }, [displayedDashboardHashtags, selectedHashtagPlatform]);
  const showBrandVoiceNudge = Boolean(dashboardData?.show_brand_voice_nudge);
  const dashboardTrendingMode = dashboardData?.trending_mode || 'niche_specific';
  const primaryPlatformLabel = dashboardData?.primary_platform_label
    || dashboardHashtagPlatforms[0]
    || 'Instagram';
  const showPlatformWideNicheNudge = Boolean(dashboardData?.show_platform_wide_niche_nudge);
  const trendingFallbackMessage = dashboardData?.trending_fallback_message || 'Trends are refreshing — check back in a few minutes.';
  const hashtagsFallbackMessage = dashboardData?.hashtags_fallback_message || 'Hashtags loading — refresh in a moment.';
  const hashtagsFromPreviousDay = Boolean(dashboardData?.hashtags_from_previous_day);

  useEffect(() => {
    if (dashboardHashtagPlatforms.length <= 1) {
      setSelectedHashtagPlatform('All');
      return;
    }

    const availablePlatforms = ['All', ...dashboardHashtagPlatforms];
    if (!availablePlatforms.includes(selectedHashtagPlatform)) {
      setSelectedHashtagPlatform('All');
    }
  }, [dashboardHashtagPlatforms, selectedHashtagPlatform]);

  const freshnessDisplay = useMemo(() => {
    if (isDashboardLoading) {
      return {
        status: 'loading',
        dotClass: '',
        text: `Fetching today's insights${normalizedNiche ? ` for ${normalizedNiche}` : ''}...`,
      };
    }
    if (dashboardError) {
      return {
        status: 'error',
        dotClass: 'bg-red-500',
        text: 'Could not load today\'s data',
      };
    }
    if (!dashboardData?.created_at) {
      return null;
    }
    const createdMs = new Date(dashboardData.created_at).getTime();
    const nowMs = Date.now();
    const diffMs = nowMs - createdMs;
    const diffHours = diffMs / (1000 * 60 * 60);

    const etFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
      hour12: true,
    });
    const updatedTimeET = etFormatter.format(new Date(createdMs));

    if (diffHours < 24) {
      return {
        status: 'fresh',
        dotClass: 'bg-green-500',
        text: `Updated at ${updatedTimeET} ET · Next refresh tomorrow at 6:00 AM ET`,
      };
    }
    return {
      status: 'stale',
      dotClass: 'bg-amber-500 animate-pulse',
      text: 'Updating now...',
    };
  }, [isDashboardLoading, dashboardError, dashboardData?.created_at, normalizedNiche]);

  return (
    <div className="flex-1 min-h-screen bg-transparent ml-0 lg:ml-64 pt-24 lg:pt-16 px-4 sm:px-6 lg:px-8 pb-12">
      <GuidedTour steps={tourSteps} storageKey="dashboardTour" />

      {/* Welcome Header */}
      <MotionDiv className="relative mb-6 pt-6" initial="hidden" animate="visible" custom={0} variants={fadeUp}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            {isCreator ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-green-600">Active Now</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {personalizedGreeting.shortMessage} <span className="animate-wave inline-block">👋</span>
                </h1>
                <p className="text-gray-500 mt-1 text-sm">Ready to create something amazing today?</p>
                {personalizedGreeting.needsProfile && (
                  <Link to="/dashboard/brand-voice" className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-huttle-primary hover:underline">
                    Complete your profile for a personalized experience <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">{timeGreeting}</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {personalizedGreeting.shortMessage} <span className="animate-wave inline-block">👋</span>
                </h1>
                <p className="text-gray-500 mt-1 text-sm">Here's what's happening with your content today.</p>
                {personalizedGreeting.needsProfile && (
                  <Link to="/dashboard/brand-voice" className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-huttle-primary hover:underline">
                    Complete your Brand Voice for a personalized experience <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/ai-tools"
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-huttle-gradient hover:bg-huttle-primary-dark text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Content</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
            </Link>
          </div>
        </div>
      </MotionDiv>

      {/* Data Freshness Indicator */}
      {freshnessDisplay && (
        <motion.div custom={0.5} initial="hidden" animate="visible" variants={fadeUp} className="mb-6">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-gray-100/80 shadow-sm">
            {freshnessDisplay.status === 'loading' ? (
              <Loader2 className="w-3.5 h-3.5 text-huttle-primary animate-spin flex-shrink-0" />
            ) : (
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${freshnessDisplay.dotClass}`} />
            )}
            <span className="text-xs text-gray-600 font-medium">{freshnessDisplay.text}</span>
            {freshnessDisplay.status === 'error' && (
              <span className="ml-auto text-xs text-gray-400">Reload page to retry</span>
            )}
            {freshnessDisplay.status === 'fresh' && (
              <Clock className="w-3.5 h-3.5 text-gray-400 ml-auto flex-shrink-0" />
            )}
          </div>
        </motion.div>
      )}

      {/* Hero Section - Trending Now (2/3) + Hashtags of the Day (1/3) */}
      <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Trending Now - Hero */}
        <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp} className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100/80 shadow-sm h-full">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-huttle-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Trending Now</h2>
                    <p className="text-xs text-gray-500">
                      {dashboardTrendingMode === 'platform_wide'
                        ? `What's trending on ${primaryPlatformLabel}`
                        : hasNicheConfigured
                          ? `Hot topics in ${normalizedNiche || normalizedIndustry}`
                          : 'General trends across platforms'}
                    </p>
                  </div>
                </div>
              </div>

              {!hasProfilePersonalization && (
                <div className="bg-huttle-50/50 border border-huttle-100 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-huttle-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Personalize Your Feed</p>
                      <p className="text-xs text-gray-600 mb-2">Set up your brand voice for tailored trends.</p>
                      <Link to="/dashboard/brand-voice" className="inline-flex items-center gap-1 text-xs font-semibold text-huttle-primary hover:text-huttle-primary-dark group">
                        Setup Brand Voice <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {isDashboardLoading && (
                  <>
                    {[1, 2, 3, 4].map((item) => (
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
                  const expandKey = `trend-${index}`;
                  const isExpanded = expandedTrend === expandKey;
                  const hasExpandableContent = (Array.isArray(trend.content_angles) && trend.content_angles.length > 0);
                  const trendDescription = trend.description || trend.context;
                  return (
                    <div
                      key={`${trend.topic}-${index}`}
                      className="rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                              {getPlatformIcon(trend.relevant_platform, 'w-4 h-4 text-gray-600')}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-gray-900 truncate">{trend.topic}</p>
                              <span className="text-[11px] text-gray-500 font-medium">{trend.relevant_platform || 'Multi-platform'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {trend.from_cache && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                                Updated today
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${momentumStyles.bgClass} ${momentumStyles.textClass}`}>
                              <span>{momentumStyles.indicator}</span>
                              <span className="capitalize">{trend.momentum}</span>
                            </span>
                          </div>
                        </div>

                        {trendDescription && (
                          <p className="text-xs text-gray-700 leading-relaxed mb-3">{trendDescription}</p>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/ai-tools?topic=${encodeURIComponent(trend.topic)}`); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors"
                          >
                            <Sparkles className="w-3 h-3" /> Create
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/trend-lab?topic=${encodeURIComponent(trend.topic)}`); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border border-gray-200 text-gray-600 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Beaker className="w-3 h-3" /> Deep Dive
                          </button>
                          {hasExpandableContent && (
                            <button
                              onClick={() => setExpandedTrend(isExpanded ? null : expandKey)}
                              className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              Content Ideas
                              <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && hasExpandableContent && (
                        <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50/50 rounded-b-xl animate-fadeIn">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Content Angles</p>
                          <ul className="space-y-1.5">
                            {trend.content_angles.slice(0, 3).map((angle, ai) => (
                              <li key={ai} className="text-xs text-gray-700 flex items-start gap-2">
                                <span className="w-4 h-4 rounded-full bg-huttle-primary/10 text-huttle-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{ai + 1}</span>
                                <span className="leading-relaxed">{angle}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
                  Showing platform-wide trends ·{' '}
                  <Link to="/dashboard/brand-voice" className="text-teal-500 underline">
                    Add your niche
                  </Link>{' '}
                  for personalized trends
                </div>
              )}

              {showBrandVoiceNudge && (
                <Link
                  to="/dashboard/brand-voice"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-huttle-primary hover:text-huttle-primary-dark"
                >
                  {dashboardData?.brand_voice_nudge_copy || 'Set your Brand Voice for niche-specific trends →'}
                </Link>
              )}

              <Link to="/dashboard/trend-lab" className="mt-4 w-full py-2.5 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm">
                <Beaker className="w-4 h-4" /> Explore Trend Lab
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Hashtags of the Day */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}>
          <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100/80 shadow-sm h-full">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-huttle-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900">Hashtags of the Day</h2>
                  <p className="text-xs text-gray-500">
                    {dashboardTrendingMode === 'platform_wide'
                      ? `Top reach tags on ${primaryPlatformLabel}`
                      : 'Copy & paste ready'}
                  </p>
                </div>
                <button
                  onClick={refreshHashtags}
                  disabled={isHashtagsRefreshing || isDashboardLoading}
                  title="Regenerate hashtags"
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isHashtagsRefreshing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                </button>
              </div>

              {isDashboardLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="animate-pulse flex items-center gap-2 p-2.5 border border-gray-100 rounded-lg">
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                      <div className="h-3 w-16 bg-gray-100 rounded ml-auto" />
                    </div>
                  ))}
                </div>
              ) : displayedDashboardHashtags.length > 0 ? (
                <div className="space-y-1.5">
                  {hashtagsFromPreviousDay && (
                    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                      From yesterday — updating now
                    </div>
                  )}
                  {dashboardHashtagPlatforms.length > 1 && (
                    <div className="flex flex-wrap gap-2 pb-2">
                      {['All', ...dashboardHashtagPlatforms].map((platform) => {
                        const isSelected = selectedHashtagPlatform === platform;
                        return (
                          <button
                            key={platform}
                            onClick={() => setSelectedHashtagPlatform(platform)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                              isSelected
                                ? 'bg-huttle-primary text-white border-huttle-primary'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {platform}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredDashboardHashtags.map((tag, index) => {
                    const reachColor = tag.estimated_reach === 'high'
                      ? 'bg-emerald-100 text-emerald-700'
                      : tag.estimated_reach === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-violet-100 text-violet-700';
                    const platforms = Array.isArray(tag.relevant_platforms) ? tag.relevant_platforms : [];
                    return (
                      <button
                        key={`${tag.hashtag}-${index}`}
                        onClick={() => copyHashtag(tag.hashtag)}
                        className="group w-full flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 hover:border-huttle-primary/30 hover:bg-huttle-50/30 transition-all text-left"
                      >
                        <span className="font-semibold text-sm text-gray-900 truncate">{tag.hashtag}</span>
                        {platforms.length > 0 && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {platforms.map((platform) => {
                              const icon = getPlatformIcon(platform, 'w-3 h-3 text-gray-500');
                              if (!icon) return null;
                              return (
                                <span
                                  key={platform}
                                  title={platform}
                                  className="w-5 h-5 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0"
                                >
                                  {icon}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <span className={`ml-auto text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0 ${reachColor}`}>
                          {tag.estimated_reach?.toUpperCase() || 'MEDIUM'}
                        </span>
                        {copiedHashtag === tag.hashtag ? (
                          <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-300 group-hover:text-huttle-primary flex-shrink-0 transition-colors" />
                        )}
                      </button>
                    );
                  })}
                  {filteredDashboardHashtags.length === 0 && (
                    <p className="text-xs text-gray-500 p-3 border border-gray-100 rounded-xl">No tags available for this platform right now.</p>
                  )}
                  <button
                    onClick={() => {
                      const allTags = filteredDashboardHashtags.map(t => t.hashtag).join(' ');
                      navigator.clipboard.writeText(allTags).then(() => showToast('All hashtags copied!', 'success'));
                    }}
                    disabled={filteredDashboardHashtags.length === 0}
                    className="mt-3 w-full py-2 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy All Hashtags
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500 p-3 border border-gray-100 rounded-xl">{hashtagsFallbackMessage}</p>
              )}

              {showBrandVoiceNudge && (
                <Link
                  to="/dashboard/brand-voice"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-huttle-primary hover:text-huttle-primary-dark"
                >
                  {dashboardData?.brand_voice_nudge_copy || 'Set your Brand Voice for niche-specific trends →'}
                </Link>
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
                {dashboardInsights.map((insight, i) => (
                  <div
                    key={i}
                    className="relative rounded-xl border border-huttle-100 bg-gradient-to-br from-huttle-50/50 to-cyan-50/40 p-4"
                  >
                    <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full ${getInsightCategoryStyles(insight.category)}`}>
                      {insight.category}
                    </span>
                    <h4 className="font-bold text-sm text-gray-900 mb-2 pr-16">{insight.headline}</h4>
                    <p className="text-xs text-gray-700 leading-relaxed">{insight.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No daily insights available yet.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick Create (compact) + Recently Saved */}
      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                  {dashboardAlerts.map((alert) => {
                    const impact = String(alert.impact_level || 'medium').toLowerCase();
                    const typeColor = impact === 'high' ? 'bg-red-100 text-red-700' : impact === 'low' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700';
                    return (
                      <div key={alert.id} className="p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <h4 className="font-semibold text-sm text-gray-900">{alert.update_title || 'Platform update'}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${typeColor}`}>{impact}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">{alert.update_summary || 'A new social platform update is available.'}</p>
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
    </div>
  );
}
