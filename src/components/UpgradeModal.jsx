import { X, Sparkles, Check, Zap } from 'lucide-react';

/**
 * UpgradeModal Component
 * Simple modal for upgrading subscription tiers
 */
export default function UpgradeModal({ isOpen, onClose, feature, featureName }) {
  if (!isOpen) return null;

  const features = {
    storage: {
      title: 'Unlock More Storage',
      description: 'Store more content with increased storage limits for your growing library.',
      preview: '"Upload more photos and videos without hitting limits"',
      benefits: [
        '25 GB storage capacity',
        'Upload more images and videos',
        'Automatic file compression',
        'Organize content in projects',
        'Unlimited scheduled posts'
      ],
      tier: 'Pro'
    },
    trendForecasts: {
      title: 'Unlock Trend Forecaster',
      description: 'Get 7-day niche outlooks with velocity predictions and actionable post ideas.',
      preview: '"Eco-travel hooks surge next week: 3 remix ideas ready"',
      benefits: [
        '7-day trend predictions for your niche',
        'Velocity tracking and confidence scores',
        'Platform-specific remix ideas',
        'Priority trend alerts'
      ],
      tier: 'Pro'
    },
    competitorInspiration: {
      title: 'Unlock Competitor Content Inspiration',
      description: 'Discover trending content patterns in any niche and get AI-powered ideas tailored for your brand.',
      preview: '"Get 5 unique content ideas inspired by trending patterns in your competitor space"',
      benefits: [
        'Analyze trending content in any niche',
        'AI-generated content ideas tailored to your brand',
        'Platform-specific recommendations',
        'One-click copy and remix options'
      ],
      tier: 'Essentials or Pro'
    },
    calendarTemplates: {
      title: 'Unlock Content Calendar Templates',
      description: 'Start with pre-built templates and let AI generate a customized content plan for your brand.',
      preview: '"Product Launch Week template: 7 days of strategic content ready to schedule"',
      benefits: [
        '6 pre-built calendar templates',
        'AI-generated content based on your brand voice',
        'One-click scheduling to your calendar',
        'Customizable post selection'
      ],
      tier: 'Essentials or Pro'
    },
    default: {
      title: 'Upgrade Your Plan',
      description: 'Unlock premium features to supercharge your content strategy.',
      preview: 'Get access to advanced AI tools and insights',
      benefits: [
        '800 AI generations per month',
        'Advanced trend forecasting',
        'Content Repurposer',
        'Huttle Agent',
        '25 GB storage'
      ],
      tier: 'Pro'
    }
  };

  const config = features[feature] || features.default;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full pointer-events-auto animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-huttle-primary to-blue-500 text-white p-6 rounded-t-2xl">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{config.title}</h3>
                <p className="text-sm text-white/90 mt-1">{config.description}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Preview Box */}
            <div className="bg-gradient-to-r from-huttle-primary/10 to-blue-500/10 rounded-lg p-4 mb-6 border border-huttle-primary/20">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-huttle-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-700 font-medium mb-1">
                    {config.preview}
                  </p>
                  <p className="text-xs text-gray-500">Preview of what you'll get</p>
                </div>
              </div>
            </div>

            {/* Benefits List */}
            <div className="space-y-3 mb-6">
              <h4 className="font-semibold text-gray-900">What's included:</h4>
              {config.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-700">{benefit}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button 
              onClick={() => {
                // Navigate to subscription page in production
                // TODO: Implement navigation to /subscription page
                onClose();
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-huttle-primary to-blue-500 text-white rounded-lg hover:from-huttle-primary-dark hover:to-blue-600 transition-all shadow-md hover:shadow-lg font-semibold flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Upgrade to {config.tier}
            </button>

            {/* Footer */}
            <p className="text-xs text-center text-gray-500 mt-4">
              Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

