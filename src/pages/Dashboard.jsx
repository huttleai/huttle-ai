import { useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useBrand } from '../context/BrandContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  TrendingUp,
  Target,
  Bell,
  Sparkles,
  AlertCircle,
  Plus,
  ArrowRight,
  Trash2,
  Beaker,
  Clock,
  Zap,
  ChevronRight,
  Flame,
  Activity,
  ArrowUpRight,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import CreatePostModal from '../components/CreatePostModal';
import FloatingActionButton from '../components/FloatingActionButton';
import HoverPreview from '../components/HoverPreview';
import MiniCalendar from '../components/MiniCalendar';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import GuidedTour from '../components/GuidedTour';
import { formatTo12Hour } from '../utils/timeFormatter';
import confetti from 'canvas-confetti';
import { shouldResetAIUsage } from '../utils/aiUsageHelpers';
import { getPersonalizedGreeting, hasProfileContext, isCreatorProfile } from '../utils/brandContextBuilder';
import { getPlatformIcon } from '../components/SocialIcons';
import { supabase } from '../config/supabase';
import {
  getDashboardCache,
  generateDashboardData,
  deleteDashboardCache,
  trackDashboardGenerationUsage,
} from '../services/dashboardCacheService';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const { scheduledPosts, deleteScheduledPost } = useContent();
  const navigate = useNavigate();
  const { brandProfile, loading: isBrandProfileLoading } = useBrand();
  const { showToast } = useToast();
  const { 
    addInfo, 
    addAIUsageWarning, 
    addSocialUpdate,
    addScheduledPostReminder,
  } = useNotifications();
  const { userTier, getFeatureLimit, getTierDisplayName } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const [aiGensUsed, setAiGensUsed] = useState(0);
  const [aiGensLimit, setAiGensLimit] = useState(Infinity);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [timeGreeting, setTimeGreeting] = useState('');
  const [hoveredStat, setHoveredStat] = useState(null);
  const [copiedHashtag, setCopiedHashtag] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState('');
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isDashboardRefreshing, setIsDashboardRefreshing] = useState(false);
  const [dashboardAlerts, setDashboardAlerts] = useState([]);
  const [isAlertsLoading, setIsAlertsLoading] = useState(false);
  
  // Copy hashtag to clipboard
  const copyHashtag = async (hashtag) => {
    try {
      await navigator.clipboard.writeText(hashtag);
      setCopiedHashtag(hashtag);
      showToast('Hashtag copied to clipboard!', 'success');
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedHashtag(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy hashtag:', err);
      showToast('Failed to copy hashtag', 'error');
    }
  };
  
  // Generate time-based greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeGreeting('Good morning');
    else if (hour < 17) setTimeGreeting('Good afternoon');
    else setTimeGreeting('Good evening');
  }, []);

  // Handle payment success/cancel query parameters
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      // Show success toast
      showToast(`Welcome to ${getTierDisplayName(userTier)}! Your upgrade is now active.`, 'success');
      
      // Fire celebratory confetti
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        const brandColors = ['#01bad2', '#2B8FC7', '#00ACC1', '#4DD0E1', '#ffffff'];
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: brandColors,
          disableForReducedMotion: true,
        });
      }
      
      // Clear the query parameter from URL
      searchParams.delete('success');
      setSearchParams(searchParams, { replace: true });
    }
    
    if (canceled === 'true') {
      // Show info toast for canceled checkout
      showToast('Checkout canceled. No changes were made to your subscription.', 'info');
      
      // Clear the query parameter from URL
      searchParams.delete('canceled');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, showToast, userTier, getTierDisplayName]);

  // Get personalized greeting based on profile type
  const isCreator = isCreatorProfile(brandProfile);
  const personalizedGreeting = getPersonalizedGreeting(
    brandProfile, 
    user?.user_metadata?.name || user?.user_metadata?.full_name || user?.name || user?.email?.split('@')[0] || 'Creator'
  );

  const getPrimaryContextValue = (value) => {
    if (Array.isArray(value)) return value.find(Boolean)?.toString().trim() || '';
    if (typeof value !== 'string') return '';
    return value
      .split(',')
      .map((part) => part.trim())
      .find(Boolean) || '';
  };

  const normalizedNiche = getPrimaryContextValue(brandProfile?.niche);
  const normalizedIndustry = getPrimaryContextValue(brandProfile?.industry);
  const hasProfilePersonalization = hasProfileContext(brandProfile);

  const dashboardTrendingTopics = useMemo(
    () => (Array.isArray(dashboardData?.trending_topics) ? dashboardData.trending_topics : []),
    [dashboardData]
  );
  const dashboardHashtags = useMemo(
    () => (Array.isArray(dashboardData?.hashtags_of_day) ? dashboardData.hashtags_of_day : []),
    [dashboardData]
  );
  const dashboardInsight = dashboardData?.ai_insight || null;
  
  // Track previous values for detecting updates
  const prevPanelDataRef = useRef({
    scheduledPostsCount: 0,
    lastSocialUpdateCheck: null,
  });

  // Guided tour steps
  const tourSteps = [
    {
      title: 'Welcome to Huttle AI!',
      content: 'Let\'s take a quick tour to help you get the most out of your experience. We\'ll walk you through the key features.',
      icon: Sparkles,
    },
    {
      title: 'Set Up Your Brand Voice',
      content: 'Head to Brand Voice in the sidebar to define your brand personality, tone, and target audience. This ensures all AI-generated content matches your unique style.',
      icon: Target,
    },
    {
      title: 'Smart Calendar',
      content: 'Plan and schedule your social media posts with the Smart Calendar. Click any date to create a post, and get AI-powered optimal posting time suggestions.',
      icon: Calendar,
    },
    {
      title: 'AI Power Tools',
      content: 'Generate captions, hashtags, hooks, and more with our AI Power Tools. Each generation uses your brand voice for consistent, on-brand content.',
      icon: Zap,
    },
    {
      title: 'Trend Lab',
      content: 'Discover trending topics in your niche with Quick Scan, or do a Deep Dive into specific trends for actionable content ideas.',
      icon: TrendingUp,
    },
    {
      title: 'You\'re All Set!',
      content: 'Explore the dashboard to see your upcoming posts, AI insights, and trending topics. Track your AI generation usage in the sidebar. Happy creating!',
      icon: Sparkles,
    },
  ];

  // Initialize AI usage limits
  useEffect(() => {
    const aiLimit = getFeatureLimit('aiGenerations');
    setAiGensLimit(aiLimit === -1 ? Infinity : aiLimit);
    
    const savedUsage = localStorage.getItem('aiGensUsed');
    if (savedUsage) {
      setAiGensUsed(parseInt(savedUsage, 10));
    }
  }, [userTier, getFeatureLimit]);

  // Check if usage should be reset
  useEffect(() => {
    const lastResetDate = localStorage.getItem('aiUsageLastReset');
    const subscriptionStartDate = user?.subscriptionStartDate;
    
    if (shouldResetAIUsage(subscriptionStartDate, lastResetDate)) {
      setAiGensUsed(0);
      localStorage.setItem('aiGensUsed', '0');
      localStorage.setItem('aiUsageLastReset', new Date().toISOString());
      addInfo('AI Usage Reset!', 'Your monthly AI generation limit has been refreshed.', null, null);
    }
  }, [user, addInfo]);

  // Check AI usage warnings
  useEffect(() => {
    if (aiGensLimit !== Infinity && aiGensUsed > 0) {
      const percentage = (aiGensUsed / aiGensLimit) * 100;
      const lastWarning = localStorage.getItem('lastAIUsageWarning');
      const now = Date.now();
      
      if (!lastWarning || (now - parseInt(lastWarning, 10)) > 3600000) {
        if (percentage >= 100 || percentage >= 95 || percentage >= 75) {
          addAIUsageWarning(aiGensUsed, aiGensLimit, Math.round(percentage));
          localStorage.setItem('lastAIUsageWarning', now.toString());
        }
      }
    }
  }, [aiGensUsed, aiGensLimit, addAIUsageWarning]);

  // Check for new social updates
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
          addSocialUpdate(
            mostRecent.platform || 'Platform',
            mostRecent.update_title || 'New social platform update',
            mostRecent.impact_level || 'medium'
          );
          localStorage.setItem('lastNotifiedSocialUpdate', mostRecentId);
        }
      }
      localStorage.setItem('lastSocialUpdateCheck', now.toString());
    }
  }, [addSocialUpdate, dashboardAlerts]);

  // Sort posts by date
  const sortedPosts = [...(scheduledPosts || [])].sort((a, b) => {
    const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
    const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
    return dateA - dateB;
  });

  // Calculate posting streak (consecutive days with scheduled posts starting from today)
  const postingStreak = useMemo(() => {
    if ((scheduledPosts?.length || 0) === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get unique dates with posts
    const datesWithPosts = new Set(
      (scheduledPosts || []).map(post => post.scheduledDate)
    );
    
    let streak = 0;
    let currentDate = new Date(today);
    
    // Count consecutive days starting from today
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (datesWithPosts.has(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() + 1);
      } else {
        break;
      }
    }
    
    return streak;
  }, [scheduledPosts]);

  // Calculate next post countdown
  const nextPostInfo = useMemo(() => {
    if (sortedPosts.length === 0) return { display: 'None', badge: null };
    
    const now = new Date();
    const nextPost = sortedPosts.find(post => {
      const postDate = new Date(`${post.scheduledDate} ${post.scheduledTime}`);
      return postDate > now;
    });
    
    if (!nextPost) return { display: 'None', badge: null };
    
    const postDate = new Date(`${nextPost.scheduledDate} ${nextPost.scheduledTime}`);
    const diffMs = postDate - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1) {
      return { display: `${diffDays}d`, badge: 'Upcoming' };
    } else if (diffDays === 1) {
      return { display: 'Tomorrow', badge: 'Soon' };
    } else if (diffHours > 0) {
      return { display: `${diffHours}h ${diffMins}m`, badge: 'Soon' };
    } else {
      return { display: `${diffMins}m`, badge: 'Now' };
    }
  }, [sortedPosts]);

  // Calculate unique platforms with scheduled posts
  const activePlatforms = useMemo(() => {
    const platforms = new Set();
    (scheduledPosts || []).forEach(post => {
      post.platforms?.forEach(p => platforms.add(p));
    });
    return platforms.size;
  }, [scheduledPosts]);

  const hasNicheConfigured = Boolean(normalizedNiche || normalizedIndustry);
  
  const incrementLocalAIGenerationUsage = useCallback(() => {
    setAiGensUsed((prev) => {
      const next = prev + 1;
      localStorage.setItem('aiGensUsed', next.toString());
      return next;
    });
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadDailyDashboard = async () => {
      if (!user?.id || isBrandProfileLoading) return;

      setDashboardError('');

      const cacheResult = await getDashboardCache(user.id);
      if (!isActive) return;

      if (cacheResult.success && cacheResult.data) {
        setDashboardData(cacheResult.data);
        return;
      }

      setIsDashboardLoading(true);
      const generatedResult = await generateDashboardData(user.id, brandProfile);

      if (!isActive) return;

      if (generatedResult.success) {
        setDashboardData(generatedResult.data);
        if (!generatedResult.isFallback) {
          const usageTracked = await trackDashboardGenerationUsage(user.id, 'dashboard_daily_generation');
          if (usageTracked) {
            incrementLocalAIGenerationUsage();
          }
        }
      } else {
        setDashboardError('Unable to load your daily briefing right now. Please try again.');
      }

      setIsDashboardLoading(false);
    };

    loadDailyDashboard();

    return () => {
      isActive = false;
    };
  }, [brandProfile, incrementLocalAIGenerationUsage, isBrandProfileLoading, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardAlerts = async () => {
      if (!user?.id) return;

      setIsAlertsLoading(true);
      try {
        const { data, error } = await supabase
          .from('social_updates')
          .select('id, platform, update_title, update_summary, impact_level')
          .order('fetched_at', { ascending: false })
          .limit(2);

        if (!isMounted) return;

        if (error) {
          console.error('[Dashboard] Failed to load social alerts:', error);
          setDashboardAlerts([]);
          return;
        }

        setDashboardAlerts(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!isMounted) return;
        console.error('[Dashboard] Unexpected social alerts error:', error);
        setDashboardAlerts([]);
      } finally {
        if (isMounted) setIsAlertsLoading(false);
      }
    };

    loadDashboardAlerts();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleRefreshDashboard = useCallback(async () => {
    if (!user?.id) return;

    setIsDashboardRefreshing(true);
    setDashboardError('');
    setIsDashboardLoading(true);

    const deleteResult = await deleteDashboardCache(user.id);
    if (!deleteResult.success) {
      setDashboardError('We could not refresh your daily briefing. Please try again.');
      setIsDashboardLoading(false);
      setIsDashboardRefreshing(false);
      return;
    }

    const generatedResult = await generateDashboardData(user.id, brandProfile);
    if (generatedResult.success) {
      setDashboardData(generatedResult.data);
      if (!generatedResult.isFallback) {
        const usageTracked = await trackDashboardGenerationUsage(user.id, 'dashboard_manual_refresh');
        if (usageTracked) {
          incrementLocalAIGenerationUsage();
        }
      }
      showToast(
        generatedResult.isFallback
          ? 'Dashboard refreshed with latest available data.'
          : 'Dashboard refreshed with new intelligence.',
        generatedResult.isFallback ? 'info' : 'success'
      );
    } else {
      setDashboardError('We could not refresh your daily briefing. Please try again.');
    }

    setIsDashboardLoading(false);
    setIsDashboardRefreshing(false);
  }, [brandProfile, incrementLocalAIGenerationUsage, showToast, user?.id]);

  const getMomentumStyles = (momentum) => {
    const value = (momentum || '').toLowerCase();
    if (value === 'rising') return { indicator: '↑', textClass: 'text-emerald-600', bgClass: 'bg-emerald-50' };
    if (value === 'declining') return { indicator: '↓', textClass: 'text-red-600', bgClass: 'bg-red-50' };
    return { indicator: '•', textClass: 'text-amber-600', bgClass: 'bg-amber-50' };
  };

  const getReachStyles = (reach) => {
    const value = (reach || '').toLowerCase();
    if (value === 'high') return { dotClass: 'bg-emerald-500', sizeClass: 'text-sm px-3.5 py-1.5' };
    if (value === 'niche') return { dotClass: 'bg-gray-400', sizeClass: 'text-xs px-2.5 py-1' };
    return { dotClass: 'bg-amber-500', sizeClass: 'text-sm px-3 py-1.5' };
  };

  const getInsightCategoryStyles = (category) => {
    const normalized = (category || '').toLowerCase();
    if (normalized === 'timing') return 'bg-amber-100 text-amber-700';
    if (normalized === 'audience') return 'bg-blue-100 text-blue-700';
    if (normalized === 'platform') return 'bg-purple-100 text-purple-700';
    if (normalized === 'content type') return 'bg-emerald-100 text-emerald-700';
    return 'bg-huttle-100 text-huttle-primary-dark';
  };

  // Monitor panel updates
  useEffect(() => {
    const checkPanelUpdates = () => {
      const prev = prevPanelDataRef.current;
      const scheduledPostsCount = scheduledPosts?.length || 0;
      
      if (prev.scheduledPostsCount !== scheduledPostsCount) {
        if (scheduledPostsCount > prev.scheduledPostsCount) {
          const sorted = [...(scheduledPosts || [])].sort((a, b) => {
            const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
            const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
            return dateA - dateB;
          });
          const nextPost = sorted[0];
          if (nextPost) {
            const nextPostTime = `${nextPost.scheduledDate} at ${nextPost.scheduledTime}`;
            addScheduledPostReminder(scheduledPostsCount, nextPostTime);
          }
        }
        prev.scheduledPostsCount = scheduledPostsCount;
      }
    };

    checkPanelUpdates();
    const interval = setInterval(checkPanelUpdates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [scheduledPosts, addScheduledPostReminder]);

  // Welcome notification
  useEffect(() => {
    if (!user?.id) return;

    const welcomeKey = `hasSeenWelcome:${user.id}`;
    const hasSeenWelcome = localStorage.getItem(welcomeKey);
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => {
        addInfo(
          'Welcome to Huttle AI!',
          'Your AI-powered social media assistant is ready. Create your first post to get started!',
          () => setIsCreatePostOpen(true),
          'Create Post'
        );
        localStorage.setItem(welcomeKey, 'true');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [addInfo, user?.id]);

  const handleDeletePost = (postId) => {
    if (window.confirm('Are you sure you want to delete this scheduled post?')) {
      deleteScheduledPost(postId);
      showToast('Post deleted successfully', 'success');
    }
  };

  // Stats configuration - clean monochrome style
  const stats = [
    { 
      label: 'Scheduled', 
      value: sortedPosts.length, 
      icon: Calendar, 
      color: 'text-huttle-primary',
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    { 
      label: 'Streak', 
      value: postingStreak, 
      icon: Flame, 
      subtext: postingStreak === 1 ? 'day' : 'days', 
      color: 'text-huttle-primary',
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    { 
      label: 'Next Post', 
      value: nextPostInfo.display, 
      icon: Clock, 
      badge: nextPostInfo.badge, 
      color: 'text-huttle-primary',
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    { 
      label: 'Platforms', 
      value: activePlatforms, 
      icon: Target, 
      color: 'text-huttle-primary',
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
  ];

  return (
    <div className="flex-1 min-h-screen bg-transparent ml-0 lg:ml-64 pt-24 lg:pt-16 px-4 sm:px-6 lg:px-8 pb-12">
      <GuidedTour steps={tourSteps} storageKey="dashboardTour" />

      {/* Welcome Header - Clean & Minimal */}
      <div className="relative mb-8 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="animate-fadeIn">
            {isCreator ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Active Now</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {personalizedGreeting.shortMessage} <span className="animate-wave inline-block">👋</span>
                </h1>
                <p className="text-gray-500 mt-1 text-sm">
                  Ready to create something amazing today?
                </p>
                {personalizedGreeting.needsProfile && (
                  <Link to="/dashboard/brand-voice" className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-huttle-primary hover:underline">
                    Complete your profile for a personalized experience <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">{timeGreeting}</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {personalizedGreeting.shortMessage} <span className="animate-wave inline-block">👋</span>
                </h1>
                <p className="text-gray-500 mt-1 text-sm">
                  Here's what's happening with your content today.
                </p>
                {personalizedGreeting.needsProfile && (
                  <Link to="/dashboard/brand-voice" className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-huttle-primary hover:underline">
                    Complete your Brand Voice for a personalized experience <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCreatePostOpen(true)}
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-huttle-gradient hover:bg-huttle-primary-dark text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>New Post</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview - Clean Cards */}
      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div 
            key={stat.label}
            className={`group relative overflow-hidden rounded-xl bg-white border border-gray-100/80 p-5 transition-all duration-300 cursor-pointer ${
              hoveredStat === idx ? 'shadow-md border-gray-200 scale-[1.02]' : 'shadow-sm hover:shadow-md'
            }`}
            onMouseEnter={() => setHoveredStat(idx)}
            onMouseLeave={() => setHoveredStat(null)}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:bg-huttle-50`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {stat.badge && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-huttle-50 text-huttle-primary rounded-full">
                  {stat.badge}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">{stat.label}</p>
            {stat.subtext && <p className="text-[10px] text-gray-400 mt-1">{stat.subtext}</p>}
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar & Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-100/80 bg-white shadow-sm overflow-hidden">
              <MiniCalendar 
                onDateClick={(dateStr) => navigate('/dashboard/calendar', { state: { date: dateStr, view: 'day' } })}
              />
            </div>
            
            {/* Quick Stats Card */}
            <div className="relative overflow-hidden rounded-xl p-5 bg-white border border-gray-100/80 shadow-sm">
              <div className="relative flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-huttle-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Content Stats</h3>
                  <p className="text-gray-500 text-xs">This week</p>
                </div>
              </div>
              
              <div className="relative space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                  <span className="text-gray-600 text-sm font-medium">Scheduled</span>
                  <span className="text-xl font-bold text-gray-900">{sortedPosts.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-huttle-50/30 rounded-xl border border-huttle-100/50">
                  <span className="text-huttle-primary text-sm font-medium">This Week</span>
                  <span className="text-xl font-bold text-huttle-primary">
                    {sortedPosts.filter(p => {
                      if (!p.scheduledDate) return false;
                      const postDate = new Date(p.scheduledDate);
                      const today = new Date();
                      const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 6);
                      return postDate >= weekStart && postDate <= weekEnd;
                    }).length}
                  </span>
                </div>
                <button
                  onClick={() => setIsCreatePostOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Quick Schedule
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming Posts */}
          <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100/80 shadow-sm">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-huttle-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Upcoming Posts</h2>
                    <p className="text-xs text-gray-500">{sortedPosts.length} scheduled</p>
                  </div>
                </div>
                <Link to="/dashboard/calendar" className="flex items-center gap-1 text-huttle-primary text-sm font-semibold hover:text-huttle-primary-dark transition-colors group">
                  View Calendar
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              
              {sortedPosts.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">No posts scheduled</h3>
                  <p className="text-sm text-gray-500 mb-4">Create your first post to get started</p>
                  <button 
                    onClick={() => setIsCreatePostOpen(true)} 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-huttle-gradient hover:bg-huttle-primary-dark text-white rounded-xl font-semibold text-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Schedule Post
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedPosts.slice(0, 5).map((post, idx) => (
                    <HoverPreview
                      key={post.id}
                      preview={
                        <div className="space-y-2">
                          <h4 className="font-semibold text-gray-900">{post.title}</h4>
                          {post.caption && <p className="text-sm text-gray-600 line-clamp-3">{post.caption}</p>}
                        </div>
                      }
                    >
                      <div 
                        className="group flex items-center justify-between p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all cursor-pointer"
                        onClick={() => navigate('/dashboard/calendar', { state: { date: post.scheduledDate, view: 'day' } })}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-huttle-primary transition-colors">
                            {post.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {post.scheduledDate} at {formatTo12Hour(post.scheduledTime)}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                              {(post.platforms?.[0] ?? 'No platform')}{(post.platforms?.length ?? 0) > 1 ? ` +${(post.platforms?.length ?? 0) - 1}` : ''}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </HoverPreview>
                  ))}
                  {sortedPosts.length > 5 && (
                    <Link to="/dashboard/calendar" className="block text-center text-sm text-huttle-primary font-semibold pt-2 hover:underline">
                      View all {sortedPosts.length} posts →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Trending & Insights */}
        <div className="space-y-6">
          {/* Trending Now */}
          <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100/80 shadow-sm">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-huttle-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Trending Now</h2>
                    <p className="text-xs text-gray-500">
                      {hasNicheConfigured
                        ? `Hot topics in ${normalizedNiche || normalizedIndustry}`
                        : 'General trends across platforms'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRefreshDashboard}
                  disabled={isDashboardRefreshing}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh daily briefing"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDashboardRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {!hasProfilePersonalization && (
                <div className="bg-huttle-50/50 border border-huttle-100 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-huttle-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Personalize Your Feed</p>
                      <p className="text-xs text-gray-600 mb-2">Set up your brand voice for tailored trends.</p>
                      <Link to="/dashboard/brand-voice" className="inline-flex items-center gap-1 text-xs font-semibold text-huttle-primary hover:text-huttle-primary-dark group">
                        Setup Brand Voice
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {isDashboardLoading && (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((item) => (
                      <div key={item} className="animate-pulse p-3 border border-gray-100 rounded-xl">
                        <div className="h-4 w-2/3 bg-gray-200 rounded mb-2" />
                        <div className="h-3 w-full bg-gray-100 rounded mb-1" />
                        <div className="h-3 w-5/6 bg-gray-100 rounded" />
                      </div>
                    ))}
                  </div>
                )}

                {!isDashboardLoading && dashboardError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                    <p className="text-sm text-red-700 mb-3">{dashboardError}</p>
                    <button
                      onClick={handleRefreshDashboard}
                      className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Try Again
                    </button>
                  </div>
                )}

                {!isDashboardLoading && !dashboardError && dashboardTrendingTopics.map((trend, index) => {
                  const momentumStyles = getMomentumStyles(trend.momentum);
                  return (
                    <div
                      key={`${trend.topic}-${index}`}
                      className="rounded-xl border border-gray-100 p-3 hover:border-gray-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-gray-900">{trend.topic}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${momentumStyles.bgClass} ${momentumStyles.textClass}`}>
                          <span>{momentumStyles.indicator}</span>
                          <span className="capitalize">{trend.momentum}</span>
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{trend.context}</p>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
                        {getPlatformIcon(trend.relevant_platform, 'w-3.5 h-3.5 text-gray-700')}
                        <span className="text-[11px] text-gray-700 font-medium">{trend.relevant_platform || 'Multi-platform'}</span>
                      </div>
                    </div>
                  );
                })}

                {!isDashboardLoading && !dashboardError && dashboardTrendingTopics.length === 0 && (
                  <div className="p-3 text-xs text-gray-500 rounded-xl border border-gray-100">
                    No trend intelligence is available yet. Try refreshing.
                  </div>
                )}
              </div>

              <Link 
                to="/dashboard/trend-lab" 
                className="mt-4 w-full py-2.5 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm"
              >
                <Beaker className="w-4 h-4" />
                Explore Trend Lab
              </Link>
            </div>
          </div>

          {/* AI Insights */}
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
                <div className="animate-pulse rounded-xl border border-gray-100 p-4">
                  <div className="h-4 w-3/4 bg-gray-200 rounded mb-3" />
                  <div className="h-3 w-full bg-gray-100 rounded mb-2" />
                  <div className="h-3 w-5/6 bg-gray-100 rounded" />
                </div>
              ) : dashboardInsight ? (
                <div className="relative rounded-xl border border-huttle-100 bg-gradient-to-br from-huttle-50/50 to-cyan-50/40 p-4">
                  <span className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${getInsightCategoryStyles(dashboardInsight.category)}`}>
                    {dashboardInsight.category}
                  </span>
                  <h4 className="font-bold text-gray-900 mb-2 pr-20">{dashboardInsight.headline}</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{dashboardInsight.detail}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No daily insight available yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid - Hashtags & Alerts */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hashtags */}
        <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100/80 shadow-sm">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                <Target className="w-5 h-5 text-huttle-primary" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Hashtags of the Day</h2>
                <p className="text-xs text-gray-500">AI-recommended</p>
              </div>
            </div>
            
            {isDashboardLoading ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <Target className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">Generating hashtags...</p>
                <div className="flex flex-wrap justify-center gap-2 mt-3 animate-pulse">
                  <div className="h-7 w-20 bg-gray-100 rounded-full" />
                  <div className="h-7 w-24 bg-gray-100 rounded-full" />
                  <div className="h-7 w-16 bg-gray-100 rounded-full" />
                  <div className="h-7 w-28 bg-gray-100 rounded-full" />
                </div>
              </div>
            ) : dashboardError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm text-red-700 mb-3">{dashboardError}</p>
                <button
                  onClick={handleRefreshDashboard}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Again
                </button>
              </div>
            ) : dashboardHashtags.length === 0 && !hasProfilePersonalization ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <Target className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">Set up your profile</p>
                <p className="text-xs text-gray-500 mb-3">Complete your brand voice to get personalized hashtags</p>
                <Link to="/dashboard/brand-voice" className="inline-flex items-center gap-1 text-xs font-semibold text-huttle-primary hover:text-huttle-primary-dark">
                  Setup Brand Voice
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <>
                {dashboardHashtags.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No hashtag recommendations right now. Check back in a moment.</p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-3">Tap a hashtag to copy it.</p>
                    <div className="flex flex-wrap gap-2">
                    {dashboardHashtags.map((keyword, i) => {
                      const isCopied = copiedHashtag === keyword.hashtag;
                      const reachStyles = getReachStyles(keyword.estimated_reach);
                      return (
                        <div
                          key={i}
                          onClick={() => copyHashtag(keyword.hashtag)}
                          className={`group inline-flex items-center gap-2 border border-gray-200 rounded-full bg-white hover:bg-gray-50 transition-all cursor-pointer ${reachStyles.sizeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${reachStyles.dotClass}`} />
                          <span className="font-medium text-gray-700 group-hover:text-gray-900">{keyword.hashtag}</span>
                          <span className="text-[10px] text-gray-500">{keyword.relevance}</span>
                          <span className="text-[10px] font-semibold uppercase text-gray-500">{keyword.estimated_reach}</span>
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </div>
                      );
                    })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Daily Alerts */}
        <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100/80 shadow-sm">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                <Bell className="w-5 h-5 text-huttle-primary" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Daily Alerts</h2>
                <p className="text-xs text-gray-500">Important updates</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {isAlertsLoading && (
                <div className="space-y-2">
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
                  <p className="text-xs text-gray-600 mb-2">
                    No alerts yet. We will surface important platform updates here.
                  </p>
                  <Link to="/dashboard/social-updates" className="inline-flex items-center gap-1 text-xs font-semibold text-huttle-primary hover:text-huttle-primary-dark">
                    Open Social Updates
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {!isAlertsLoading && dashboardAlerts.map((alert) => {
                const impact = String(alert.impact_level || 'medium').toLowerCase();
                const typeColor = impact === 'high'
                  ? 'bg-red-100 text-red-700'
                  : impact === 'low'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-amber-100 text-amber-700';

                return (
                  <div key={alert.id} className="p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <h4 className="font-semibold text-sm text-gray-900">{alert.update_title || 'Platform update'}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold ${typeColor}`}>{impact}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{alert.update_summary || 'A new social platform update is available.'}</p>
                    <Link to="/dashboard/social-updates" className="text-xs font-semibold text-huttle-primary hover:text-huttle-primary-dark flex items-center gap-1 group">
                      View Update
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
      <FloatingActionButton onCreatePost={() => setIsCreatePostOpen(true)} />
    </div>
  );
}
