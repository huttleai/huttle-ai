import { useState, useContext, useEffect } from 'react';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Search, TrendingUp, Target, Copy, Check, Shuffle, Sparkles, Zap, Lock, Loader2, Radar, Activity, ExternalLink, ArrowUpRight, FolderPlus } from 'lucide-react';
import UpgradeModal from './UpgradeModal';
import { scanTrendingTopics } from '../services/perplexityAPI';
import { generateTrendIdeas } from '../services/grokAPI';
import { useToast } from '../context/ToastContext';
import { getToastDisclaimer } from './AIDisclaimer';
import { saveContentLibraryItem } from '../config/supabase';

/**
 * TrendDiscoveryHub - Reimagined with cutting-edge design
 * A premium trend discovery experience with glassmorphism and advanced animations
 */
export default function TrendDiscoveryHub({ onRemix }) {
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { addToast: showToast } = useToast();
  const { TIERS, userTier } = useSubscription();
  
  const [activeMode, setActiveMode] = useState('quickScan');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [deepDiveTopic, setDeepDiveTopic] = useState('');
  const [deepDiveResults, setDeepDiveResults] = useState(null);
  const [isLoadingDeepDive, setIsLoadingDeepDive] = useState(false);
  const [copiedIdea, setCopiedIdea] = useState(null);
  const [savedTrendIndex, setSavedTrendIndex] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [hoveredTrend, setHoveredTrend] = useState(null);
  
  const canAccessDeepDive = userTier !== TIERS.FREE;

  // Simulate scan progress
  useEffect(() => {
    if (isScanning) {
      setScanProgress(0);
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);
      return () => clearInterval(interval);
    } else {
      setScanProgress(100);
    }
  }, [isScanning]);

  const parseTrendResults = (trendText) => {
    if (!trendText) return [];
    
    const trends = [];
    const lines = trendText.split('\n').filter(line => line.trim());
    
    let currentTrend = null;
    
    for (const line of lines) {
      const trendMatch = line.match(/^(?:\d+[\.\)]\s*|[-•]\s*)?(?:\*\*)?([^:*]+)(?:\*\*)?(?::|$)/);
      
      if (trendMatch) {
        const name = trendMatch[1].trim();
        if (name.length > 3 && !name.toLowerCase().includes('engagement') && !name.toLowerCase().includes('score')) {
          if (currentTrend) {
            trends.push(currentTrend);
          }
          
          const baseScore = 95 - (trends.length * 5);
          const velocity = `+${Math.floor(40 + Math.random() * 60)}%`;
          
          const platformMatches = line.match(/(?:Instagram|TikTok|YouTube|X|Twitter|Facebook)/gi) || [];
          const platforms = platformMatches.length > 0 
            ? [...new Set(platformMatches.map(p => p === 'Twitter' ? 'X' : p))]
            : ['Multi-platform'];
          
          currentTrend = {
            name: name.substring(0, 50),
            score: Math.max(baseScore, 60),
            velocity,
            platforms,
            description: ''
          };
        }
      } else if (currentTrend && line.trim()) {
        currentTrend.description += (currentTrend.description ? ' ' : '') + line.trim();
      }
    }
    
    if (currentTrend) {
      trends.push(currentTrend);
    }
    
    if (trends.length === 0) {
      return [{
        name: 'Trending in ' + (brandData?.niche || 'your niche'),
        score: 85,
        velocity: '+45%',
        platforms: ['Multi-platform'],
        description: trendText.substring(0, 200)
      }];
    }
    
    return trends.slice(0, 5);
  };

  const handleQuickScan = async () => {
    if (!brandData?.niche) {
      showToast('Please set your niche in Brand Voice first', 'warning');
      return;
    }

    setIsScanning(true);
    try {
      const result = await scanTrendingTopics(brandData, 'all');
      
      if (result.success) {
        const parsedTrends = parseTrendResults(result.trends);
        setScanResults({
          trends: parsedTrends,
          timestamp: new Date().toLocaleString(),
          niche: brandData.niche,
          citations: result.citations || []
        });
        showToast(`Scan complete! Found ${parsedTrends.length} trending topics. ${getToastDisclaimer('forecast')}`, 'success');
      } else {
        showToast('Failed to scan trends. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Quick Scan error:', error);
      showToast('Error scanning trends', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeepDive = async () => {
    if (!canAccessDeepDive) {
      setShowUpgradeModal(true);
      showToast('Deep Dive is available for Essentials and Pro plans', 'warning');
      return;
    }

    if (!deepDiveTopic.trim()) {
      showToast('Please enter a topic or competitor niche', 'warning');
      return;
    }

    setIsLoadingDeepDive(true);
    try {
      const result = await generateTrendIdeas(
        brandData,
        `Analyze trending content patterns in the "${deepDiveTopic}" niche/topic. Then create 5 unique content ideas inspired by these trends but tailored for my brand. For each idea include:
        
1. Content Angle: What makes it unique
2. Hook: Attention-grabbing opening
3. Platform: Best platform for this content
4. Why It Works: Brief explanation of the trend psychology
5. My Brand Twist: How to make it authentically mine

Focus on content that's performing well right now and could be adapted without copying.`
      );

      if (result.success) {
        const ideas = result.ideas.split(/\d+\.\s+/).filter(s => s.trim());
        setDeepDiveResults({
          topic: deepDiveTopic,
          ideas: ideas.map((idea, index) => ({
            id: index + 1,
            content: idea.trim(),
            platform: extractPlatform(idea),
          })),
          rawContent: result.ideas,
          timestamp: new Date().toLocaleString()
        });
        showToast(`Generated ${ideas.length} inspired content ideas! ${getToastDisclaimer('general')}`, 'success');
      } else {
        showToast('Failed to generate insights', 'error');
      }
    } catch (error) {
      console.error('Deep Dive error:', error);
      showToast('Error analyzing trends', 'error');
    } finally {
      setIsLoadingDeepDive(false);
    }
  };

  const extractPlatform = (text) => {
    const platforms = ['Instagram', 'TikTok', 'YouTube', 'X', 'Twitter', 'Facebook'];
    for (const platform of platforms) {
      if (text.toLowerCase().includes(platform.toLowerCase())) {
        return platform === 'Twitter' ? 'X' : platform;
      }
    }
    return 'Multi-platform';
  };

  const handleCopyIdea = (idea, index) => {
    navigator.clipboard.writeText(idea);
    setCopiedIdea(index);
    showToast(`Idea copied! ${getToastDisclaimer('general')}`, 'success');
    setTimeout(() => setCopiedIdea(null), 2000);
  };

  const handleSendToRemix = (content) => {
    if (onRemix) {
      onRemix(content.substring(0, 200));
      showToast('Added to Content Remix Studio! Scroll down to remix.', 'success');
    }
  };

  const handleAddToLibrary = async (content, type = 'trend', itemIndex = null) => {
    if (!user?.id) {
      showToast('Please log in to add content to library', 'error');
      return;
    }

    try {
      const name = type === 'trend' 
        ? `Trend - ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`
        : `Trend Idea - ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`;

      const itemData = {
        name,
        type: 'text',
        content: content,
        size_bytes: 0,
        description: `Generated from Trend Discovery Hub`,
      };

      const result = await saveContentLibraryItem(user.id, itemData);

      if (result.success) {
        setSavedTrendIndex(itemIndex);
        setTimeout(() => setSavedTrendIndex(null), 2000);
        showToast('Added to Content Library!', 'success');
      } else {
        showToast('Failed to add to library', 'error');
        console.error('Error saving to library:', result.error);
      }
    } catch (error) {
      console.error('Error adding to library:', error);
      showToast('Error adding to library', 'error');
    }
  };

  // Score color based on value
  const getScoreColor = (score) => {
    if (score >= 85) return 'from-emerald-400 to-emerald-600';
    if (score >= 70) return 'from-amber-400 to-orange-500';
    return 'from-gray-400 to-gray-500';
  };

  return (
    <div className="relative mb-8">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Main Container with Glass Effect */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-2xl shadow-gray-900/5">
        {/* Animated Mesh Gradient Overlay */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.15),transparent_50%)]" />
        
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500" />
        
        {/* Header Section */}
        <div className="relative px-6 pt-8 pb-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Title Group */}
            <div className="flex items-start gap-4">
              {/* Animated Icon Container */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl blur-lg opacity-50 animate-pulse" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 p-[2px]">
                  <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center">
                    <Radar className="w-7 h-7 text-violet-600" />
                  </div>
                </div>
                {/* Orbiting Dots */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full animate-ping" />
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                    Trend Discovery
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-full">
                    Live
                  </span>
                </div>
                <p className="text-gray-500 text-sm md:text-base">
                  Real-time intelligence for <span className="font-semibold text-violet-600">{brandData?.niche || 'your niche'}</span>
                </p>
              </div>
            </div>

            {/* Mode Toggle - Pill Design */}
            <div className="relative flex p-1.5 bg-gray-100/80 rounded-2xl backdrop-blur-sm">
              {/* Sliding Background */}
              <div 
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-4px)] bg-white rounded-xl shadow-lg shadow-gray-900/10 transition-all duration-300 ease-out ${
                  activeMode === 'deepDive' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                }`}
              />
              
              <button
                onClick={() => setActiveMode('quickScan')}
                className={`relative z-10 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-colors duration-300 ${
                  activeMode === 'quickScan'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Search className={`w-4 h-4 transition-all duration-300 ${activeMode === 'quickScan' ? 'text-violet-500' : ''}`} />
                <span>Quick Scan</span>
              </button>
              
              <button
                onClick={() => canAccessDeepDive ? setActiveMode('deepDive') : setShowUpgradeModal(true)}
                className={`relative z-10 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-colors duration-300 ${
                  activeMode === 'deepDive'
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Target className={`w-4 h-4 transition-all duration-300 ${activeMode === 'deepDive' ? 'text-fuchsia-500' : ''}`} />
                <span>Deep Dive</span>
                {!canAccessDeepDive && (
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative px-6 pb-8 md:px-8">
          
          {/* Quick Scan Mode */}
          {activeMode === 'quickScan' && (
            <div className="animate-fadeIn">
              {isScanning ? (
                /* Scanning Animation */
                <div className="relative py-16">
                  {/* Radar Animation Container */}
                  <div className="relative w-48 h-48 mx-auto">
                    {/* Outer Ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-violet-200 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-4 rounded-full border-2 border-violet-300/60 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                    <div className="absolute inset-8 rounded-full border-2 border-violet-400/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                    
                    {/* Center Hub */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
                        <Radar className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '3s' }} />
                      </div>
                    </div>
                    
                    {/* Scanning Line */}
                    <div 
                      className="absolute inset-0 origin-center animate-spin" 
                      style={{ animationDuration: '2s' }}
                    >
                      <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-violet-500 to-transparent origin-left" />
                    </div>
                  </div>
                  
                  {/* Progress & Status */}
                  <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 rounded-full border border-violet-100 mb-4">
                      <Activity className="w-4 h-4 text-violet-500 animate-pulse" />
                      <span className="text-sm font-medium text-violet-700">Scanning real-time data...</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="max-w-xs mx-auto">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${scanProgress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Analyzing {brandData?.niche || 'your industry'} across platforms
                      </p>
                    </div>
                  </div>
                </div>
              ) : scanResults ? (
                /* Results Display */
                <div className="space-y-6">
                  {/* Results Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Live Results</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Last updated: {scanResults.timestamp}
                      </p>
                    </div>
                    <button
                      onClick={handleQuickScan}
                      className="group flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30"
                    >
                      <Radar className="w-4 h-4 group-hover:animate-spin" style={{ animationDuration: '2s' }} />
                      <span>Rescan</span>
                    </button>
                  </div>

                  {/* Trend Cards */}
                  <div className="space-y-3">
                    {scanResults.trends.map((trend, i) => (
                      <div 
                        key={i}
                        className={`group relative overflow-hidden rounded-2xl transition-all duration-500 cursor-pointer ${
                          hoveredTrend === i 
                            ? 'bg-gradient-to-r from-violet-50 to-fuchsia-50 shadow-xl shadow-violet-500/10 scale-[1.01]' 
                            : 'bg-white hover:bg-gray-50'
                        }`}
                        style={{ 
                          border: hoveredTrend === i 
                            ? '1px solid rgba(139, 92, 246, 0.3)' 
                            : '1px solid rgba(0,0,0,0.05)',
                          animationDelay: `${i * 100}ms`
                        }}
                        onMouseEnter={() => setHoveredTrend(i)}
                        onMouseLeave={() => setHoveredTrend(null)}
                      >
                        {/* Rank Badge - Fixed Position */}
                        <div className={`absolute top-4 left-4 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                          i === 0 
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30' 
                            : i === 1 
                              ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                              : i === 2 
                                ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                                : 'bg-gray-100 text-gray-500'
                        }`}>
                          {i + 1}
                        </div>

                        {/* Content */}
                        <div className="pl-20 pr-4 py-4">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            {/* Trend Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 text-lg mb-2 truncate group-hover:text-violet-700 transition-colors">
                                {trend.name}
                              </h4>
                              
                              {/* Stats Row */}
                              <div className="flex flex-wrap items-center gap-3">
                                {/* Velocity */}
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg">
                                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-sm font-bold text-emerald-700">{trend.velocity}</span>
                                </div>
                                
                                {/* Score */}
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full bg-gradient-to-r ${getScoreColor(trend.score)} rounded-full transition-all duration-700`}
                                      style={{ width: `${trend.score}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-600">{trend.score}%</span>
                                </div>
                                
                                {/* Platforms */}
                                <div className="hidden sm:flex items-center gap-1.5">
                                  {trend.platforms.slice(0, 2).map((platform, idx) => (
                                    <span 
                                      key={idx}
                                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium"
                                    >
                                      {platform}
                                    </span>
                                  ))}
                                  {trend.platforms.length > 2 && (
                                    <span className="text-xs text-gray-400">+{trend.platforms.length - 2}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToLibrary(trend.name + (trend.description ? ': ' + trend.description : ''), 'trend', `trend-${i}`);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-huttle-primary/50 text-gray-700 rounded-xl text-sm font-medium transition-all"
                                title="Add to Library"
                              >
                                {savedTrendIndex === `trend-${i}` ? (
                                  <>
                                    <Check className="w-4 h-4 text-green-600" />
                                    <span className="text-green-600">Saved!</span>
                                  </>
                                ) : (
                                  <>
                                    <FolderPlus className="w-4 h-4 text-huttle-primary" />
                                    <span>Save</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendToRemix(trend.name + (trend.description ? ': ' + trend.description : ''));
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105"
                              >
                                <Sparkles className="w-4 h-4" />
                                <span>Use This</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Hover Highlight Line */}
                        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 transition-all duration-300 ${
                          hoveredTrend === i ? 'opacity-100' : 'opacity-0'
                        }`} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Empty State - CTA to Start Scan */
                <div className="relative py-16">
                  {/* Background Decoration */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <div className="w-64 h-64 rounded-full border-2 border-dashed border-violet-400 animate-spin" style={{ animationDuration: '20s' }} />
                    <div className="absolute w-48 h-48 rounded-full border-2 border-dashed border-fuchsia-400 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
                  </div>
                  
                  <div className="relative text-center">
                    {/* Floating Icon */}
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-3xl blur-2xl opacity-30 animate-pulse" />
                      <div className="relative w-24 h-24 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-violet-500/30">
                        <Radar className="w-12 h-12 text-white" />
                      </div>
                      {/* Orbiting Elements */}
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center shadow-lg animate-bounce" style={{ animationDelay: '0.5s' }}>
                        <TrendingUp className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-display font-bold text-gray-900 mb-3">
                      Discover What's Trending
                    </h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                      Scan real-time trends in <span className="font-semibold text-violet-600">{brandData?.niche || 'your industry'}</span> and find your next viral content opportunity
                    </p>
                    
                    <button
                      onClick={handleQuickScan}
                      className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 bg-[length:200%_100%] text-white rounded-2xl text-lg font-bold transition-all shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:bg-[position:100%_0] animate-[shimmer_3s_ease-in-out_infinite]"
                    >
                      <Radar className="w-5 h-5 group-hover:animate-spin" style={{ animationDuration: '2s' }} />
                      <span>Start Scanning</span>
                      <div className="flex items-center justify-center w-6 h-6 bg-white/20 rounded-full">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Deep Dive Mode */}
          {activeMode === 'deepDive' && (
            <div className="animate-fadeIn">
              {!canAccessDeepDive ? (
                /* Upgrade CTA */
                <div className="relative py-12">
                  {/* Lock Icon */}
                  <div className="text-center mb-8">
                    <div className="relative inline-block">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                        <Lock className="w-10 h-10 text-gray-400" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                        Pro
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-w-lg mx-auto text-center">
                    <h3 className="text-2xl font-display font-bold text-gray-900 mb-3">
                      Unlock Deep Dive Analysis
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Get AI-powered content ideas inspired by trending patterns in any niche or competitor space
                    </p>
                    
                    {/* Feature Preview Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                      {[
                        { icon: Target, label: 'Competitor Analysis' },
                        { icon: Sparkles, label: 'AI-Powered Ideas' },
                        { icon: TrendingUp, label: 'Trend Psychology' },
                        { icon: Shuffle, label: 'Brand Adaptation' }
                      ].map((feature, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-600"
                        >
                          <feature.icon className="w-4 h-4 text-violet-500" />
                          <span>{feature.label}</span>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl text-lg font-bold transition-all shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105"
                    >
                      <Zap className="w-5 h-5" />
                      <span>Upgrade to Unlock</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Input Section */}
                  <div className="relative mb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Enter a topic, competitor, or niche to analyze..."
                          value={deepDiveTopic}
                          onChange={(e) => setDeepDiveTopic(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleDeepDive()}
                          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl text-base focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-400/10 transition-all outline-none"
                        />
                      </div>
                      <button
                        onClick={handleDeepDive}
                        disabled={isLoadingDeepDive || !deepDiveTopic.trim()}
                        className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-fuchsia-500/25 hover:shadow-xl hover:shadow-fuchsia-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoadingDeepDive ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            <span>Analyze</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Results */}
                  {deepDiveResults && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">
                            Ideas from "{deepDiveResults.topic}"
                          </h3>
                          <p className="text-xs text-gray-500">Generated: {deepDiveResults.timestamp}</p>
                        </div>
                        <button
                          onClick={() => {
                            setDeepDiveTopic('');
                            setDeepDiveResults(null);
                          }}
                          className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {deepDiveResults.ideas.slice(0, 4).map((idea) => (
                          <div
                            key={idea.id}
                            className="group relative overflow-hidden bg-gradient-to-br from-fuchsia-50 to-violet-50 rounded-2xl p-5 border border-fuchsia-100 hover:border-fuchsia-300 hover:shadow-xl hover:shadow-fuchsia-500/10 transition-all"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white text-xs font-bold rounded-lg">
                                <Sparkles className="w-3 h-3" />
                                Idea #{idea.id}
                              </span>
                              <span className="px-2.5 py-1 bg-white text-gray-600 text-xs font-medium rounded-lg shadow-sm">
                                {idea.platform}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                              {idea.content}
                            </p>
                            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopyIdea(idea.content, `deep-${idea.id}`)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors"
                              >
                                {copiedIdea === `deep-${idea.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleAddToLibrary(idea.content, 'idea', `idea-${idea.id}`)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white text-huttle-primary border border-huttle-primary/30 rounded-xl text-xs font-medium hover:bg-huttle-primary/5 transition-colors"
                              >
                                {savedTrendIndex === `idea-${idea.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                    <span className="text-green-600">Saved!</span>
                                  </>
                                ) : (
                                  <>
                                    <FolderPlus className="w-3.5 h-3.5" />
                                    <span>Save</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleSendToRemix(idea.content)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white rounded-xl text-xs font-medium hover:from-fuchsia-600 hover:to-violet-600 transition-colors"
                              >
                                <Shuffle className="w-3.5 h-3.5" />
                                <span>Remix</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Copy All */}
                      <button
                        onClick={() => handleCopyIdea(deepDiveResults.rawContent, 'all-deep')}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-600 font-medium hover:border-fuchsia-300 hover:bg-fuchsia-50/50 transition-colors"
                      >
                        {copiedIdea === 'all-deep' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-600">All Ideas Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy All Ideas</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Empty State */}
                  {!deepDiveResults && !isLoadingDeepDive && (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">
                        Enter a topic above to discover trending content patterns and get unique ideas
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="deepDive"
      />
    </div>
  );
}
