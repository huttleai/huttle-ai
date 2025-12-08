import { useState } from 'react';
import { Info, HelpCircle, X } from 'lucide-react';

// Rotating disclaimer phrases for variety (empowering, not warning-heavy)
const DISCLAIMER_PHRASES = {
  tooltip: [
    "AI estimate based on 1,000+ trend patterns—real results vary by timing & audience. Tweak and test!",
    "Powered by real-time data—your mileage may vary. Use this as a starting point!",
    "AI-generated insight from trending patterns. Adapt to your unique audience!",
    "Smart prediction based on current trends. Your creativity makes it work!",
  ],
  // Specific phrases for different sections
  hashtags: [
    "AI-recommended hashtags trending in your niche right now. These hashtags are selected based on current engagement rates, growth velocity, and relevance to your brand. Copy and use them in your posts to increase discoverability!",
    "Curated hashtags showing high engagement potential in your industry. Updated daily based on real-time social media data. Mix these with your brand-specific hashtags for best results.",
    "Trending hashtags selected by AI analysis of millions of posts in your niche. These tags are currently gaining momentum—use them while they're hot to boost your reach!",
  ],
  insights: [
    "AI-powered insights analyzing your content patterns and engagement data. These recommendations identify opportunities to improve your posting strategy, optimal timing, and content mix based on what's working in your niche.",
    "Smart recommendations generated from your posting history and trending patterns. These insights help you understand what content types, topics, and timing drive the best engagement for your audience.",
    "Personalized AI insights tailored to your brand and niche. Based on analysis of successful posts in your industry, these suggestions help you optimize your content strategy and posting schedule.",
  ],
  footer: [
    "Powered by real-time trends & your data—predictions are guides, not guarantees. Past performance isn't future-proof.",
    "AI insights based on live data—treat as inspiration, not certainty. Test and refine!",
    "Generated from 1,000+ trend patterns—your audience is unique. Experiment and optimize!",
    "Real-time AI analysis—results depend on timing, platform, and your brand voice.",
  ]
};

// Get a rotating phrase based on index
const getRotatingPhrase = (type, index = 0) => {
  const phrases = DISCLAIMER_PHRASES[type] || DISCLAIMER_PHRASES.tooltip;
  if (!phrases) return DISCLAIMER_PHRASES.tooltip[0];
  return phrases[index % phrases.length];
};

// Tooltip Disclaimer Component (for hover states)
export function AIDisclaimerTooltip({ children, phraseIndex = 0, position = 'top', className = '' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => setIsVisible(true), 300);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  // For 'right' position, show above to avoid overlap and clipping
  const effectivePosition = position === 'right' ? 'top' : position;
  
  // Determine which phrase type to use based on phraseIndex
  const getPhraseType = () => {
    if (phraseIndex === 1) return 'hashtags';
    if (phraseIndex === 2) return 'insights';
    return 'tooltip';
  };
  
  const phraseType = getPhraseType();

  const getPositionClasses = () => {
    switch (effectivePosition) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (effectivePosition) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 border-t-white';
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 border-b-white';
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 border-l-white';
      default:
        return 'top-full left-1/2 -translate-x-1/2 border-t-white';
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {children}
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="ml-1 cursor-help relative z-10"
      >
        <Info className="w-3.5 h-3.5 text-huttle-primary hover:text-huttle-primary-dark transition-colors" />
        
        {isVisible && (
          <div 
            className={`absolute ${getPositionClasses()} z-50`}
            style={{ 
              width: phraseType === 'hashtags' || phraseType === 'insights' ? '320px' : '300px',
              maxWidth: 'min(320px, calc(100vw - 2rem))',
              pointerEvents: 'none',
            }}
          >
            <div className="bg-gradient-to-br from-huttle-primary to-blue-500 text-white text-sm rounded-xl px-4 py-3.5 shadow-2xl border-2 border-white/20 leading-relaxed w-full box-border backdrop-blur-sm animate-fadeIn">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/90" />
                <div className="text-left flex-1">
                  {getRotatingPhrase(phraseType, 0)}
                </div>
              </div>
            </div>
            {/* Arrow pointing to info icon */}
            {effectivePosition === 'top' && (
              <div 
                className="absolute top-full left-1/2 -translate-x-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid #00bad3',
                }}
              />
            )}
            {effectivePosition === 'bottom' && (
              <div 
                className="absolute bottom-full left-1/2 -translate-x-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderBottom: '8px solid #00bad3',
                }}
              />
            )}
            {effectivePosition === 'left' && (
              <div 
                className="absolute left-full top-1/2 -translate-y-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  borderLeft: '8px solid #00bad3',
                }}
              />
            )}
            {effectivePosition === 'right' && (
              <div 
                className="absolute right-full top-1/2 -translate-y-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  borderRight: '8px solid #00bad3',
                }}
              />
            )}
          </div>
        )}
      </span>
    </div>
  );
}

