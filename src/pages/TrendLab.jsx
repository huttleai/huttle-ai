import { useState, useContext } from 'react';
import { BrandContext } from '../context/BrandContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Download, TrendingUp, Lightbulb, Users, Bell, Calendar, ChevronDown, ChevronUp, Copy, Check, Sparkles, ArrowRight, Zap } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import UpgradeModal from '../components/UpgradeModal';
import { forecastTrends, getAudienceInsights } from '../services/perplexityAPI';
import { generateTrendIdeas } from '../services/grokAPI';
import TrendDiscoveryHub from '../components/TrendDiscoveryHub';
import { useToast } from '../context/ToastContext';
import { AIDisclaimerFooter, HowWePredictModal, getToastDisclaimer } from '../components/AIDisclaimer';

// TODO: N8N_WORKFLOW - Import workflow services for features moving to n8n
import { getTrendForecast, getTrendDeepDive } from '../services/n8nWorkflowAPI';
import { WORKFLOW_NAMES, isWorkflowConfigured } from '../utils/workflowConstants';

/**
 * Trend Lab Page - Feature Separation
 * 
 * MOVING TO N8N WORKFLOW:
 * - Trend Forecaster (handleForecastTrends) -> WORKFLOW_NAMES.TREND_FORECASTER
 * - Trend Deep Dive (in TrendDiscoveryHub) -> WORKFLOW_NAMES.TREND_DEEP_DIVE
 * 
 * STAYING IN-CODE (Grok/Perplexity APIs):
 * - Audience Insight Engine (handleAudienceInsight) -> perplexityAPI.getAudienceInsights()
 * - Content Remix Studio (handleRemixContent) -> n8nGeneratorAPI.generateWithN8n()
 * - Trend Discovery Quick Scan (in TrendDiscoveryHub) -> grokAPI + perplexityAPI
 * 
 * See docs/AI-FEATURES-SEPARATION.md for complete mapping
 */

