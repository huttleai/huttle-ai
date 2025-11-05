import { useState, useContext } from 'react';
import { BrandContext } from '../context/BrandContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Search, Download, TrendingUp, FastForward, Eye, Lightbulb, Users, Shuffle, Bell, Calendar, ChevronDown, ChevronUp, Copy, Check, Lock, Sparkles, ArrowRight, Zap } from 'lucide-react';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import RemixContentDisplay from '../components/RemixContentDisplay';
import UpgradeModal from '../components/UpgradeModal';
import { forecastTrends } from '../services/perplexityAPI';
import { generateTrendIdeas } from '../services/grokAPI';
import { useToast } from '../context/ToastContext';
import { AIDisclaimerTooltip, AIDisclaimerFooter, HowWePredictModal, getToastDisclaimer } from '../components/AIDisclaimer';

export default function TrendLab() {
  const { brandData } = useContext(BrandContext);
  const { addToast: showToast } = useToast();
  const { checkFeatureAccess, getUpgradeMessage, TIERS } = useSubscription();
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [, setActiveFeature] = useState(null);
  const [isLoadingForecaster, setIsLoadingForecaster] = useState(false);
  const [trendForecast, setTrendForecast] = useState(null);
  const [copiedIdea, setCopiedIdea] = useState(null);
  const [showHowWePredictModal, setShowHowWePredictModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState(null);
  
  // Collapsible card states
  const [collapsedCards, setCollapsedCards] = useState({
    audienceInsight: false,
    remixEngine: false,
    trendForecaster: false,
  });
  
  // Loading states for individual cards
  const [loadingStates, setLoadingStates] = useState({
    audienceInsight: false,
    remixEngine: false,
  });
  
  // Data states for cards
  const [audienceData, setAudienceData] = useState(null);
  const [remixInput, setRemixInput] = useState('');
  const [remixOutput, setRemixOutput] = useState(null);
  
  // Mobile swipe functionality
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  
  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanResults({
        trends: [
          { name: 'AI-Powered Content Creation', score: 95, velocity: '+125%', platforms: ['LinkedIn', 'X', 'Instagram'] },
          { name: 'Sustainable Business Practices', score: 88, velocity: '+89%', platforms: ['LinkedIn', 'Facebook'] },
          { name: 'Remote Team Collaboration', score: 82, velocity: '+67%', platforms: ['LinkedIn', 'YouTube'] },
          { name: 'Personal Branding Tips', score: 79, velocity: '+54%', platforms: ['Instagram', 'TikTok', 'X'] },
          { name: 'Industry Thought Leadership', score: 76, velocity: '+42%', platforms: ['LinkedIn'] },
        ],
        timestamp: new Date().toLocaleString(),
        niche: brandData?.niche || 'your industry'
      });
      showToast(`Scan complete! Found 5 trending topics. ${getToastDisclaimer('forecast')}`, 'success');
    }, 2000);
  };

  const handleForecastTrends = async () => {
    // Check if user has access to trend forecasts
    if (!checkFeatureAccess('trendForecasts')) {
      showToast(getUpgradeMessage('trendForecasts'), 'warning');
      return;
    }

    if (!brandData?.niche) {
      showToast('Please set your niche in Brand Voice first', 'warning');
      return;
    }

    setIsLoadingForecaster(true);
    try {
      // Get trend forecast from Perplexity API
      const perplexityResult = await forecastTrends(
        brandData.niche, 
        '7 days starting from October 29, 2025'
      );

      if (perplexityResult.success) {
        // Enhance with Grok API for actionable post ideas
        const grokResult = await generateTrendIdeas(
          brandData,
          `Create 3 tailored post ideas based on these emerging trends: ${perplexityResult.forecast.substring(0, 500)}... Match the ${brandData.brandVoice || 'engaging'} brand voice.`
        );

        setTrendForecast({
          rawForecast: perplexityResult.forecast,
          postIdeas: grokResult.success ? grokResult.ideas : 'Unable to generate post ideas at this time.',
          citations: perplexityResult.citations,
          timeline: parseTrendTimeline(perplexityResult.forecast)
        });
        showToast(`Trend forecast generated! ${getToastDisclaimer('forecast')}`, 'success');
      } else {
        showToast('Failed to fetch trend forecast', 'error');
      }
    } catch (error) {
      console.error('Forecast error:', error);
      showToast('Error generating forecast', 'error');
    } finally {
      setIsLoadingForecaster(false);
    }
  };

  const parseTrendTimeline = () => {
    // Mock timeline parsing - in production, this would parse the actual forecast
    return [
      { day: 'Oct 29', trend: 'AI Content Tools', velocity: '+45%', confidence: 'High' },
      { day: 'Oct 31', trend: 'Video-First Strategy', velocity: '+38%', confidence: 'High' },
      { day: 'Nov 2', trend: 'Micro-Influencers', velocity: '+42%', confidence: 'Medium' },
      { day: 'Nov 4', trend: 'Interactive Posts', velocity: '+35%', confidence: 'Medium' },
    ];
  };

  const handleCopyIdea = (idea, index) => {
    navigator.clipboard.writeText(idea);
    setCopiedIdea(index);
    showToast(`Idea copied! ${getToastDisclaimer('general')}`, 'success');
    setTimeout(() => setCopiedIdea(null), 2000);
  };

  const toggleCard = (cardName) => {
    setCollapsedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  const handleAudienceInsight = async () => {
    setLoadingStates(prev => ({ ...prev, audienceInsight: true }));
    try {
      // Simulate fetching audience data from n8n/Supabase
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock audience insights data
      setAudienceData({
        demographics: {
          primaryAge: '25-34',
          secondaryAge: '35-44',
          topLocations: ['United States', 'United Kingdom', 'Canada'],
        },
        engagement: {
          peakTimes: ['Weekdays 7-9 PM', 'Weekends 10 AM-12 PM'],
          bestPlatforms: ['Instagram', 'LinkedIn', 'TikTok'],
          avgEngagementRate: '4.2%',
        },
        preferences: {
          topTopics: ['AI & Technology', 'Business Growth', 'Personal Development'],
          contentTypes: ['Short-form video', 'Carousel posts', 'Educational content'],
        },
      });
      
      showToast(`Audience insights loaded! ${getToastDisclaimer('general')}`, 'success');
    } catch (error) {
      console.error('Error fetching audience insights:', error);
      showToast('Failed to load audience insights', 'error');
    } finally {
      setLoadingStates(prev => ({ ...prev, audienceInsight: false }));
    }
  };

  const handleRemixContent = async () => {
    if (!remixInput.trim()) {
      showToast('Please enter a trend or content to remix', 'warning');
      return;
    }

    setLoadingStates(prev => ({ ...prev, remixEngine: true }));
    try {
      // Use Grok API to remix content
      const result = await generateTrendIdeas(
        brandData,
        `Remix this trending content for my brand: "${remixInput}". Adapt it to match my ${brandData?.brandVoice || 'engaging'} voice and create 3 variations for different platforms (Instagram, LinkedIn, TikTok).`
      );

      if (result.success) {
        setRemixOutput(result.ideas);
        showToast(`Content remixed! ${getToastDisclaimer('remix')}`, 'success');
      } else {
        showToast('Failed to remix content', 'error');
      }
    } catch (error) {
      console.error('Error remixing content:', error);
      showToast('Error remixing content', 'error');
    } finally {
      setLoadingStates(prev => ({ ...prev, remixEngine: false }));
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-200 rounded-lg h-32"></div>
        <div className="bg-gray-200 rounded-lg h-32"></div>
        <div className="bg-gray-200 rounded-lg h-32"></div>
      </div>
    </div>
  );

  // Mobile swipe handlers
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    const totalCards = 4; // Audience Insight, Remix Engine, Trend Forecaster, Trend Alerts
    
    if (isLeftSwipe && currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(prev => prev + 1);
      // Scroll to next card
      const cards = document.querySelectorAll('.trend-card');
      if (cards[currentCardIndex + 1]) {
        cards[currentCardIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
    
    if (isRightSwipe && currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      // Scroll to previous card
      const cards = document.querySelectorAll('.trend-card');
      if (cards[currentCardIndex - 1]) {
        cards[currentCardIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-huttle-primary mb-2">
          Trend Lab
        </h1>
        <p className="text-gray-600">
          Discover, predict, and remix trends tailored to {brandData?.niche || 'your niche'}
        </p>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search trends, keywords, niches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 whitespace-nowrap">
            <span className="font-semibold">0/20</span> AI Gens Used
          </div>
          <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main Trend Radar Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 mb-6 hover:shadow-md transition-all">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-6 h-6 text-huttle-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">Trend Radar</h2>
            <p className="text-sm text-gray-600">
              Scan emerging trends in your niche
            </p>
          </div>
        </div>

        {isScanning ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Scanning real-time trends...</p>
            <p className="text-sm text-gray-500 mt-1">
              Analyzing {brandData?.niche || 'your industry'} across platforms
            </p>
          </div>
        ) : scanResults ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Scan Results</h3>
                <p className="text-sm text-gray-500">Last scanned: {scanResults.timestamp}</p>
              </div>
              <button
                onClick={handleScan}
                className="px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all text-sm font-medium"
              >
                Rescan
              </button>
            </div>
            <div className="space-y-3">
              {scanResults.trends.map((trend, i) => (
                <div key={i} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-huttle-primary transition-all group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-huttle-primary bg-huttle-primary/10 px-2 py-1 rounded">
                          #{i + 1}
                        </span>
                        <h4 className="font-bold text-gray-900">{trend.name}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mt-2">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          <span className="font-semibold text-green-600">{trend.velocity}</span>
                        </span>
                        <span>Score: <span className="font-semibold">{trend.score}/100</span></span>
                        <span>Platforms: <span className="font-semibold">{trend.platforms.join(', ')}</span></span>
                      </div>
                    </div>
                    <button
                      onClick={() => showToast('Creating post from trend...', 'info')}
                      className="px-3 py-1.5 bg-huttle-primary text-white rounded text-xs font-medium hover:bg-huttle-primary-dark transition-all opacity-0 group-hover:opacity-100"
                    >
                      Use This
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-huttle-primary/20 to-huttle-primary/10 flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-huttle-primary" />
            </div>
            <p className="text-gray-600 mb-6">
              Ready to discover trending topics in {brandData?.niche || 'your industry'}
            </p>
            <button
              onClick={handleScan}
              className="px-6 py-3 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all shadow-md hover:shadow-lg font-medium"
            >
              Start Scanning
            </button>
          </div>
        )}
      </div>

      {/* Modular Dashboard Cards */}
      <div 
        className="space-y-6 md:space-y-6"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Mobile swipe indicator */}
        <div className="md:hidden flex justify-center gap-2 mb-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                currentCardIndex === index ? 'w-8 bg-huttle-primary' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Audience Insight Engine Card - All Tiers */}
        <div className="trend-card bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <AIDisclaimerTooltip phraseIndex={0} position="right">
                    <h3 className="text-lg font-bold mb-2">Audience Insight Engine</h3>
                  </AIDisclaimerTooltip>
                  <p className="text-sm text-gray-600 mb-4">
                    Deep-dive into what resonates with your audience—demographics, preferences, and behaviors.
                  </p>
                  {!audienceData && (
                    <button
                      onClick={handleAudienceInsight}
                      disabled={loadingStates.audienceInsight}
                      className="flex items-center gap-2 px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingStates.audienceInsight ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Explore Insights</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {audienceData && (
                <button
                  onClick={() => toggleCard('audienceInsight')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  {collapsedCards.audienceInsight ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              )}
            </div>

            {/* Audience Insights Content */}
            {loadingStates.audienceInsight && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <LoadingSkeleton />
              </div>
            )}
            {audienceData && !collapsedCards.audienceInsight && !loadingStates.audienceInsight && (
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Demographics</h4>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p><span className="font-medium">Primary Age:</span> {audienceData.demographics.primaryAge}</p>
                      <p><span className="font-medium">Secondary Age:</span> {audienceData.demographics.secondaryAge}</p>
                      <p className="text-xs text-gray-600 mt-2">Top Locations: {audienceData.demographics.topLocations.join(', ')}</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Engagement</h4>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p><span className="font-medium">Peak Times:</span></p>
                      {audienceData.engagement.peakTimes.map((time, i) => (
                        <p key={i} className="text-xs">• {time}</p>
                      ))}
                      <p className="mt-2"><span className="font-medium">Avg Rate:</span> {audienceData.engagement.avgEngagementRate}</p>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Preferences</h4>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p className="font-medium">Top Topics:</p>
                      {audienceData.preferences.topTopics.slice(0, 2).map((topic, i) => (
                        <p key={i} className="text-xs">• {topic}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Remix Engine Card - All Tiers */}
        <div className="trend-card bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Shuffle className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <AIDisclaimerTooltip phraseIndex={2} position="right">
                    <h3 className="text-lg font-bold mb-2">Remix Engine</h3>
                  </AIDisclaimerTooltip>
                  <p className="text-sm text-gray-600 mb-4">
                    Transform trending content for your brand. Adapt ideas across platforms seamlessly.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter trend or content to remix..."
                      value={remixInput}
                      onChange={(e) => setRemixInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleRemixContent()}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent transition-all outline-none text-sm"
                    />
                    <button
                      onClick={handleRemixContent}
                      disabled={loadingStates.remixEngine}
                      className="flex items-center gap-2 px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {loadingStates.remixEngine ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span>Remixing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Start Remixing</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {remixOutput && (
                <button
                  onClick={() => toggleCard('remixEngine')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  {collapsedCards.remixEngine ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              )}
            </div>

            {/* Remix Output */}
            {remixOutput && !collapsedCards.remixEngine && (
              <div className="mt-6 pt-6 border-t border-gray-200 animate-fadeIn">
                <RemixContentDisplay 
                  content={remixOutput}
                  onCopy={(idea, index) => handleCopyIdea(idea, `remix-${index}`)}
                  copiedIdea={copiedIdea}
                  onClearAndRemix={() => {
                    setRemixInput('');
                    setRemixOutput(null);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Trend Forecaster Card - Paid Tiers Only */}
        <div className={`trend-card bg-gradient-to-br ${checkFeatureAccess('trendForecasts') ? 'from-cyan-50 to-blue-50' : 'from-gray-50 to-gray-100'} rounded-xl shadow-sm border ${checkFeatureAccess('trendForecasts') ? 'border-cyan-200' : 'border-gray-300'} overflow-hidden hover:shadow-lg transition-all relative`}>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-huttle-primary to-blue-500 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <AIDisclaimerTooltip phraseIndex={3} position="right">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">Trend Forecaster</h3>
                      {!checkFeatureAccess('trendForecasts') && (
                        <span className="px-2 py-1 bg-gradient-to-r from-huttle-primary to-blue-500 text-white text-xs font-bold rounded">
                          PRO
                        </span>
                      )}
                    </div>
                  </AIDisclaimerTooltip>
                  <p className="text-sm text-gray-700 mb-4">
                    Get a 7-day outlook for rising trends in {brandData?.niche || 'your niche'} with velocity predictions and actionable post ideas.
                  </p>
                  {!checkFeatureAccess('trendForecasts') ? (
                    <div className="space-y-3">
                      <div className="bg-white/60 rounded-lg p-4 border border-gray-300">
                        <p className="text-sm text-gray-600 italic">
                          "Eco-travel hooks surge next week: 3 remix ideas ready"
                        </p>
                        <p className="text-xs text-gray-500 mt-2">Preview of what you'll get</p>
                      </div>
                      <button
                        onClick={() => {
                          setUpgradeFeature('trendForecasts');
                          setShowUpgradeModal(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-huttle-primary to-blue-500 text-white rounded-lg hover:from-huttle-primary-dark hover:to-blue-600 transition-all shadow-md hover:shadow-lg font-semibold"
                      >
                        <Zap className="w-5 h-5" />
                        Upgrade to Unlock
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleForecastTrends}
                      disabled={isLoadingForecaster}
                      className="flex items-center gap-2 px-6 py-3 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingForecaster ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span>Forecasting Trends...</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-5 h-5" />
                          <span>Generate 7-Day Forecast</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {trendForecast && checkFeatureAccess('trendForecasts') && (
                <button
                  onClick={() => toggleCard('trendForecaster')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  {collapsedCards.trendForecaster ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              )}
            </div>

            {/* Trend Forecast Content */}
            {trendForecast && !collapsedCards.trendForecaster && checkFeatureAccess('trendForecasts') && (
              <div className="space-y-6 mt-6 pt-6 border-t border-cyan-200 animate-fadeIn">
                <AIDisclaimerFooter 
                  phraseIndex={0} 
                  className="mb-4"
                  onModalOpen={() => setShowHowWePredictModal(true)}
                />
                {/* Timeline View */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-huttle-primary" />
                    Trend Timeline
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {trendForecast.timeline.map((item, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg p-4 border border-cyan-200 hover:border-huttle-primary transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-semibold text-huttle-primary bg-huttle-primary/10 px-2 py-1 rounded">
                            {item.day}
                          </span>
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            item.confidence === 'High' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.confidence}
                          </span>
                        </div>
                        <h5 className="font-bold text-gray-900 mb-1">{item.trend}</h5>
                        <p className="text-sm text-green-600 font-semibold">
                          Velocity: {item.velocity}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Post Ideas */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Tailored Post Ideas
                  </h4>
                  <div className="bg-white rounded-lg p-4 border border-cyan-200">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans mb-4">
                      {trendForecast.postIdeas}
                    </pre>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCopyIdea(trendForecast.postIdeas, 'all')}
                        className="flex items-center gap-2 px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all text-sm font-medium"
                      >
                        {copiedIdea === 'all' ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy All Ideas</span>
                          </>
                        )}
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium">
                        <Download className="w-4 h-4" />
                        <span>Save for Later</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Citations */}
                {trendForecast.citations && trendForecast.citations.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <p className="font-semibold mb-1">Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {trendForecast.citations.slice(0, 3).map((citation, i) => (
                        <a
                          key={i}
                          href={citation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-huttle-primary hover:underline"
                        >
                          Source {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Personalized Trend Alerts */}
        <div
          className="trend-card bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
          onClick={() => {
            setActiveFeature('alerts');
            showToast('Setting up personalized trend alerts...', 'info');
            setTimeout(() => {
              showToast(`Alerts activated for ${brandData?.niche || 'your niche'}! You'll be notified of trending topics daily.`, 'success');
            }, 1500);
          }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2 text-blue-900">Personalized Trend Alerts</h3>
              <p className="text-sm text-blue-700 mb-4">
                Get real-time notifications when trends spike in your niche. Never miss an opportunity.
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium">
                <span>Set Up Alerts</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Quick Tips Section */}
      <div className="mt-8 bg-gradient-to-r from-huttle-primary/10 to-huttle-primary-light/10 rounded-xl border border-huttle-primary/20 p-6">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-huttle-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Pro Tip</h3>
            <p className="text-sm text-gray-700">
              Use Trend Radar daily to stay ahead of the curve. Combine it with the Remix Engine to quickly 
              adapt trending content to your brand voice and increase engagement by up to 30%.
            </p>
          </div>
        </div>
      </div>

      {/* How We Predict Modal */}
      <HowWePredictModal 
        isOpen={showHowWePredictModal} 
        onClose={() => setShowHowWePredictModal(false)} 
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          setUpgradeFeature(null);
        }}
        feature={upgradeFeature}
      />
    </div>
  );
}