// Footer Disclaimer Component (for output cards)
export function AIDisclaimerFooter({ 
  phraseIndex = 0, 
  showModal = true,
  onModalOpen,
  className = '' 
}) {
  return (
    <div className={`flex items-start gap-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="leading-relaxed">
          {getRotatingPhrase('footer', phraseIndex)}
        </p>
        {showModal && (
          <button
            onClick={onModalOpen}
            className="text-blue-600 hover:text-blue-700 font-medium underline mt-1 inline-flex items-center gap-1"
          >
            How We Predict
            <HelpCircle className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// "How We Predict" Modal Component
export function HowWePredictModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-huttle-primary to-blue-500 text-white p-6 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">How We Predict Trends</h2>
              <p className="text-sm text-white/90">
                Powered by our proprietary AI algorithm
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Our Stack */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-huttle-primary/10 flex items-center justify-center text-huttle-primary font-bold">
                1
              </span>
              Our AI Stack
            </h3>
            <div className="space-y-3 ml-10">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-1">Advanced AI Models</h4>
                <p className="text-sm text-gray-700">
                  Our proprietary algorithm combines multiple AI models to analyze social media trends, engagement patterns, and viral content across platforms. Trained on billions of posts to understand what resonates.
                </p>
              </div>
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-1">Real-Time Data Intelligence</h4>
                <p className="text-sm text-gray-700">
                  Live web search and trend forecasting powered by our custom-designed algorithm. Pulls real-time data from news, social platforms, and industry sources to predict what's about to spike in your niche.
                </p>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-bold">
                2
              </span>
              How Predictions Work
            </h3>
            <div className="ml-10 space-y-2 text-sm text-gray-700">
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-1">•</span>
                <span><strong>Pattern Recognition:</strong> We analyze 1,000+ successful posts in your niche to identify what drives engagement.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-1">•</span>
                <span><strong>Real-Time Data:</strong> Live trend velocity tracking shows what's gaining momentum right now.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-1">•</span>
                <span><strong>Your Brand Context:</strong> Predictions are tailored to your brand voice, niche, and audience demographics.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-1">•</span>
                <span><strong>Platform-Specific:</strong> Different algorithms for Instagram, TikTok, X (Twitter), etc.</span>
              </p>
            </div>
          </div>

          {/* Accuracy & Limitations */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 font-bold">
                3
              </span>
              Accuracy & Limitations
            </h3>
            <div className="ml-10 space-y-3">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-gray-700">
                  <strong className="text-green-700">What We're Good At:</strong> Spotting emerging trends early, predicting optimal posting times, generating engaging hooks, and identifying high-performing hashtags.
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-700">
                  <strong className="text-yellow-700">What to Remember:</strong> Every audience is unique. AI predictions are starting points—your creativity, timing, and testing make the difference. Past performance doesn't guarantee future results.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-xl border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all font-semibold"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline disclaimer for toast messages
export function getToastDisclaimer(type = 'general') {
  const disclaimers = {
    forecast: "AI prediction—test and adapt to your audience!",
    virality: "Score based on trends—your creativity drives results!",
    remix: "AI-generated suggestion—make it yours!",
    general: "AI-powered insight—tweak for best results!",
  };
  return disclaimers[type] || disclaimers.general;
}

export default AIDisclaimerFooter;

