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
  Flame
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
  const [greeting, setGreeting] = useState('');
  
  // Generate greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);
  
  // AI Insights
  const aiInsights = [
    { title: 'Pattern Detected', description: 'Posts with questions get 25% more engagement', icon: Sparkles },
    { title: 'Best Time Found', description: 'Tuesday 7 PM EST drives highest engagement', icon: Clock },
    { title: 'Content Gap Found', description: 'Add more video content - 60% higher engagement', icon: BarChart3 },
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
        { topic: 'Anti-Aging Solutions', engagement: '1.9M posts', growth: '+52%' },
        { topic: 'Laser Treatments Guide', engagement: '876K posts', growth: '+71%' },
        { topic: 'Recovery & Aftercare', engagement: '2.1M posts', growth: '+28%' },
        { topic: 'Patient Success Stories', engagement: '1.3M posts', growth: '+63%' },
        { topic: 'Seasonal Skin Care', engagement: '945K posts', growth: '+39%' },
      ],
      'beauty': [
        { topic: 'Clean Beauty Movement', engagement: '2.4M posts', growth: '+45%' },
        { topic: 'Skincare Routines', engagement: '1.8M posts', growth: '+67%' },
        { topic: 'Makeup Tutorials', engagement: '3.2M posts', growth: '+23%' },
        { topic: 'Beauty Tech Innovation', engagement: '987K posts', growth: '+89%' },
        { topic: '#BeautyTips', engagement: '1.5M posts', growth: '+34%' },
        { topic: 'Sustainable Beauty', engagement: '2.2M posts', growth: '+41%' },
        { topic: 'Vegan Beauty Products', engagement: '1.4M posts', growth: '+55%' },
        { topic: 'Natural Hair Care', engagement: '1.7M posts', growth: '+33%' },
        { topic: 'Beauty Hacks & Tricks', engagement: '2.8M posts', growth: '+27%' },
        { topic: 'DIY Beauty Treatments', engagement: '1.1M posts', growth: '+72%' },
      ],
      'tech': [
        { topic: 'AI Integration', engagement: '2.4M posts', growth: '+45%' },
        { topic: 'Cybersecurity Trends', engagement: '1.8M posts', growth: '+67%' },
        { topic: 'Remote Work Tools', engagement: '3.2M posts', growth: '+23%' },
        { topic: 'Cloud Computing', engagement: '987K posts', growth: '+89%' },
        { topic: '#TechForGood', engagement: '1.5M posts', growth: '+34%' },
        { topic: 'Blockchain Applications', engagement: '1.6M posts', growth: '+58%' },
        { topic: 'Sustainable Tech', engagement: '892K posts', growth: '+76%' },
        { topic: 'Quantum Computing', engagement: '734K posts', growth: '+91%' },
        { topic: 'Edge Computing', engagement: '1.2M posts', growth: '+44%' },
        { topic: 'Digital Transformation', engagement: '2.5M posts', growth: '+31%' },
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

  const displayName = brandProfile?.businessName || user?.name || user?.email?.split('@')[0] || 'Creator';

  return (
    <div className="flex-1 min-h-screen bg-white ml-0 lg:ml-64 pt-16 px-6 lg:px-8 pb-12">
      <GuidedTour steps={tourSteps} storageKey="dashboardTour" />

      {/* Welcome Header */}
      <div className="mb-8 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="fade-in">
            <p className="text-gray-500 text-sm font-medium mb-1">{greeting}</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
              {displayName}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Here's what's happening with your content today.
            </p>
          </div>
          
          <div className="flex items-center gap-3 slide-in-right">
            <button 
              onClick={() => setIsCreatePostOpen(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              New Post
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Scheduled', value: sortedPosts.length, icon: Calendar, badge: 'Active' },
          { label: 'Streak', value: postingStreak, icon: Flame, subtext: postingStreak === 1 ? 'day' : 'days' },
          { label: 'Next Post', value: nextPostInfo.display, icon: Clock, badge: nextPostInfo.badge },
          { label: 'Platforms', value: activePlatforms, icon: Target, badge: activePlatforms > 0 ? 'Active' : null },
        ].map((stat, idx) => (
          <div 
            key={stat.label}
            className="card hover-lift p-5 stagger-item"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-huttle-cyan-light flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-huttle-blue" />
              </div>
              {stat.badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-huttle-cyan-light text-huttle-blue">
                  {stat.badge}
                </span>
              )}
            </div>
            <p className="text-xl font-semibold text-gray-900 count-up">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
            {stat.subtext && <p className="text-[10px] text-gray-400 mt-0.5">{stat.subtext}</p>}
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar & Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MiniCalendar 
              onDateClick={(dateStr) => navigate('/calendar', { state: { date: dateStr, view: 'day' } })}
            />
            
            {/* Quick Stats */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-huttle-cyan-light flex items-center justify-center">
                  <Zap className="w-4 h-4 text-huttle-blue" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Content Stats</h3>
                  <p className="text-gray-500 text-xs">This week</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Scheduled</span>
                  <span className="text-xl font-semibold text-gray-900">{sortedPosts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">This Week</span>
                  <span className="text-lg font-medium text-huttle-blue">
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
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setIsCreatePostOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-huttle-blue hover:bg-huttle-blue-dark text-white rounded-lg font-medium text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Quick Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Posts */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-huttle-cyan-light flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-huttle-blue" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Upcoming Posts</h2>
                  <p className="text-xs text-gray-500">{sortedPosts.length} scheduled</p>
                </div>
              </div>
              <Link to="/calendar" className="flex items-center gap-1 text-huttle-blue text-sm font-medium hover-arrow">
                View Calendar
                <ChevronRight className="w-4 h-4 arrow-icon" />
              </Link>
            </div>
            
            {sortedPosts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-gray-300" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">No posts scheduled</h3>
                <p className="text-sm text-gray-500 mb-4">Create your first post to get started</p>
                <button onClick={() => setIsCreatePostOpen(true)} className="btn-primary">
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
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Platforms:</span>
                            <span className="font-medium">{post.platforms.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <div 
                      className="group p-4 bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 hover:bg-white hover:shadow-soft transition-all cursor-pointer stagger-item"
                      onClick={() => navigate('/calendar', { state: { date: post.scheduledDate, view: 'day' } })}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate group-hover:text-huttle-blue transition-colors">
                            {post.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {post.scheduledDate} at {formatTo12Hour(post.scheduledTime)}
                            </span>
                            <span className="badge badge-cyan">
                              {post.platforms[0]}{post.platforms.length > 1 ? ` +${post.platforms.length - 1}` : ''}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </HoverPreview>
                ))}
                {sortedPosts.length > 4 && (
                  <Link to="/calendar" className="block text-center text-sm text-huttle-blue font-medium pt-2 hover:underline">
                    View all {sortedPosts.length} posts →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Trending */}
        <div className="card p-6 h-fit">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-huttle-cyan-light flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-huttle-blue" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Trending Now</h2>
                <p className="text-xs text-gray-500">Hot in your niche</p>
              </div>
            </div>
          </div>
          
          {(!brandProfile?.industry && !brandProfile?.niche) && (
            <div className="bg-huttle-cyan-light border border-huttle-cyan/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-huttle-blue flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Personalize Your Feed</p>
                  <p className="text-xs text-gray-600 mb-2">Set up your brand voice for tailored trends.</p>
                  <Link to="/brand-voice" className="inline-flex items-center gap-1 text-xs font-medium text-huttle-blue hover-arrow">
                    Setup Brand Voice
                    <ArrowRight className="w-3 h-3 arrow-icon" />
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
                className="w-full group flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-all text-left stagger-item"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="w-6 h-6 rounded bg-gray-100 group-hover:bg-huttle-cyan-light flex items-center justify-center text-[10px] font-semibold text-gray-400 group-hover:text-huttle-blue transition-colors">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-huttle-blue transition-colors truncate">
                    {item.topic}
                  </p>
                  <p className="text-[11px] text-gray-500">{item.engagement}</p>
                </div>
                <span className="text-[11px] font-semibold text-huttle-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.growth}
                </span>
              </button>
            ))}
          </div>
          
          <Link to="/trend-lab" className="mt-4 w-full btn-secondary py-2.5 text-sm flex items-center justify-center gap-2">
            <Beaker className="w-4 h-4" />
            Explore Trend Lab
          </Link>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Hashtags */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-huttle-cyan-light flex items-center justify-center">
              <Target className="w-4 h-4 text-huttle-cyan" />
            </div>
            <div>
              <AIDisclaimerTooltip phraseIndex={1} position="right">
                <h2 className="font-semibold text-gray-900">Hashtags of the Day</h2>
              </AIDisclaimerTooltip>
              <p className="text-xs text-gray-500">AI-recommended</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {keywords.map((keyword, i) => (
              <div key={i} className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-white hover:shadow-soft border border-transparent hover:border-gray-100 transition-all cursor-pointer stagger-item" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="font-medium text-huttle-blue text-sm">{keyword.tag}</span>
                <span className="text-xs bg-huttle-cyan-light text-huttle-cyan px-2 py-0.5 rounded-full font-medium">{keyword.score}</span>
              </div>
            ))}
          </div>
          <AIDisclaimerFooter phraseIndex={1} className="mt-4" onModalOpen={() => setShowHowWePredictModal(true)} />
        </div>

        {/* Daily Alerts */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-huttle-cyan-light flex items-center justify-center">
              <Bell className="w-4 h-4 text-huttle-blue" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Daily Alerts</h2>
              <p className="text-xs text-gray-500">Important updates</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {[
              { type: 'high', title: 'Sustainability Trends', desc: 'Growing interest in eco-friendly practices', action: 'Create Post' },
              { type: 'medium', title: 'Engagement Spike', desc: 'Reels getting 40% more views', action: 'Post More' },
            ].map((alert, i) => (
              <div key={i} className="p-4 rounded-lg border bg-huttle-cyan-light border-huttle-cyan/20 transition-all hover:shadow-soft cursor-pointer stagger-item" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-medium text-sm text-gray-900">{alert.title}</h4>
                  <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-huttle-blue/10 text-huttle-blue">{alert.type}</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{alert.desc}</p>
                <button onClick={() => setIsCreatePostOpen(true)} className="text-xs font-medium text-huttle-blue hover:underline">{alert.action} →</button>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-huttle-cyan-light flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-huttle-blue" />
            </div>
            <div>
              <AIDisclaimerTooltip phraseIndex={2} position="right">
                <h2 className="font-semibold text-gray-900">AI Insights</h2>
              </AIDisclaimerTooltip>
              <p className="text-xs text-gray-500">Smart recommendations</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {aiInsights.map((insight, i) => (
              <div key={i} className="p-4 rounded-lg border bg-huttle-cyan-light border-huttle-cyan/20 transition-all hover:shadow-soft cursor-pointer stagger-item" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start gap-3">
                  <insight.icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-huttle-blue" />
                  <div>
                    <h4 className="font-medium text-sm text-gray-900">{insight.title}</h4>
                    <p className="text-xs text-gray-600 mt-0.5">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <AIDisclaimerFooter phraseIndex={2} className="mt-4" onModalOpen={() => setShowHowWePredictModal(true)} />
        </div>
      </div>

      {/* Modals */}
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
      <FloatingActionButton onCreatePost={() => setIsCreatePostOpen(true)} />
      <HowWePredictModal isOpen={showHowWePredictModal} onClose={() => setShowHowWePredictModal(false)} />
    </div>
  );
}
