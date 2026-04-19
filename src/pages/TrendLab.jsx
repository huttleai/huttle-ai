import { useState, useContext } from 'react';
import { BrandContext } from '../context/BrandContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Lightbulb, Bell, Calendar, Copy, Check, Sparkles, ArrowRight } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import UpgradeModal from '../components/UpgradeModal';
import TrendDiscoveryHub from '../components/TrendDiscoveryHub';
import { useToast } from '../context/ToastContext';
import { AIDisclaimerFooter, HowWePredictModal, getToastDisclaimer } from '../components/AIDisclaimer';
import AlgorithmChecker from '../components/AlgorithmChecker';
import { sanitizeAIOutput } from '../utils/textHelpers'; // HUTTLE: sanitized
import { isComingSoonFeature } from '../config/creditConfig';

/**
 * Trend Lab Page - Feature Separation
 * 
 * TREND LAB DATA SOURCES:
 * - Trend Forecaster (planned launch) -> WORKFLOW_NAMES.TREND_FORECASTER
 * - Trend Deep Dive (in TrendDiscoveryHub) -> direct Perplexity Deep Dive route
 *
 * See docs/AI-FEATURES-SEPARATION.md for complete mapping
 */

export default function TrendLab() {
  const { brandData } = useContext(BrandContext);
  const { addToast: showToast } = useToast();
  const { checkFeatureAccess } = useSubscription();
  const [trendForecast, _setTrendForecast] = useState(null);
  const [copiedIdea, setCopiedIdea] = useState(null);
  const [showHowWePredictModal, setShowHowWePredictModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState(null);
  
  // Collapsible card states
  const [collapsedCards, setCollapsedCards] = useState({
    trendForecaster: false,
  });
  
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
    
    const totalCards = 1; // Trend Forecaster
    
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
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-12 lg:ml-64 pt-14 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none pattern-mesh opacity-30 z-0" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="pt-6 md:pt-0 mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
              <Lightbulb className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-huttle-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
                Trend Lab
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                Discover trends, check algorithm fit, and find content opportunities
              </p>
            </div>
          </div>
        </div>

        {/* Trend Discovery Hub - Quick Scan & Deep Dive */}
        <TrendDiscoveryHub />

        {/* Algorithm Alignment Checker Widget */}
        <div className="my-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              Algorithm Alignment Checker
            </h3>
            <p className="text-sm text-gray-500 mt-1">Check how your content aligns with platform algorithm signals</p>
          </div>
          <div className="p-6">
            <AlgorithmChecker />
          </div>
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
          {[0].map((index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                currentCardIndex === index ? 'w-8 bg-huttle-primary' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Trend Forecaster Card — disabled until launch, driven by COMING_SOON_FEATURES. */}
        {(() => {
          const isComingSoon = isComingSoonFeature('trendForecaster');
          return (
        <div
          className={`trend-card rounded-xl shadow-sm border overflow-hidden transition-all relative ${
            isComingSoon
              ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 opacity-80 cursor-not-allowed'
              : 'bg-white border-gray-200 hover:shadow-lg'
          }`}
          aria-disabled={isComingSoon}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-huttle-blue via-huttle-primary to-huttle-600 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Trend Forecaster</h3>
                    {isComingSoon && (
                      <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded">
                        COMING SOON
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-4">
                    {isComingSoon
                      ? `Trend Forecaster is launching soon. You will get a 7-day outlook for rising trends in ${brandData?.niche || 'your niche'} with velocity predictions and actionable post ideas.`
                      : `A 7-day outlook for rising trends in ${brandData?.niche || 'your niche'}.`}
                  </p>
                  <div className="space-y-3">
                    <div className="bg-white/60 rounded-lg p-4 border border-gray-300">
                      <p className="text-sm text-gray-600 italic">
                        {`"${brandData?.niche || 'your niche'} trends surge next week: 3 post ideas ready"`}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">Preview of what you&apos;ll get</p>
                    </div>
                    <button
                      disabled={isComingSoon}
                      aria-disabled={isComingSoon}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                        isComingSoon
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-huttle-primary text-white hover:bg-huttle-primary-dark'
                      }`}
                    >
                      <Calendar className="w-5 h-5" />
                      {isComingSoon ? 'Coming Soon' : 'Generate Forecast'}
                    </button>
                  </div>
                </div>
              </div>
              {!isComingSoon && trendForecast && checkFeatureAccess('trendForecasts') && (
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
            {!isComingSoon && trendForecast && !collapsedCards.trendForecaster && checkFeatureAccess('trendForecasts') && (
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
                        <h5 className="font-bold text-gray-900 mb-1">{sanitizeAIOutput(item.trend)}</h5>
                        <p className="text-sm text-huttle-cyan font-semibold">
                          Velocity: {sanitizeAIOutput(item.velocity)}
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
                      {sanitizeAIOutput(trendForecast.postIdeas)}
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
          );
        })()}

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

