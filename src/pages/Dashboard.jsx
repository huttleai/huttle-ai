import { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useBrand } from '../context/BrandContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  TrendingUp,
  Target,
  Bell,
  BarChart3,
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
  Check
} from 'lucide-react';
import CreatePostModal from '../components/CreatePostModal';
import FloatingActionButton from '../components/FloatingActionButton';
import HoverPreview from '../components/HoverPreview';
import MiniCalendar from '../components/MiniCalendar';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import GuidedTour from '../components/GuidedTour';
import { AIDisclaimerTooltip, AIDisclaimerFooter, HowWePredictModal } from '../components/AIDisclaimer';
import { socialUpdates } from '../data/socialUpdates';
import { formatTo12Hour } from '../utils/timeFormatter';
import { shouldResetAIUsage } from '../utils/aiUsageHelpers';
import { getPersonalizedGreeting, isCreatorProfile } from '../utils/brandContextBuilder';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const { scheduledPosts, deleteScheduledPost } = useContent();
  const navigate = useNavigate();
  const { brandProfile } = useBrand();
  const { showToast } = useToast();
  const { 
    addInfo, 
    addPanelUpdate, 
    addAIUsageWarning, 
    addSocialUpdate,
    addScheduledPostReminder,
  } = useNotifications();
  const { userTier, getFeatureLimit } = useSubscription();
  const [aiGensUsed, setAiGensUsed] = useState(0);
  const [aiGensLimit, setAiGensLimit] = useState(Infinity);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [showHowWePredictModal, setShowHowWePredictModal] = useState(false);
  const [timeGreeting, setTimeGreeting] = useState('');
  const [hoveredStat, setHoveredStat] = useState(null);
  const [hoveredTrend, setHoveredTrend] = useState(null);
  const [copiedHashtag, setCopiedHashtag] = useState(null);
  
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

  // Get personalized greeting based on profile type
  const isCreator = isCreatorProfile(brandProfile);
  const personalizedGreeting = getPersonalizedGreeting(
    brandProfile, 
    user?.user_metadata?.name || user?.user_metadata?.full_name || user?.name || user?.email?.split('@')[0] || 'Creator'
  );
  
  // AI Insights - all use blue theme for consistency
  const aiInsights = [
    { title: 'Pattern Detected', description: 'Posts with questions get 25% more engagement', icon: Sparkles, color: 'from-blue-500 to-cyan-500' },
    { title: 'Best Time Found', description: 'Tuesday 7 PM EST drives highest engagement', icon: Clock, color: 'from-cyan-500 to-blue-500' },
    { title: 'Content Gap Found', description: 'Add more video content - 60% higher engagement', icon: BarChart3, color: 'from-blue-600 to-cyan-500' },
  ];
  
  // Track previous values for detecting updates
  const prevPanelDataRef = useRef({
    trendingTopics: null,
    keywords: null,
    aiInsights: null,
    scheduledPostsCount: 0,
    lastSocialUpdateCheck: null,
  });

  // Guided tour steps
  const tourSteps = [
    {
      title: 'Welcome to Huttle AI!',
      content: 'Let\'s take a quick tour to help you get started.',
      icon: Sparkles,
      tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
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
    const lastCheck = localStorage.getItem('lastSocialUpdateCheck');
    const now = Date.now();
    const checkInterval = 14 * 24 * 60 * 60 * 1000;
    
    if (!lastCheck || (now - parseInt(lastCheck, 10)) > checkInterval) {
      const mostRecent = socialUpdates[0];
      if (mostRecent) {
        const lastNotified = localStorage.getItem('lastNotifiedSocialUpdate');
        if (lastNotified !== mostRecent.id) {
          addSocialUpdate(mostRecent.platform, mostRecent.title, mostRecent.impact);
          localStorage.setItem('lastNotifiedSocialUpdate', mostRecent.id);
        }
      }
      localStorage.setItem('lastSocialUpdateCheck', now.toString());
    }
  }, [addSocialUpdate]);

  // Sort posts by date
  const sortedPosts = [...scheduledPosts].sort((a, b) => {
    const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
    const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
    return dateA - dateB;
  });

  // Calculate posting streak (consecutive days with scheduled posts starting from today)
  const postingStreak = useMemo(() => {
    if (scheduledPosts.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get unique dates with posts
    const datesWithPosts = new Set(
      scheduledPosts.map(post => post.scheduledDate)
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
    scheduledPosts.forEach(post => {
      post.platforms?.forEach(p => platforms.add(p));
    });
    return platforms.size;
  }, [scheduledPosts]);

  // Trending topics
  const trendingTopics = useMemo(() => {
    const industry = brandProfile?.industry?.toLowerCase() || '';
    const niche = brandProfile?.niche?.toLowerCase() || '';
    
    const trendsByIndustry = {
      'medical spa': [
        { topic: 'Preventative Aesthetics Trend', engagement: '2.4M posts', growth: '+45%' },
        { topic: 'Non-Invasive Treatments', engagement: '1.8M posts', growth: '+67%' },
        { topic: 'Wellness Wednesday Tips', engagement: '3.2M posts', growth: '+23%' },
        { topic: 'Skin Care Technology', engagement: '987K posts', growth: '+89%' },
        { topic: '#GlowUp2024', engagement: '1.5M posts', growth: '+34%' },
      ],
      'beauty': [
        { topic: 'Clean Beauty Movement', engagement: '2.4M posts', growth: '+45%' },
        { topic: 'Skincare Routines', engagement: '1.8M posts', growth: '+67%' },
        { topic: 'Makeup Tutorials', engagement: '3.2M posts', growth: '+23%' },
        { topic: 'Beauty Tech Innovation', engagement: '987K posts', growth: '+89%' },
        { topic: '#BeautyTips', engagement: '1.5M posts', growth: '+34%' },
      ],
      'tech': [
        { topic: 'AI Integration', engagement: '2.4M posts', growth: '+45%' },
        { topic: 'Cybersecurity Trends', engagement: '1.8M posts', growth: '+67%' },
        { topic: 'Remote Work Tools', engagement: '3.2M posts', growth: '+23%' },
        { topic: 'Cloud Computing', engagement: '987K posts', growth: '+89%' },
        { topic: '#TechForGood', engagement: '1.5M posts', growth: '+34%' },
      ]
    };
    
    const defaultTrends = [
      { topic: 'Social Media Strategy 2024', engagement: '2.4M posts', growth: '+45%' },
      { topic: 'Content Creation Tips', engagement: '1.8M posts', growth: '+67%' },
      { topic: 'Digital Marketing Trends', engagement: '3.2M posts', growth: '+23%' },
      { topic: 'Personal Branding', engagement: '987K posts', growth: '+89%' },
      { topic: '#GrowthMindset', engagement: '1.5M posts', growth: '+34%' },
      { topic: 'Influencer Marketing', engagement: '2.1M posts', growth: '+38%' },
      { topic: 'Video Content Strategy', engagement: '1.9M posts', growth: '+56%' },
      { topic: 'Community Building', engagement: '1.4M posts', growth: '+69%' },
      { topic: 'SEO Best Practices', engagement: '1.6M posts', growth: '+42%' },
      { topic: 'Analytics & Insights', engagement: '1.2M posts', growth: '+51%' },
    ];
    
    const industryTrends = trendsByIndustry[industry] || trendsByIndustry[niche] || [];
    
    if (industryTrends.length > 0) {
      return industryTrends.slice(0, 10);
    }
    return defaultTrends.slice(0, 10);
  }, [brandProfile?.industry, brandProfile?.niche]);

  // Hashtags
  const keywords = useMemo(() => {
    const industry = brandProfile?.industry?.toLowerCase() || '';
    const niche = brandProfile?.niche?.toLowerCase() || '';
    
    const hashtagsByIndustry = {
      'medical spa': [
        { tag: '#medspa', score: '95%' },
        { tag: '#botox', score: '89%' },
        { tag: '#skincareroutine', score: '85%' },
        { tag: '#glowup', score: '82%' },
      ],
      'beauty': [
        { tag: '#beauty', score: '95%' },
        { tag: '#makeup', score: '91%' },
        { tag: '#skincare', score: '87%' },
        { tag: '#beautytips', score: '84%' },
      ],
      'tech': [
        { tag: '#technology', score: '94%' },
        { tag: '#ai', score: '92%' },
        { tag: '#innovation', score: '88%' },
        { tag: '#technews', score: '85%' },
      ]
    };
    
    const defaultHashtags = [
      { tag: '#socialmedia', score: '93%' },
      { tag: '#marketing', score: '88%' },
      { tag: '#contentcreation', score: '85%' },
      { tag: '#business', score: '82%' },
    ];
    
    const industryHashtags = hashtagsByIndustry[industry] || hashtagsByIndustry[niche] || [];
    
    if (industryHashtags.length > 0) {
      return industryHashtags.slice(0, 4);
    }
    return defaultHashtags.slice(0, 4);
  }, [brandProfile?.industry, brandProfile?.niche]);

  // Monitor panel updates
  useEffect(() => {
    const checkPanelUpdates = () => {
      const prev = prevPanelDataRef.current;
      
      if (prev.scheduledPostsCount !== scheduledPosts.length) {
        if (scheduledPosts.length > prev.scheduledPostsCount) {
          const sorted = [...scheduledPosts].sort((a, b) => {
            const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
            const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
            return dateA - dateB;
          });
          const nextPost = sorted[0];
          if (nextPost) {
            const nextPostTime = `${nextPost.scheduledDate} at ${nextPost.scheduledTime}`;
            addScheduledPostReminder(scheduledPosts.length, nextPostTime);
          }
        }
        prev.scheduledPostsCount = scheduledPosts.length;
      }
    };

    checkPanelUpdates();
    const interval = setInterval(checkPanelUpdates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [scheduledPosts, addScheduledPostReminder]);

  // Welcome notification
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => {
        addInfo(
          'Welcome to Huttle AI!',
          'Your AI-powered social media assistant is ready. Create your first post to get started!',
          () => setIsCreatePostOpen(true),
          'Create Post'
        );
        localStorage.setItem('hasSeenWelcome', 'true');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [addInfo]);

  const handleDeletePost = (postId) => {
    if (window.confirm('Are you sure you want to delete this scheduled post?')) {
      deleteScheduledPost(postId);
      showToast('Post deleted successfully', 'success');
    }
  };

  // Build display name - for creators, use first name; for brands, use brand name
  const displayName = isCreator 
    ? personalizedGreeting.name
    : brandProfile?.brandName || user?.user_metadata?.name || user?.user_metadata?.full_name || user?.name || user?.email?.split('@')[0] || 'Creator';

  // Stats configuration - all use blue/cyan theme matching logo
  const stats = [
    { 
      label: 'Scheduled', 
      value: sortedPosts.length, 
      icon: Calendar, 
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-600'
    },
    { 
      label: 'Streak', 
      value: postingStreak, 
      icon: Flame, 
      subtext: postingStreak === 1 ? 'day' : 'days', 
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-500/10',
      textColor: 'text-cyan-600'
    },
    { 
      label: 'Next Post', 
      value: nextPostInfo.display, 
      icon: Clock, 
      badge: nextPostInfo.badge, 
      color: 'from-blue-600 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-600'
    },
    { 
      label: 'Platforms', 
      value: activePlatforms, 
      icon: Target, 
      color: 'from-cyan-600 to-blue-500',
      bgColor: 'bg-cyan-500/10',
      textColor: 'text-cyan-600'
    },
  ];

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/50 ml-0 lg:ml-64 pt-16 px-4 sm:px-6 lg:px-8 pb-12">
      {/* Subtle background pattern - blue theme only */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-500/5 via-cyan-500/3 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-cyan-500/5 via-blue-500/3 to-transparent rounded-full blur-3xl" />
      </div>
      
      <GuidedTour steps={tourSteps} storageKey="dashboardTour" />

      {/* Welcome Header */}
      <div className="relative mb-8 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="animate-fadeIn">
            {isCreator ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Active Now</span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                  {personalizedGreeting.shortMessage} <span className="animate-wave inline-block">👋</span>
                </h1>
                <p className="text-gray-500 mt-2 text-sm sm:text-base">
                  Ready to create something amazing today?
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">{timeGreeting}</p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                  {displayName}
                </h1>
                <p className="text-gray-500 mt-2 text-sm sm:text-base">
                  Here's what's happening with your content today.
                </p>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCreatePostOpen(true)}
              className="group relative inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>New Post</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview - Bento Style */}
      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div 
            key={stat.label}
            className={`group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-4 sm:p-5 transition-all duration-300 cursor-pointer ${
              hoveredStat === idx ? 'shadow-xl scale-[1.02] border-gray-200' : 'shadow-sm hover:shadow-lg'
            }`}
            onMouseEnter={() => setHoveredStat(idx)}
            onMouseLeave={() => setHoveredStat(null)}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Gradient accent on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            
            {/* Top accent line */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                {stat.badge && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${stat.bgColor} ${stat.textColor}`}>
                    {stat.badge}
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">{stat.label}</p>
              {stat.subtext && <p className="text-[10px] text-gray-400 mt-0.5">{stat.subtext}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Calendar & Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MiniCalendar 
              onDateClick={(dateStr) => navigate('/calendar', { state: { date: dateStr, view: 'day' } })}
            />
            
            {/* Quick Stats Card */}
            <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-white border border-gray-100 shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />
              
              <div className="relative flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Content Stats</h3>
                  <p className="text-gray-500 text-xs">This week</p>
                </div>
              </div>
              
              <div className="relative space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 text-sm font-medium">Scheduled</span>
                  <span className="text-xl font-bold text-gray-900">{sortedPosts.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100/50">
                  <span className="text-blue-700 text-sm font-medium">This Week</span>
                  <span className="text-xl font-bold text-blue-600">
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30"
                >
                  <Plus className="w-4 h-4" />
                  Quick Schedule
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming Posts */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Upcoming Posts</h2>
                    <p className="text-xs text-gray-500">{sortedPosts.length} scheduled</p>
                  </div>
                </div>
                <Link to="/calendar" className="flex items-center gap-1 text-blue-600 text-sm font-semibold hover:text-blue-700 transition-colors group">
                  View Calendar
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              
              {sortedPosts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-7 h-7 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">No posts scheduled</h3>
                  <p className="text-sm text-gray-500 mb-5">Create your first post to get started</p>
                  <button 
                    onClick={() => setIsCreatePostOpen(true)} 
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/25"
                  >
                    <Plus className="w-4 h-4" />
                    Schedule Post
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedPosts.slice(0, 4).map((post, idx) => (
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
                        className="group flex items-center justify-between p-4 bg-gray-50 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => navigate('/calendar', { state: { date: post.scheduledDate, view: 'day' } })}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {post.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {post.scheduledDate} at {formatTo12Hour(post.scheduledTime)}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                              {post.platforms[0]}{post.platforms.length > 1 ? ` +${post.platforms.length - 1}` : ''}
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
                  {sortedPosts.length > 4 && (
                    <Link to="/calendar" className="block text-center text-sm text-blue-600 font-semibold pt-2 hover:underline">
                      View all {sortedPosts.length} posts →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Trending */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm h-fit">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Trending Now</h2>
                <p className="text-xs text-gray-500">Hot in your niche</p>
              </div>
            </div>
            
            {(!brandProfile?.industry && !brandProfile?.niche) && (
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Personalize Your Feed</p>
                    <p className="text-xs text-gray-600 mb-2">Set up your brand voice for tailored trends.</p>
                    <Link to="/brand-voice" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 group">
                      Setup Brand Voice
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              {trendingTopics.map((item, i) => (
                <button 
                  key={i}
                  onClick={() => setIsCreatePostOpen(true)}
                  onMouseEnter={() => setHoveredTrend(i)}
                  onMouseLeave={() => setHoveredTrend(null)}
                  className={`w-full group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                    hoveredTrend === i ? 'bg-gradient-to-r from-violet-50 to-purple-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    i < 3 
                      ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md' 
                      : hoveredTrend === i 
                        ? 'bg-violet-100 text-violet-600' 
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate transition-colors ${
                      hoveredTrend === i ? 'text-violet-700' : 'text-gray-900'
                    }`}>
                      {item.topic}
                    </p>
                    <p className="text-[11px] text-gray-500">{item.engagement}</p>
                  </div>
                  <span className={`text-xs font-bold text-emerald-600 transition-opacity ${
                    hoveredTrend === i ? 'opacity-100' : 'opacity-0'
                  }`}>
                    {item.growth}
                  </span>
                </button>
              ))}
            </div>
            
            <Link 
              to="/trend-lab" 
              className="mt-4 w-full py-3 flex items-center justify-center gap-2 border-2 border-violet-200 text-violet-700 font-semibold rounded-xl hover:bg-violet-50 hover:border-violet-300 transition-all text-sm"
            >
              <Beaker className="w-4 h-4" />
              Explore Trend Lab
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Hashtags */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <AIDisclaimerTooltip phraseIndex={1} position="right">
                  <h2 className="font-bold text-gray-900">Hashtags of the Day</h2>
                </AIDisclaimerTooltip>
                <p className="text-xs text-gray-500">AI-recommended</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {keywords.map((keyword, i) => {
                const isCopied = copiedHashtag === keyword.tag;
                return (
                  <div 
                    key={i} 
                    onClick={() => copyHashtag(keyword.tag)}
                    className="group flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 hover:shadow-md border border-transparent hover:border-blue-100 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-semibold text-blue-600 text-sm group-hover:text-blue-700">{keyword.tag}</span>
                      {isCopied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">{keyword.score}</span>
                  </div>
                );
              })}
            </div>
            <AIDisclaimerFooter phraseIndex={1} className="mt-4" onModalOpen={() => setShowHowWePredictModal(true)} />
          </div>
        </div>

        {/* Daily Alerts */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
          
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Daily Alerts</h2>
                <p className="text-xs text-gray-500">Important updates</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {[
                { type: 'high', title: 'Sustainability Trends', desc: 'Growing interest in eco-friendly practices', action: 'Create Post', typeColor: 'bg-blue-100 text-blue-700' },
                { type: 'medium', title: 'Engagement Spike', desc: 'Reels getting 40% more views', action: 'Post More', typeColor: 'bg-cyan-100 text-cyan-700' },
              ].map((alert, i) => (
                <div key={i} className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100/50 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm text-gray-900">{alert.title}</h4>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold ${alert.typeColor}`}>{alert.type}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{alert.desc}</p>
                  <button onClick={() => setIsCreatePostOpen(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                    {alert.action}
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <AIDisclaimerTooltip phraseIndex={2} position="right">
                  <h2 className="font-bold text-gray-900">AI Insights</h2>
                </AIDisclaimerTooltip>
                <p className="text-xs text-gray-500">Smart recommendations</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {aiInsights.map((insight, i) => (
                <div key={i} className="group p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100/50 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${insight.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <insight.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">{insight.title}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <AIDisclaimerFooter phraseIndex={2} className="mt-4" onModalOpen={() => setShowHowWePredictModal(true)} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
      <FloatingActionButton onCreatePost={() => setIsCreatePostOpen(true)} />
      <HowWePredictModal isOpen={showHowWePredictModal} onClose={() => setShowHowWePredictModal(false)} />
    </div>
  );
}
