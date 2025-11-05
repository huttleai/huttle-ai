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
  CheckCircle,
  Plus,
  ArrowRight,
  Eye,
  Trash2,
  Wand2,
  Beaker,
  FolderOpen
} from 'lucide-react';
import StatCard from '../components/StatCard';
import CreatePostModal from '../components/CreatePostModal';
import FloatingActionButton from '../components/FloatingActionButton';
import HoverPreview from '../components/HoverPreview';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import Tooltip from '../components/Tooltip';
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
    addEngagementSpike,
    addScheduledPostReminder,
    addContentInsight
  } = useNotifications();
  const { userTier, getFeatureLimit } = useSubscription();
  const [aiGensUsed, setAiGensUsed] = useState(0);
  const [aiGensLimit, setAiGensLimit] = useState(Infinity);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [showHowWePredictModal, setShowHowWePredictModal] = useState(false);
  
  // Track previous values for detecting updates
  const prevPanelDataRef = useRef({
    trendingTopics: null,
    keywords: null,
    trendForecasts: null,
    aiInsights: null,
    scheduledPostsCount: 0,
    lastSocialUpdateCheck: null,
  });

  // Guided tour steps for first-time users
  const tourSteps = [
    {
      title: 'Welcome to Huttle AI! 🎉',
      content: 'Let\'s take a quick tour to help you get started with your AI-powered social media assistant.',
      icon: Sparkles,
      tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    },
    {
      title: 'Your Dashboard',
      content: 'This is your command center. Here you can see your scheduled posts, trending topics, and AI-powered insights.',
      icon: BarChart3,
      tooltipPosition: { top: '20%', left: '50%', transform: 'translate(-50%, 0)' }
    },
    {
      title: 'AI Tools',
      content: 'Use AI Plan Builder to create content strategies, Trend Lab to discover what\'s hot, and AI Power Tools for instant content generation.',
      icon: Wand2,
      tooltipPosition: { top: '30%', left: '50%', transform: 'translate(-50%, 0)' }
    },
    {
      title: 'Schedule Posts',
      content: 'Create and schedule posts for all your social media platforms. Get AI suggestions for optimal posting times!',
      icon: Calendar,
      tooltipPosition: { top: '40%', left: '50%', transform: 'translate(-50%, 0)' }
    },
    {
      title: 'Content Library',
      content: 'Save all your content assets - images, videos, captions, and hashtags - in one organized place.',
      icon: FolderOpen,
      tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, 0)' }
    },
    {
      title: 'Trending Topics',
      content: 'Stay ahead of the curve! See what\'s trending in your industry and create content that resonates.',
      icon: Beaker,
      tooltipPosition: { top: '60%', left: '50%', transform: 'translate(-50%, 0)' }
    },
    {
      title: 'You\'re All Set! 🚀',
      content: 'Start creating amazing content with AI. Click the + button anytime to schedule a new post!',
      icon: CheckCircle,
      tooltipPosition: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }
  ];

  // Initialize AI usage limits based on subscription tier
  useEffect(() => {
    const aiLimit = getFeatureLimit('aiGenerations');
    setAiGensLimit(aiLimit === -1 ? Infinity : aiLimit);
    
    // Load saved AI usage (in real app, this would come from backend)
    const savedUsage = localStorage.getItem('aiGensUsed');
    if (savedUsage) {
      setAiGensUsed(parseInt(savedUsage, 10));
    }
  }, [userTier, getFeatureLimit]);

  // Check if usage should be reset based on subscription anniversary
  useEffect(() => {
    const lastResetDate = localStorage.getItem('aiUsageLastReset');
    const subscriptionStartDate = user?.subscriptionStartDate;
    
    if (shouldResetAIUsage(subscriptionStartDate, lastResetDate)) {
      // Reset usage
      setAiGensUsed(0);
      localStorage.setItem('aiGensUsed', '0');
      localStorage.setItem('aiUsageLastReset', new Date().toISOString());
      addInfo('AI Usage Reset! 🎉', 'Your monthly AI generation limit has been refreshed.', null, null);
    }
  }, [user, addInfo]);

  // Check AI usage and send warnings
  useEffect(() => {
    if (aiGensLimit !== Infinity && aiGensUsed > 0) {
      const percentage = (aiGensUsed / aiGensLimit) * 100;
      const lastWarning = localStorage.getItem('lastAIUsageWarning');
      const now = Date.now();
      
      // Only warn at thresholds and if not warned recently (within 1 hour)
      if (!lastWarning || (now - parseInt(lastWarning, 10)) > 3600000) {
        if (percentage >= 100 || percentage >= 95 || percentage >= 75) {
          addAIUsageWarning(aiGensUsed, aiGensLimit, Math.round(percentage));
          localStorage.setItem('lastAIUsageWarning', now.toString());
        }
      }
    }
  }, [aiGensUsed, aiGensLimit, addAIUsageWarning]);

  // Check for new social updates (biweekly)
  useEffect(() => {
    const lastCheck = localStorage.getItem('lastSocialUpdateCheck');
    const now = Date.now();
    const checkInterval = 14 * 24 * 60 * 60 * 1000; // 14 days (biweekly)
    
    if (!lastCheck || (now - parseInt(lastCheck, 10)) > checkInterval) {
      // Get the most recent update
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

  // Sort posts by scheduled date/time
  const sortedPosts = [...scheduledPosts].sort((a, b) => {
    const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
    const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
    return dateA - dateB;
  });

  // Get industry-specific trending topics based on brand profile (memoized)
  const trendingTopics = useMemo(() => {
    const industry = brandProfile?.industry?.toLowerCase() || '';
    const niche = brandProfile?.niche?.toLowerCase() || '';
    
    // Industry-specific trends
    const trendsByIndustry = {
      'medical spa': [
        { topic: 'Preventative Aesthetics Trend', engagement: '2.4M posts', growth: '+45%', platforms: 'Instagram, Facebook' },
        { topic: 'Non-Invasive Treatments', engagement: '1.8M posts', growth: '+67%', platforms: 'TikTok, Instagram' },
        { topic: 'Wellness Wednesday Tips', engagement: '3.2M posts', growth: '+23%', platforms: 'Instagram, LinkedIn' },
        { topic: 'Skin Care Technology', engagement: '987K posts', growth: '+89%', platforms: 'Instagram, YouTube' },
        { topic: '#GlowUp2024', engagement: '1.5M posts', growth: '+34%', platforms: 'TikTok, Instagram' }
      ],
      'beauty': [
        { topic: 'Clean Beauty Movement', engagement: '2.4M posts', growth: '+45%', platforms: 'Instagram, TikTok' },
        { topic: 'Skincare Routines', engagement: '1.8M posts', growth: '+67%', platforms: 'All platforms' },
        { topic: 'Makeup Tutorials', engagement: '3.2M posts', growth: '+23%', platforms: 'YouTube, TikTok' },
        { topic: 'Beauty Tech Innovation', engagement: '987K posts', growth: '+89%', platforms: 'Instagram, YouTube' },
        { topic: '#BeautyTips', engagement: '1.5M posts', growth: '+34%', platforms: 'All platforms' }
      ],
      'tech': [
        { topic: 'AI Integration', engagement: '2.4M posts', growth: '+45%', platforms: 'LinkedIn, X' },
        { topic: 'Cybersecurity Trends', engagement: '1.8M posts', growth: '+67%', platforms: 'LinkedIn, X' },
        { topic: 'Remote Work Tools', engagement: '3.2M posts', growth: '+23%', platforms: 'LinkedIn, Instagram' },
        { topic: 'Cloud Computing', engagement: '987K posts', growth: '+89%', platforms: 'LinkedIn, X' },
        { topic: '#TechForGood', engagement: '1.5M posts', growth: '+34%', platforms: 'X, LinkedIn' }
      ]
    };
    
    // Default general trends
    const defaultTrends = [
      { topic: 'Social Media Strategy 2024', engagement: '2.4M posts', growth: '+45%', platforms: 'LinkedIn, X' },
      { topic: 'Content Creation Tips', engagement: '1.8M posts', growth: '+67%', platforms: 'All platforms' },
      { topic: 'Digital Marketing Trends', engagement: '3.2M posts', growth: '+23%', platforms: 'LinkedIn, Instagram' },
      { topic: 'Personal Branding', engagement: '987K posts', growth: '+89%', platforms: 'Instagram, TikTok' },
      { topic: '#GrowthMindset', engagement: '1.5M posts', growth: '+34%', platforms: 'All platforms' }
    ];
    
    // Get industry-specific trends if available
    const industryTrends = trendsByIndustry[industry] || trendsByIndustry[niche] || [];
    
    // Mix industry-specific and general trends
    // Take first 5 from industry, then fill with general if needed
    const mixedTrends = [...industryTrends];
    
    // If we have industry trends, take 3-5 from industry and rest from general
    // If no industry trends, just use general
    if (industryTrends.length > 0) {
      // Take 3 industry trends, 2 general
      const industry = industryTrends.slice(0, 3);
      const general = defaultTrends.slice(0, 2);
      return [...industry, ...general].slice(0, 5);
    } else {
      // No industry data, return general trends
      return defaultTrends.slice(0, 5);
    }
  }, [brandProfile?.industry, brandProfile?.niche]);

  const keywords = useMemo(() => {
    const industry = brandProfile?.industry?.toLowerCase() || '';
    const niche = brandProfile?.niche?.toLowerCase() || '';
    
    // Industry-specific hashtags
    const hashtagsByIndustry = {
      'medical spa': [
        { tag: '#medspa', score: '95%', description: 'Main hashtag for medical spas' },
        { tag: '#botox', score: '89%', description: 'Trending cosmetic treatment' },
        { tag: '#skincareroutine', score: '85%', description: 'High engagement across platforms' },
        { tag: '#glowup', score: '82%', description: 'Consistent engagement across demographics' },
        { tag: '#wellnessjourney', score: '79%', description: 'Rising in wellness communities' }
      ],
      'beauty': [
        { tag: '#beauty', score: '95%', description: 'Main beauty hashtag' },
        { tag: '#makeup', score: '91%', description: 'Trending makeup content' },
        { tag: '#skincare', score: '87%', description: 'High engagement across platforms' },
        { tag: '#beautytips', score: '84%', description: 'Educational content performs well' },
        { tag: '#glowingskin', score: '81%', description: 'Rising in beauty communities' }
      ],
      'tech': [
        { tag: '#technology', score: '94%', description: 'Main tech hashtag' },
        { tag: '#ai', score: '92%', description: 'AI content trending' },
        { tag: '#innovation', score: '88%', description: 'High engagement across platforms' },
        { tag: '#technews', score: '85%', description: 'News content performs well' },
        { tag: '#digital', score: '82%', description: 'Rising in tech communities' }
      ]
    };
    
    // Default general hashtags
    const defaultHashtags = [
      { tag: '#socialmedia', score: '93%', description: 'Main social media hashtag' },
      { tag: '#marketing', score: '88%', description: 'Marketing content trending' },
      { tag: '#contentcreation', score: '85%', description: 'High engagement across platforms' },
      { tag: '#business', score: '82%', description: 'Business content performs well' },
      { tag: '#entrepreneur', score: '79%', description: 'Rising in business communities' }
    ];
    
    // Get industry-specific hashtags if available
    const industryHashtags = hashtagsByIndustry[industry] || hashtagsByIndustry[niche] || [];
    
    // Mix industry-specific and general hashtags
    if (industryHashtags.length > 0) {
      // Take 4 from industry, 3 from general
      const industry = industryHashtags.slice(0, 4);
      const general = defaultHashtags.slice(0, 3);
      return [...industry, ...general].slice(0, 7);
    } else {
      // No industry data, return general hashtags
      return defaultHashtags;
    }
  }, [brandProfile?.industry, brandProfile?.niche]);

  const trendForecasts = useMemo(() => [
    { 
      title: 'Rise of Preventative Aesthetics', 
      timeframe: 'Next 2 weeks', 
      confidence: 85, 
      description: 'Younger clients seeking early treatments',
      details: 'Gen Z and millennials driving demand for preventative skincare and treatments. Focus on education content and early intervention benefits.',
      platforms: 'Instagram, TikTok'
    },
    { 
      title: 'Integration of AI in Skincare', 
      timeframe: '7-10 days', 
      confidence: 78, 
      description: 'AI-powered skin analysis tools',
      details: 'Technology-focused content gaining traction. Showcase your advanced tools and personalized treatment planning.',
      platforms: 'LinkedIn, Instagram'
    },
    { 
      title: 'Sustainable Beauty Products', 
      timeframe: 'Next 3 weeks', 
      confidence: 82, 
      description: 'Eco-friendly packaging demand',
      details: 'Consumers prioritizing sustainability. Highlight your eco-friendly practices, clean ingredients, and sustainable packaging.',
      platforms: 'Instagram, Facebook'
    },
    { 
      title: 'Wellness Content Surge', 
      timeframe: '5-7 days', 
      confidence: 91, 
      description: 'Holistic health approaches',
      details: 'Holistic wellness and self-care content performing exceptionally well. Create content connecting beauty with overall wellbeing.',
      platforms: 'All platforms'
    },
    { 
      title: 'Short-Form Video Dominance', 
      timeframe: 'Next week', 
      confidence: 88, 
      description: 'Reels and Shorts prioritization',
      details: 'Algorithms heavily favoring short-form video. Prioritize creating 15-60 second educational and entertaining videos.',
      platforms: 'TikTok, Instagram, YouTube'
    },
  ], []);

  const aiInsights = useMemo(() => [
    { title: 'Pattern Detected', description: 'Posts with questions get 25% more engagement', icon: Sparkles, color: 'purple' },
    { title: 'Best Posting Time', description: 'Your audience is most active Tuesdays at 7 PM EST', icon: TrendingUp, color: 'blue' },
    { title: 'Content Gap Found', description: 'Add more video content - 60% higher engagement', icon: BarChart3, color: 'green' },
    { title: 'Hashtag Performance', description: 'Industry hashtags outperform generic by 35%', icon: Target, color: 'orange' },
    { title: 'Audience Growth', description: '12% increase in followers this month', icon: CheckCircle, color: 'green' },
    { title: 'Engagement Trend', description: 'Carousel posts drive 2x more saves', icon: Eye, color: 'purple' },
  ], []);

  // Monitor dashboard panel updates
  useEffect(() => {
    const checkPanelUpdates = () => {
      const prev = prevPanelDataRef.current;
      
      // Check trending topics update
      if (prev.trendingTopics !== trendingTopics.length) {
        addPanelUpdate('Trending Topics', 'New trending topics have been updated. Check them out!');
        prev.trendingTopics = trendingTopics.length;
      }
      
      // Check keywords update
      if (prev.keywords !== keywords.length) {
        addPanelUpdate('Keywords of the Day', 'New keyword recommendations are available.');
        prev.keywords = keywords.length;
      }
      
      // Check trend forecasts update
      if (prev.trendForecasts !== trendForecasts.length) {
        addPanelUpdate('Trend Forecaster', 'Updated trend predictions are ready for review.');
        prev.trendForecasts = trendForecasts.length;
      }
      
      // Check AI insights update
      if (prev.aiInsights !== aiInsights.length) {
        addPanelUpdate('AI-Powered Insights', 'New AI insights have been generated for your content.');
        prev.aiInsights = aiInsights.length;
      }
      
      // Check scheduled posts
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

    // Check immediately and then every 5 minutes
    checkPanelUpdates();
    const interval = setInterval(checkPanelUpdates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [trendingTopics, keywords, trendForecasts, aiInsights, scheduledPosts, addPanelUpdate, addScheduledPostReminder]);

  // Simulate engagement spikes (in real app, this would come from analytics)
  useEffect(() => {
    const simulateEngagementSpike = () => {
      const platforms = ['Instagram', 'LinkedIn', 'X', 'TikTok'];
      const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
      const spikePercentage = Math.floor(Math.random() * 50) + 30; // 30-80% increase
      
      // Only show occasionally (10% chance on mount)
      if (Math.random() < 0.1) {
        addEngagementSpike(randomPlatform, spikePercentage, 'Recent Post');
      }
    };

    // Simulate spike check every 30 minutes
    const interval = setInterval(simulateEngagementSpike, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [addEngagementSpike]);

  // Add content insights notifications
  useEffect(() => {
    const insights = [
      {
        title: 'Best Posting Time',
        description: 'Your audience is most active Tuesdays at 7 PM EST',
      },
      {
        title: 'Content Gap Found',
        description: 'Add more video content - 60% higher engagement',
      },
    ];

    // Show random insight every hour
    const showInsight = () => {
      const insight = insights[Math.floor(Math.random() * insights.length)];
      addContentInsight(insight.title, insight.description);
    };

    const interval = setInterval(showInsight, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [addContentInsight]);

  // Show welcome notification for new users
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => {
        addInfo(
          'Welcome to Huttle AI! 👋',
          'Your AI-powered social media assistant is ready. Create your first post or explore trending topics to get started!',
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

  const dailyAlerts = useMemo(() => [
    { type: 'high', title: 'Capitalize on Sustainability Trends', description: 'Growing interest in eco-friendly practices', action: 'Create Post' },
    { type: 'medium', title: 'Engagement Spike on Reels', description: 'Your Reels are getting 40% more views', action: 'Post More' },
    { type: 'high', title: 'Competitor Analysis Ready', description: 'New insights from top performers', action: 'View Report' },
    { type: 'low', title: 'Schedule Reminder', description: 'Post 3 times this week for optimal reach', action: 'Schedule' },
    { type: 'medium', title: 'Trending Hashtag Opportunity', description: '#WellnessWednesday is peaking', action: 'Use Now' },
  ], []);

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8">
      {/* Guided Tour */}
      <GuidedTour steps={tourSteps} storageKey="dashboardTour" />

      {/* Header */}
      <div className="mb-8">
        <Tooltip content="Welcome to your personalized dashboard! This is your home base for managing all your social media content with AI assistance.">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Hi, {user?.name || 'Zach'}!
          </h1>
        </Tooltip>
        <p className="text-gray-600">
          Here's your content overview at a glance.
        </p>
      </div>

      {/* AI Generations Counter & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <Tooltip content="Track your AI usage. Pro users get unlimited AI generations!">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-huttle-primary animate-pulse" />
            <span className="text-sm text-gray-600">
              AI: <span className="font-semibold">{aiGensLimit === Infinity ? '∞' : `${aiGensUsed}/${aiGensLimit}`}</span>
            </span>
          </div>
        </Tooltip>
        <Tooltip content="Create a custom post and schedule it across all your social media platforms">
          <button 
            onClick={() => setIsCreatePostOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Custom Post
          </button>
        </Tooltip>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Upcoming Content */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-huttle-primary" />
              <h2 className="text-lg font-semibold">Upcoming Content</h2>
              <span className="text-sm text-gray-500 font-medium">{sortedPosts.length} posts</span>
            </div>
            <Link to="/calendar" className="flex items-center gap-1 text-huttle-primary text-sm hover:underline font-medium">
              View Calendar
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {sortedPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="mb-4">No upcoming posts scheduled</p>
              <button
                onClick={() => setIsCreatePostOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Schedule Your First Post
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPosts.slice(0, 3).map((post) => (
                <HoverPreview
                  key={post.id}
                  preview={
                    <div className="space-y-2">
                      <h4 className="font-bold text-gray-900">{post.title}</h4>
                      {post.caption && (
                        <p className="text-sm text-gray-600 line-clamp-3">{post.caption}</p>
                      )}
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Platforms:</span>
                          <span className="font-semibold">{post.platforms.join(', ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-semibold">{post.contentType || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date:</span>
                          <span className="font-semibold">{post.scheduledDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time:</span>
                          <span className="font-semibold">{formatTo12Hour(post.scheduledTime)}</span>
                        </div>
                      </div>
                      {post.hashtags && (
                        <div className="pt-2 border-t">
                          <span className="text-xs text-gray-500">Hashtags: {post.hashtags}</span>
                        </div>
                      )}
                    </div>
                  }
                >
                  <div 
                    className="group p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-huttle-primary hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => {
                      if (post.scheduledDate) {
                        navigate('/calendar', { state: { date: post.scheduledDate, view: 'day' } });
                      } else {
                        navigate('/calendar');
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 truncate group-hover:text-huttle-primary transition-colors">
                          {post.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {post.scheduledDate} at {formatTo12Hour(post.scheduledTime)}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-huttle-primary/10 text-huttle-primary rounded font-medium">
                            {post.platforms[0]}{post.platforms.length > 1 ? ` +${post.platforms.length - 1}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(post.id);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </HoverPreview>
              ))}
              {sortedPosts.length > 3 && (
                <Link
                  to="/calendar"
                  className="block text-center text-sm text-huttle-primary hover:underline font-medium mt-2"
                >
                  View all {sortedPosts.length} posts →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Trending Now */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-huttle-primary" />
              <h2 className="text-lg font-semibold">Trending Now</h2>
            </div>
            <span className="text-xs text-gray-500">Industry + General</span>
          </div>
          
          {(!brandProfile?.industry && !brandProfile?.niche) ? (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">Setup Your Profile</h4>
                  <p className="text-xs text-blue-700 mb-3">
                    Add your industry and niche in Brand Voice to get personalized trending topics.
                  </p>
                  <Link 
                    to="/brand-voice"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Go to Brand Voice
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
          
          <div className={(!brandProfile?.industry && !brandProfile?.niche) ? 'mt-4' : ''}>
            <div className="space-y-2">
              {trendingTopics.map((item, i) => (
                <HoverPreview
                  key={i}
                  preview={
                    <div className="space-y-2">
                      <h4 className="font-bold text-gray-900">{item.topic}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Engagement:</span>
                          <span className="font-semibold text-huttle-primary">{item.engagement}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Growth:</span>
                          <span className="font-semibold text-green-600">{item.growth}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Top Platforms:</span>
                          <span className="font-semibold text-gray-900">{item.platforms}</span>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <div 
                    onClick={() => setIsCreatePostOpen(true)}
                    className="group text-sm hover:bg-gray-50 p-2 rounded cursor-pointer transition-all border border-transparent hover:border-huttle-primary"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400">#{i + 1}</span>
                        <span className="text-gray-700 group-hover:text-huttle-primary transition-colors font-medium">
                          {item.topic}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.growth}
                        </span>
                        <Eye className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </HoverPreview>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={TrendingUp}
          title="Avg Virality Score"
          value="N/A"
          iconColor="text-purple-500"
          bgColor="bg-purple-50"
          subtitle="Updates every 3 days"
        />
        <StatCard
          icon={CheckCircle}
          title="Content Quality"
          value="N/A"
          iconColor="text-green-500"
          bgColor="bg-green-50"
          subtitle="Updates every 5 days"
        />
        <StatCard
          icon={AlertCircle}
          title="Burnout Risk"
          value="Low"
          iconColor="text-blue-500"
          bgColor="bg-blue-50"
          valueColor="text-blue-600"
          subtitle="You're maintaining good pace"
        />
      </div>

      {/* Bottom Grid - More Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trend Forecaster */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <AIDisclaimerTooltip phraseIndex={0} position="right">
                <h2 className="text-lg font-semibold">Trend Forecaster</h2>
              </AIDisclaimerTooltip>
              <p className="text-xs text-gray-500">Updates weekly</p>
            </div>
          </div>
          <div className="space-y-3">
            {trendForecasts.slice(0, 5).map((forecast, i) => (
              <HoverPreview
                key={i}
                preview={
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">{forecast.title}</h4>
                      <p className="text-xs text-gray-500 mb-2">Expected: {forecast.timeframe}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-blue-900 mb-1">💡 Action Strategy:</p>
                      <p className="text-xs text-blue-800">{forecast.details}</p>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-gray-600">Best Platforms:</span>
                        <span className="font-semibold text-gray-900">{forecast.platforms}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-gray-600">Content Focus:</span>
                        <span className="font-semibold text-gray-900">{forecast.description}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-semibold text-green-700">{forecast.confidence}% High</span>
                      </div>
                    </div>
                  </div>
                }
              >
                <div className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-huttle-primary transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-gray-900 mb-1 group-hover:text-huttle-primary transition-colors">
                        {forecast.title}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">{forecast.description}</p>
                    </div>
                    <AIDisclaimerTooltip phraseIndex={i} position="left">
                      <span className="text-xs bg-cyan-100 text-huttle-primary px-2.5 py-1 rounded-full font-bold whitespace-nowrap ml-2">
                        {forecast.timeframe}
                      </span>
                    </AIDisclaimerTooltip>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500">Confidence:</span>
                    <div className="flex items-center gap-2 flex-1 ml-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[100px]">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full transition-all" 
                          style={{ width: `${forecast.confidence}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-gray-900 min-w-[32px]">{forecast.confidence}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">Platforms: <span className="font-semibold text-gray-700">{forecast.platforms}</span></span>
                    <span className="text-xs text-huttle-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View strategy →
                    </span>
                  </div>
                </div>
              </HoverPreview>
            ))}
          </div>
          <Link 
            to="/trendlab"
            className="mt-4 flex items-center justify-center gap-2 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium transition-colors"
          >
            <span>View Full Trend Forecaster</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Hashtags of the Day */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center">
                <Target className="w-5 h-5 text-huttle-primary" />
              </div>
              <div className="flex-1">
                <AIDisclaimerTooltip phraseIndex={1} position="right">
                  <h2 className="text-lg font-semibold">Hashtags of the Day</h2>
                </AIDisclaimerTooltip>
                <p className="text-xs text-gray-500">Updates daily</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">Top 7</span>
          </div>
          
          {(!brandProfile?.industry && !brandProfile?.niche) ? (
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-cyan-900 mb-1">Setup Your Profile</h4>
                  <p className="text-xs text-cyan-700 mb-3">
                    Add your industry and niche in Brand Voice to get personalized hashtags.
                  </p>
                  <Link 
                    to="/brand-voice"
                    className="inline-flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
                  >
                    Go to Brand Voice
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
          
          <div className="space-y-3">
            {keywords.map((keyword, i) => (
              <HoverPreview
                key={i}
                preview={
                  <div className="space-y-2">
                    <h4 className="font-bold text-huttle-primary">{keyword.tag}</h4>
                    <p className="text-xs text-gray-600">{keyword.description}</p>
                    <div className="space-y-1 text-sm pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Engagement Score:</span>
                        <span className="font-semibold text-green-600">{keyword.score}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Related Posts:</span>
                        <span className="font-semibold">~{Math.floor(Math.random() * 500 + 200)}K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg. Reach:</span>
                        <span className="font-semibold">~{Math.floor(Math.random() * 50 + 10)}K</span>
                      </div>
                    </div>
                  </div>
                }
              >
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-huttle-primary hover:shadow-sm transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-huttle-primary text-sm group-hover:text-huttle-primary-dark transition-colors">{keyword.tag}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                      {keyword.score}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{keyword.description}</p>
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-huttle-primary font-medium">
                      Hover for details →
                    </span>
                  </div>
                </div>
              </HoverPreview>
            ))}
          </div>
          <AIDisclaimerFooter 
            phraseIndex={1} 
            className="mt-4"
            onModalOpen={() => setShowHowWePredictModal(true)}
          />
        </div>

        {/* Daily Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Daily Alerts</h2>
              <p className="text-xs text-gray-500">Top 5 Today</p>
            </div>
          </div>
          <div className="space-y-3">
            {dailyAlerts.slice(0, 3).map((alert, i) => {
              const colors = {
                high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', badge: 'bg-red-100 text-red-700' },
                medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', badge: 'bg-yellow-100 text-yellow-700' },
                low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', badge: 'bg-green-100 text-green-700' }
              };
              const color = colors[alert.type];
              return (
                <HoverPreview
                  key={i}
                  preview={
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-900">{alert.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${color.badge} uppercase font-semibold`}>
                          {alert.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      <div className="space-y-1 text-sm pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Suggested Action:</span>
                          <span className="font-semibold">{alert.action}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Impact:</span>
                          <span className="font-semibold">
                            {alert.type === 'high' ? 'High engagement potential' : alert.type === 'medium' ? 'Moderate impact' : 'Minor optimization'}
                          </span>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <div className={`group p-3 ${color.bg} rounded-lg border ${color.border} hover:shadow-sm transition-all cursor-pointer`}>
                    <div className="flex items-start justify-between mb-1">
                      <h4 className={`font-semibold text-sm ${color.text}`}>{alert.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded ${color.badge} uppercase font-semibold`}>
                        {alert.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 mb-2">{alert.description}</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        alert.action === 'Create Post' && setIsCreatePostOpen(true);
                      }}
                      className="text-xs font-medium text-huttle-primary hover:underline"
                    >
                      {alert.action} →
                    </button>
                  </div>
                </HoverPreview>
              );
            })}
          </div>
        </div>

        {/* AI-Powered Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <AIDisclaimerTooltip phraseIndex={2} position="right">
                <h2 className="text-lg font-semibold">AI-Powered Insights</h2>
              </AIDisclaimerTooltip>
              <p className="text-xs text-gray-500">Updates every 3 days</p>
            </div>
          </div>
          <div className="space-y-3">
            {aiInsights.slice(0, 3).map((insight, i) => {
              const colorMap = {
                purple: 'bg-purple-50 border-purple-200 text-purple-900',
                blue: 'bg-blue-50 border-blue-200 text-blue-900',
                green: 'bg-green-50 border-green-200 text-green-900',
                orange: 'bg-orange-50 border-orange-200 text-orange-900'
              };
              return (
                <HoverPreview
                  key={i}
                  preview={
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <insight.icon className="w-5 h-5 text-huttle-primary" />
                        <h4 className="font-bold text-gray-900">{insight.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">{insight.description}</p>
                      <div className="space-y-1 text-sm pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Insight Type:</span>
                          <span className="font-semibold capitalize">{insight.color}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Based On:</span>
                          <span className="font-semibold">Last 30 days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reliability:</span>
                          <span className="font-semibold text-green-600">High</span>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <div className={`group p-3 rounded-lg border hover:shadow-sm transition-all cursor-pointer ${colorMap[insight.color]}`}>
                    <div className="flex items-start gap-2 mb-1">
                      <insight.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                        <p className="text-xs mt-1 opacity-80">{insight.description}</p>
                      </div>
                    </div>
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-huttle-primary font-medium">
                        Hover for more →
                      </span>
                    </div>
                  </div>
                </HoverPreview>
              );
            })}
          </div>
          <AIDisclaimerFooter 
            phraseIndex={2} 
            className="mt-4"
            onModalOpen={() => setShowHowWePredictModal(true)}
          />
        </div>

        {/* Content Gap Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Content Gap Analysis</h2>
              <p className="text-xs text-gray-500">Updates weekly</p>
            </div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 hover:border-orange-300 transition-all cursor-pointer"
            onClick={() => {
              showToast('Analyzing your content gaps...', 'info');
              setTimeout(() => {
                showToast('Analysis complete! You have opportunities in video content and carousel posts.', 'success');
              }, 1500);
            }}
          >
            <p className="text-sm text-orange-900 mb-3">
              You're missing <strong>30% of YouTube Shorts formats</strong> compared to top performers.
            </p>
            <button className="text-xs text-orange-600 hover:underline font-medium">
              See gap-filler ideas →
            </button>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />

      {/* Floating Action Button */}
      <FloatingActionButton onCreatePost={() => setIsCreatePostOpen(true)} />

      {/* How We Predict Modal */}
      <HowWePredictModal 
        isOpen={showHowWePredictModal} 
        onClose={() => setShowHowWePredictModal(false)} 
      />
    </div>
  );
}
