import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { useSubscription } from '../context/SubscriptionContext';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Heart,
  Share2,
  MessageCircle,
  Calendar,
  Sparkles,
  Users,
  Clock,
  Target,
  ArrowUp,
  ArrowDown,
  Filter,
  Download
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Tooltip from '../components/Tooltip';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Analytics() {
  const { user } = useContext(AuthContext);
  const { scheduledPosts } = useContent();
  const { userTier } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, 90d, all
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  // Mock analytics data - in production, this would come from Supabase
  const [analyticsData, setAnalyticsData] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalEngagement: 0,
    averageEngagement: 0,
    bestPerformingPost: null,
    platformBreakdown: [],
    engagementTrend: [],
    aiUsage: {
      generations: 0,
      saved: 0,
      avgQuality: 0
    },
    contentPerformance: []
  });

  const platforms = [
    { name: 'all', label: 'All Platforms', color: 'bg-gray-500' },
    { name: 'instagram', label: 'Instagram', color: 'bg-pink-500' },
    { name: 'facebook', label: 'Facebook', color: 'bg-blue-600' },
    { name: 'tiktok', label: 'TikTok', color: 'bg-black' },
    { name: 'twitter', label: 'X (Twitter)', color: 'bg-black' },
    { name: 'linkedin', label: 'LinkedIn', color: 'bg-blue-700' },
    { name: 'youtube', label: 'YouTube', color: 'bg-red-600' }
  ];

  useEffect(() => {
    // Simulate loading analytics data
    setTimeout(() => {
      const posts = scheduledPosts || [];
      const totalPosts = posts.length;
      
      // Generate mock analytics based on scheduled posts
      const mockData = {
        totalPosts,
        totalViews: totalPosts * 1250,
        totalEngagement: totalPosts * 350,
        averageEngagement: totalPosts > 0 ? 28.5 : 0,
        bestPerformingPost: posts.length > 0 ? posts[0] : null,
        platformBreakdown: [
          { platform: 'Instagram', posts: Math.floor(totalPosts * 0.4), engagement: 145 },
          { platform: 'Facebook', posts: Math.floor(totalPosts * 0.25), engagement: 98 },
          { platform: 'TikTok', posts: Math.floor(totalPosts * 0.15), engagement: 234 },
          { platform: 'X (Twitter)', posts: Math.floor(totalPosts * 0.1), engagement: 67 },
          { platform: 'LinkedIn', posts: Math.floor(totalPosts * 0.05), engagement: 89 },
          { platform: 'YouTube', posts: Math.floor(totalPosts * 0.05), engagement: 156 }
        ],
        engagementTrend: generateMockTrendData(dateRange),
        aiUsage: {
          generations: userTier === 'Pro' ? 234 : userTier === 'Essentials' ? 156 : 18,
          saved: 45,
          avgQuality: 8.7
        },
        contentPerformance: posts.slice(0, 5).map((post, idx) => ({
          id: post.id,
          title: post.title || `Post ${idx + 1}`,
          views: Math.floor(Math.random() * 2000) + 500,
          engagement: Math.floor(Math.random() * 500) + 100,
          engagementRate: (Math.random() * 10 + 2).toFixed(1)
        }))
      };
      
      setAnalyticsData(mockData);
      setLoading(false);
    }, 800);
  }, [scheduledPosts, dateRange, userTier]);

  function generateMockTrendData(range) {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      engagement: Math.floor(Math.random() * 200) + 100,
      views: Math.floor(Math.random() * 800) + 400
    }));
  }

  const maxEngagement = Math.max(...analyticsData.engagementTrend.map(d => d.engagement), 1);
  const maxViews = Math.max(...analyticsData.engagementTrend.map(d => d.views), 1);

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8 flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <Tooltip content="Track your content performance and engagement metrics across all platforms">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Analytics
              </h1>
            </Tooltip>
            <p className="text-gray-600 text-sm md:text-base">
              Insights into your content performance and audience engagement
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
              {['7d', '30d', '90d', 'all'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                    dateRange === range
                      ? 'bg-huttle-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {range === 'all' ? 'All Time' : range.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Platform Filter */}
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-huttle-primary"
            >
              {platforms.map((platform) => (
                <option key={platform.name} value={platform.name}>
                  {platform.label}
                </option>
              ))}
            </select>
            {/* Export Button */}
            <Tooltip content="Export analytics data as CSV">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium text-gray-700">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <StatCard
          icon={BarChart3}
          title="Total Posts"
          value={analyticsData.totalPosts}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
          subtitle={`Last ${dateRange === 'all' ? 'year' : dateRange}`}
        />
        <StatCard
          icon={Eye}
          title="Total Views"
          value={analyticsData.totalViews.toLocaleString()}
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
          trend={{ type: 'up', value: '+12%' }}
        />
        <StatCard
          icon={Heart}
          title="Total Engagement"
          value={analyticsData.totalEngagement.toLocaleString()}
          iconColor="text-red-600"
          bgColor="bg-red-50"
          trend={{ type: 'up', value: '+8%' }}
        />
        <StatCard
          icon={TrendingUp}
          title="Avg Engagement Rate"
          value={`${analyticsData.averageEngagement.toFixed(1)}%`}
          iconColor="text-green-600"
          bgColor="bg-green-50"
          subtitle="Per post"
        />
      </div>

      {/* Engagement Trend Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Engagement Trend</h2>
            <p className="text-sm text-gray-600">Track your engagement over time</p>
          </div>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-huttle-primary"></div>
              <span className="text-sm text-gray-600">Engagement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm text-gray-600">Views</span>
            </div>
          </div>
        </div>
        <div className="h-64 md:h-80 relative">
          {/* Simple CSS-based bar chart */}
          <div className="flex items-end justify-between h-full gap-1 md:gap-2 overflow-x-auto pb-4">
            {analyticsData.engagementTrend.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center group relative min-w-[20px] md:min-w-[30px]">
                <div className="w-full flex flex-col items-center justify-end h-full gap-1">
                  {/* Views bar */}
                  <div
                    className="w-full bg-purple-500 rounded-t transition-all hover:opacity-80 relative group"
                    style={{
                      height: `${(data.views / maxViews) * 100}%`,
                      minHeight: '4px'
                    }}
                  >
                    <Tooltip content={`${data.date}: ${data.views.toLocaleString()} views`}>
                      <div className="absolute inset-0"></div>
                    </Tooltip>
                  </div>
                  {/* Engagement bar */}
                  <div
                    className="w-full bg-huttle-primary rounded-t transition-all hover:opacity-80 relative group"
                    style={{
                      height: `${(data.engagement / maxEngagement) * 100}%`,
                      minHeight: '4px'
                    }}
                  >
                    <Tooltip content={`${data.date}: ${data.engagement.toLocaleString()} engagement`}>
                      <div className="absolute inset-0"></div>
                    </Tooltip>
                  </div>
                </div>
                {/* Date label */}
                <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap hidden md:block">
                  {data.date.split(' ')[1]}
                </span>
                <span className="text-xs text-gray-500 mt-2 md:hidden">
                  {index % Math.ceil(analyticsData.engagementTrend.length / 7) === 0 ? data.date.split(' ')[1] : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Breakdown & Top Performing Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
        {/* Platform Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Platform Performance</h2>
              <p className="text-sm text-gray-600">Posts and engagement by platform</p>
            </div>
            <Target className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {analyticsData.platformBreakdown.map((platform, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${platforms.find(p => p.label === platform.platform)?.color || 'bg-gray-500'}`}></div>
                    <span className="text-sm font-medium text-gray-700">{platform.platform}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{platform.posts} posts</span>
                    <span className="text-sm font-semibold text-gray-900">{platform.engagement}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-huttle-primary h-2 rounded-full transition-all"
                    style={{ width: `${(platform.engagement / Math.max(...analyticsData.platformBreakdown.map(p => p.engagement))) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Posts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Top Performing Posts</h2>
              <p className="text-sm text-gray-600">Your best content by engagement</p>
            </div>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {analyticsData.contentPerformance.length > 0 ? (
              analyticsData.contentPerformance.map((post, index) => (
                <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-huttle-primary text-white flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {post.views.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {post.engagement.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <span className="text-sm font-semibold text-green-600">
                      {post.engagementRate}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No posts yet. Start creating content to see analytics!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Usage Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">AI Usage Statistics</h2>
            <p className="text-sm text-gray-600">Track your AI-powered content generation</p>
          </div>
          <Sparkles className="w-5 h-5 text-huttle-primary" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-cyan-100">
            <div className="text-3xl font-bold text-huttle-primary mb-1">
              {analyticsData.aiUsage.generations}
            </div>
            <div className="text-sm text-gray-600">AI Generations</div>
            <div className="text-xs text-gray-500 mt-1">
              {userTier === 'Pro' ? 'Unlimited' : `${userTier} Plan`}
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {analyticsData.aiUsage.saved}
            </div>
            <div className="text-sm text-gray-600">Saved to Library</div>
            <div className="text-xs text-gray-500 mt-1">From AI tools</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {analyticsData.aiUsage.avgQuality.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Avg Quality Score</div>
            <div className="text-xs text-gray-500 mt-1">Out of 10</div>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-gradient-to-r from-huttle-primary to-huttle-primary-light rounded-xl shadow-sm border border-huttle-primary/20 p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Insights & Recommendations</h3>
            <ul className="space-y-2 text-sm opacity-90">
              <li className="flex items-start gap-2">
                <span className="text-white font-bold mt-0.5">•</span>
                <span>Your best posting time is 9:00 AM - engagement is 23% higher during this window</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white font-bold mt-0.5">•</span>
                <span>Instagram posts perform best - consider focusing more content here</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white font-bold mt-0.5">•</span>
                <span>Video content has 45% higher engagement than static posts</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