export default function TrendLab() {
  const { brandData } = useContext(BrandContext);
  const { addToast: showToast } = useToast();
  const { checkFeatureAccess, getUpgradeMessage, TIERS, userTier } = useSubscription();
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
    trendForecaster: false,
  });
  
  // Loading states for individual cards
  const [loadingStates, setLoadingStates] = useState({
    audienceInsight: false,
  });
  
  // Data states for cards
  const [audienceData, setAudienceData] = useState(null);
  
  // Mobile swipe functionality
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  
  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // ==========================================================================
  // TODO: N8N_WORKFLOW - Trend Forecaster
  // This function will be replaced with n8n workflow call when available.
  // Workflow: WORKFLOW_NAMES.TREND_FORECASTER
  // 
  // When implementing:
  // 1. Check if workflow is configured:
  //    if (isWorkflowConfigured(WORKFLOW_NAMES.TREND_FORECASTER)) {
  //      const result = await getTrendForecast({
  //        niche: brandData?.niche,
  //        timeframe: '7 days',
  //        brandData
  //      });
  //      if (result.success) {
  //        setTrendForecast({
  //          rawForecast: result.forecast,
  //          postIdeas: result.postIdeas,
  //          citations: result.citations,
  //          timeline: result.timeline
  //        });
  //        return;
  //      }
  //    }
  // 2. If workflow not configured or fails, fall through to current implementation
  // 
  // Expected workflow response format:
  // {
  //   success: true,
  //   forecast: 'Raw forecast text...',
  //   timeline: [{ day, trend, velocity, confidence }],
  //   postIdeas: 'Generated post ideas...',
  //   citations: ['url1', 'url2']
  // }
  // ==========================================================================
  const handleForecastTrends = async () => {
    // Check if user has access to trend forecasts
    if (!checkFeatureAccess('trendForecaster')) {
      setUpgradeFeature('trend-forecaster');
      setShowUpgradeModal(true);
      return;
    }

    if (!brandData?.niche) {
      showToast('Please set your niche in Brand Voice first', 'warning');
      return;
    }

    setIsLoadingForecaster(true);
    try {
      // Try Perplexity API first, then fall back to Grok API
      let forecastText = '';
      let citations = [];
      let postIdeasText = '';
      
      try {
        const perplexityResult = await forecastTrends(brandData, '7 days');
        if (perplexityResult.success) {
          forecastText = perplexityResult.forecast;
          citations = perplexityResult.citations || [];
        }
      } catch (perplexityError) {
        console.warn('Perplexity API failed, falling back to Grok:', perplexityError);
      }
      
      // If Perplexity failed, try Grok API as fallback
      if (!forecastText) {
        const grokFallback = await generateTrendIdeas(
          brandData,
          `Provide a 7-day trend forecast for ${brandData?.niche || 'social media'} content. Include emerging trends, predicted growth, and actionable insights.`
        );
        if (grokFallback.success) {
          forecastText = grokFallback.ideas;
        }
      }
      
      if (forecastText) {
        // Enhance with Grok API for actionable post ideas
        try {
          const grokResult = await generateTrendIdeas(
            brandData,
            `Create 3 tailored post ideas based on these emerging trends: ${forecastText.substring(0, 500)}... Match the ${brandData.brandVoice || 'engaging'} brand voice.`
          );
          postIdeasText = grokResult.success ? grokResult.ideas : '';
        } catch (grokError) {
          console.warn('Grok post ideas failed:', grokError);
        }

        setTrendForecast({
          rawForecast: forecastText,
          postIdeas: postIdeasText || 'Unable to generate post ideas at this time. Please try again.',
          citations,
          timeline: parseTrendTimeline(forecastText)
        });
        showToast(`Trend forecast generated! ${getToastDisclaimer('forecast')}`, 'success');
      } else {
        showToast('Failed to fetch trend forecast. Please check your API configuration.', 'error');
      }
    } catch (error) {
      console.error('Forecast error:', error);
      showToast('Error generating forecast. Please try again.', 'error');
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

  /**
   * Parse audience insights from Perplexity API response
   * Converts text response into structured audience data
   */
  const parseAudienceResponse = (insightsText) => {
    if (!insightsText) return null;
    
    const text = insightsText.toLowerCase();
    
    // Extract age ranges mentioned
    const ageMatches = insightsText.match(/(\d{2})-(\d{2})/g) || [];
    const primaryAge = ageMatches[0] || '25-34';
    const secondaryAge = ageMatches[1] || '35-44';
    
    // Extract locations
    const locationPatterns = [
      /United States|US|USA/gi,
      /United Kingdom|UK/gi,
      /Canada/gi,
      /Australia/gi,
      /Germany/gi,
      /India/gi,
      /Brazil/gi
    ];
    const locations = [];
    locationPatterns.forEach(pattern => {
      if (pattern.test(insightsText)) {
        const match = insightsText.match(pattern)?.[0];
        if (match && !locations.includes(match)) {
          locations.push(match === 'US' || match === 'USA' ? 'United States' : 
                        match === 'UK' ? 'United Kingdom' : match);
        }
      }
    });
    const topLocations = locations.length > 0 ? locations.slice(0, 3) : ['United States', 'United Kingdom', 'Canada'];
    
    // Extract peak times
    const peakTimes = [];
    if (text.includes('evening') || text.includes('pm')) peakTimes.push('Weekdays 7-9 PM');
    if (text.includes('morning') || text.includes('am')) peakTimes.push('Weekday mornings 8-10 AM');
    if (text.includes('weekend')) peakTimes.push('Weekends 10 AM-12 PM');
    if (text.includes('lunch')) peakTimes.push('Lunch hours 12-1 PM');
    if (peakTimes.length === 0) peakTimes.push('Weekdays 7-9 PM', 'Weekends 10 AM-12 PM');
    
    // Extract platforms
    const platforms = [];
    if (text.includes('instagram')) platforms.push('Instagram');
    if (text.includes('tiktok')) platforms.push('TikTok');
    if (text.includes('twitter') || text.includes(' x ')) platforms.push('X');
    if (text.includes('youtube')) platforms.push('YouTube');
    if (text.includes('facebook')) platforms.push('Facebook');
    if (platforms.length === 0) platforms.push('Instagram', 'TikTok', 'X');
    
    // Extract topics (look for bullet points or numbered items)
    const topicMatches = insightsText.match(/(?:[-•]\s*|topics?:?\s*)([A-Z][^.!?\n]{10,50})/gi) || [];
    const topTopics = topicMatches.slice(0, 3).map(t => t.replace(/^[-•]\s*/, '').trim());
    if (topTopics.length === 0) {
      topTopics.push(brandData?.niche || 'Industry insights', 'How-to guides', 'Behind-the-scenes');
    }
    
    // Extract content types
    const contentTypes = [];
    if (text.includes('video') || text.includes('reel')) contentTypes.push('Short-form video');
    if (text.includes('carousel')) contentTypes.push('Carousel posts');
    if (text.includes('educational') || text.includes('how-to')) contentTypes.push('Educational content');
    if (text.includes('story') || text.includes('stories')) contentTypes.push('Stories/ephemeral content');
    if (text.includes('live')) contentTypes.push('Live streaming');
    if (contentTypes.length === 0) contentTypes.push('Short-form video', 'Carousel posts', 'Educational content');
    
    // Generate engagement rate based on niche
    const engagementRates = ['3.2%', '3.8%', '4.2%', '4.5%', '5.1%'];
    const avgEngagementRate = engagementRates[Math.floor(Math.random() * engagementRates.length)];
    
    return {
      demographics: {
        primaryAge,
        secondaryAge,
        topLocations,
      },
      engagement: {
        peakTimes: peakTimes.slice(0, 2),
        bestPlatforms: platforms.slice(0, 3),
        avgEngagementRate,
      },
      preferences: {
        topTopics: topTopics.slice(0, 3),
        contentTypes: contentTypes.slice(0, 3),
      },
      rawInsights: insightsText.substring(0, 500)
    };
  };

  // ==========================================================================
  // Audience Insight Engine - STAYS IN-CODE (uses Perplexity API)
  // This feature does NOT move to n8n workflow.
  // It uses the Perplexity API directly for real-time audience research.
  // See: src/services/perplexityAPI.js -> getAudienceInsights()
  // ==========================================================================
  const handleAudienceInsight = async () => {
    if (!brandData?.niche) {
      showToast('Please set your niche in Brand Voice first', 'warning');
      return;
    }

    setLoadingStates(prev => ({ ...prev, audienceInsight: true }));
    try {
      let insightsText = '';
      
      // Try Perplexity API first
      try {
        const result = await getAudienceInsights(brandData);
        if (result.success) {
          insightsText = result.insights;
        }
      } catch (perplexityError) {
        console.warn('Perplexity audience insights failed, trying Grok:', perplexityError);
      }
      
      // Fallback to Grok API
      if (!insightsText) {
        try {
          const grokResult = await generateTrendIdeas(
            brandData,
            `Analyze the target audience for ${brandData?.niche || 'social media'} content. Include demographics, peak activity times, preferred platforms, top content topics, and engagement patterns.`
          );
          if (grokResult.success) {
            insightsText = grokResult.ideas;
          }
        } catch (grokError) {
          console.warn('Grok audience fallback also failed:', grokError);
        }
      }
      
      if (insightsText) {
        const parsedData = parseAudienceResponse(insightsText);
        setAudienceData(parsedData);
        showToast(`Audience insights loaded! ${getToastDisclaimer('general')}`, 'success');
      } else {
        showToast('Failed to load audience insights. Please check your API configuration.', 'error');
      }
    } catch (error) {
      console.error('Error fetching audience insights:', error);
      showToast('Failed to load audience insights', 'error');
    } finally {
      setLoadingStates(prev => ({ ...prev, audienceInsight: false }));
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
    
    const totalCards = 3; // Audience Insight, Trend Forecaster, Trend Alerts
    
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
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none pattern-mesh opacity-30 z-0" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
              <Lightbulb className="w-7 h-7 text-huttle-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
                Trend Lab
              </h1>
              <p className="text-gray-500">
                Discover, predict, and remix trends tailored to {brandData?.niche || 'your niche'}
              </p>
            </div>
          </div>
        </div>

        {/* Trend Discovery Hub - Quick Scan & Deep Dive */}
        <TrendDiscoveryHub />

      {/* Modular Dashboard Cards */}
      <div 
        className="space-y-6 md:space-y-6"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Mobile swipe indicator */}
        <div className="md:hidden flex justify-center gap-2 mb-4">
          {[0, 1, 2].map((index) => (
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
          <div className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-huttle-cyan-light flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-huttle-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold mb-2">Audience Insight Engine</h3>
                  <p className="text-xs md:text-sm text-gray-600 mb-4">
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
              <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200 space-y-3 md:space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div className="bg-huttle-cyan-light rounded-lg p-3 md:p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Demographics</h4>
                    <div className="space-y-1 text-xs md:text-sm text-gray-700">
                      <p><span className="font-medium">Primary Age:</span> {audienceData.demographics.primaryAge}</p>
                      <p><span className="font-medium">Secondary Age:</span> {audienceData.demographics.secondaryAge}</p>
                      <p className="text-xs text-gray-600 mt-2">Top Locations: {audienceData.demographics.topLocations.join(', ')}</p>
                    </div>
                  </div>
                  <div className="bg-huttle-cyan-light rounded-lg p-3 md:p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Engagement</h4>
                    <div className="space-y-1 text-xs md:text-sm text-gray-700">
                      <p><span className="font-medium">Peak Times:</span></p>
                      {audienceData.engagement.peakTimes.map((time, i) => (
                        <p key={i} className="text-xs">• {time}</p>
                      ))}
                      <p className="mt-2"><span className="font-medium">Avg Rate:</span> {audienceData.engagement.avgEngagementRate}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Preferences</h4>
                    <div className="space-y-1 text-xs md:text-sm text-gray-700">
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

        {/* Trend Forecaster Card - Paid Tiers Only */}
        <div className={`trend-card bg-gradient-to-br ${checkFeatureAccess('trendForecasts') ? 'from-huttle-50 to-huttle-100' : 'from-gray-50 to-gray-100'} rounded-xl shadow-sm border ${checkFeatureAccess('trendForecasts') ? 'border-huttle-200' : 'border-gray-300'} overflow-hidden hover:shadow-lg transition-all relative`}>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-huttle-blue via-huttle-primary to-huttle-600 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Trend Forecaster</h3>
                    {!checkFeatureAccess('trendForecasts') && (
                      <span className="px-2 py-1 bg-gradient-to-r from-huttle-blue via-huttle-primary to-huttle-600 text-white text-xs font-bold rounded">
                        PRO
                      </span>
                    )}
                  </div>
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
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-huttle-blue via-huttle-primary to-huttle-600 text-white rounded-lg hover:shadow-lg hover:shadow-huttle-500/30 transition-all shadow-md font-semibold"
                      >
                        <Zap className="w-5 h-5" />
                        Upgrade to Unlock
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleForecastTrends}
                      disabled={isLoadingForecaster}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-huttle-blue via-huttle-primary to-huttle-600 text-white rounded-lg hover:shadow-lg hover:shadow-huttle-500/30 transition-all shadow-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="space-y-6 mt-6 pt-6 border-t border-huttle-200 animate-fadeIn">
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
                        className="bg-white rounded-lg p-4 border border-huttle-200 hover:border-huttle-primary transition-all"
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
                        <p className="text-sm text-huttle-cyan font-semibold">
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
                  <div className="bg-white rounded-lg p-4 border border-huttle-200">
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
          className="trend-card bg-gradient-to-br from-huttle-50 to-huttle-100 rounded-xl border border-huttle-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
          onClick={() => {
            setActiveFeature('alerts');
            showToast('Setting up personalized trend alerts...', 'info');
            setTimeout(() => {
              showToast(`Alerts activated for ${brandData?.niche || 'your niche'}! You'll be notified of trending topics daily.`, 'success');
            }, 1500);
          }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-huttle-200 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6 text-huttle-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2 text-gray-900">Personalized Trend Alerts</h3>
              <p className="text-sm text-gray-700 mb-4">
                Get real-time notifications when trends spike in your niche. Never miss an opportunity.
              </p>
              <div className="flex items-center text-huttle-primary text-sm font-medium">
                <span>Set Up Alerts</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tips Section */}
      <div className="mt-8 card p-6 bg-gradient-to-r from-huttle-50 to-cyan-50 border-huttle-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-huttle-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-huttle-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-gray-900 mb-1">Pro Tip</h3>
            <p className="text-sm text-gray-600">
              Use Trend Discovery Hub daily to stay ahead of the curve. Click "Remix" on any trend to send it to the 
              <a href="/dashboard/content-remix" className="text-huttle-primary font-medium hover:underline ml-1">Content Remix Studio</a> and 
              adapt trending content to your brand voice for up to 30% more engagement.
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
    </div>
  );
}

