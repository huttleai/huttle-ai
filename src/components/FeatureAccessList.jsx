import { Check, Lock, Crown } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { useNavigate } from 'react-router-dom';

const ALL_FEATURES = [
  {
    name: 'AI Caption Generator',
    key: 'caption-generator',
    tiers: ['free', 'essentials', 'pro'],
    description: 'Create engaging captions with AI'
  },
  {
    name: 'Hashtag Generator',
    key: 'hashtag-generator',
    tiers: ['free', 'essentials', 'pro'],
    description: 'Find trending hashtags'
  },
  {
    name: 'Hook Builder',
    key: 'hook-builder',
    tiers: ['free', 'essentials', 'pro'],
    description: 'Craft attention-grabbing openers'
  },
  {
    name: 'CTA Suggester',
    key: 'cta-suggester',
    tiers: ['free', 'essentials', 'pro'],
    description: 'Generate call-to-action phrases'
  },
  {
    name: 'Content Quality Scorer',
    key: 'quality-scorer',
    tiers: ['free', 'essentials', 'pro'],
    description: 'Score and improve your content'
  },
  {
    name: 'AI Visual Brainstormer',
    key: 'visual-brainstormer',
    tiers: ['free', 'essentials', 'pro'],
    description: 'Generate visual content concepts'
  },
  {
    name: 'Content Repurposer',
    key: 'content-repurposer',
    tiers: ['pro'],
    description: 'Transform content across formats',
    proBadge: true
  },
  {
    name: 'Huttle Agent Chat',
    key: 'huttle-agent',
    tiers: ['pro'],
    description: 'AI content strategist assistant',
    proBadge: true
  },
  {
    name: 'AI Plan Builder',
    key: 'plan-builder',
    tiers: ['free', 'essentials', 'pro'],
    description: 'Create content strategies'
  },
  {
    name: 'Trend Lab',
    key: 'trend-lab',
    tiers: ['free', 'essentials', 'pro'],
    description: 'Discover trending topics'
  },
  {
    name: 'Content Library',
    key: 'content-library',
    tiers: ['free', 'essentials', 'pro'],
    description: 'Store and organize your content',
    limits: {
      free: '250MB',
      essentials: '5GB',
      pro: '25GB'
    }
  },
  {
    name: 'Smart Calendar',
    key: 'smart-calendar',
    tiers: ['free', 'essentials', 'pro'],
    description: 'Schedule and manage posts',
    limits: {
      free: '10 posts',
      essentials: '50 posts',
      pro: 'Unlimited'
    }
  }
];

export default function FeatureAccessList({ compact = false }) {
  const { userTier, TIERS } = useSubscription();
  const navigate = useNavigate();

  const currentTier = userTier?.toLowerCase() || 'free';

  const canAccess = (feature) => {
    return feature.tiers.includes(currentTier);
  };

  const getLimit = (feature) => {
    if (!feature.limits) return null;
    return feature.limits[currentTier];
  };

  const handleUpgrade = () => {
    navigate('/dashboard/subscription');
  };

  if (compact) {
    // Compact view for profile page
    return (
      <div className="space-y-2">
        {ALL_FEATURES.map((feature) => {
          const hasAccess = canAccess(feature);
          const limit = getLimit(feature);
          
          return (
            <div
              key={feature.key}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                hasAccess
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {hasAccess ? (
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${hasAccess ? 'text-gray-900' : 'text-gray-500'}`}>
                    {feature.name}
                  </p>
                  {limit && (
                    <p className="text-xs text-gray-600">{limit}</p>
                  )}
                </div>
              </div>
              
              {feature.proBadge && !hasAccess && (
                <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-500 px-2 py-1 rounded-full">
                  <Crown className="w-3 h-3 text-white" />
                  <span className="text-xs font-bold text-white">PRO</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Full view for subscription page
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Free Tier */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">$0</p>
          <p className="text-sm text-gray-600">20 AI generations/month</p>
        </div>
        
        <ul className="space-y-3 mb-6">
          {ALL_FEATURES.filter(f => f.tiers.includes('free')).map((feature) => (
            <li key={feature.key} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{feature.name}</p>
                {feature.limits?.free && (
                  <p className="text-xs text-gray-600">{feature.limits.free}</p>
                )}
              </div>
            </li>
          ))}
          
          {ALL_FEATURES.filter(f => !f.tiers.includes('free')).slice(0, 2).map((feature) => (
            <li key={feature.key} className="flex items-start gap-2 opacity-50">
              <Lock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600">{feature.name}</p>
            </li>
          ))}
        </ul>
        
        {currentTier === 'free' ? (
          <button
            disabled
            className="w-full py-2 bg-gray-200 text-gray-600 rounded-lg font-semibold cursor-default"
          >
            Current Plan
          </button>
        ) : (
          <button
            onClick={handleUpgrade}
            className="w-full py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-huttle-primary transition-all font-semibold"
          >
            Downgrade
          </button>
        )}
      </div>

      {/* Essentials Tier */}
      <div className="bg-white rounded-xl border-2 border-huttle-300 p-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-huttle-primary mb-2">Essentials</h3>
          <p className="text-3xl font-bold text-gray-900 mb-1">$9</p>
          <p className="text-sm text-gray-600">300 AI generations/month</p>
        </div>
        
        <ul className="space-y-3 mb-6">
          {ALL_FEATURES.filter(f => f.tiers.includes('essentials')).map((feature) => (
            <li key={feature.key} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{feature.name}</p>
                {feature.limits?.essentials && (
                  <p className="text-xs text-gray-600">{feature.limits.essentials}</p>
                )}
              </div>
            </li>
          ))}
          
          {ALL_FEATURES.filter(f => !f.tiers.includes('essentials')).slice(0, 1).map((feature) => (
            <li key={feature.key} className="flex items-start gap-2 opacity-50">
              <Lock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600">{feature.name}</p>
            </li>
          ))}
        </ul>
        
        {currentTier === 'essentials' ? (
          <button
            disabled
            className="w-full py-2 bg-huttle-primary text-white rounded-lg font-semibold cursor-default"
          >
            Current Plan
          </button>
        ) : (
          <button
            onClick={handleUpgrade}
            className="w-full py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all font-semibold"
          >
            {currentTier === 'free' ? 'Upgrade' : 'Downgrade'}
          </button>
        )}
      </div>

      {/* Pro Tier */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1 bg-yellow-400 px-3 py-1 rounded-full">
            <Crown className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">BEST VALUE</span>
          </div>
        </div>
        
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
          <p className="text-3xl font-bold text-white mb-1">$19</p>
          <p className="text-sm text-white/80">800 AI generations/month</p>
        </div>
        
        <ul className="space-y-3 mb-6">
          {ALL_FEATURES.map((feature) => (
            <li key={feature.key} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{feature.name}</p>
                {feature.limits?.pro && (
                  <p className="text-xs text-white/70">{feature.limits.pro}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        
        {currentTier === 'pro' ? (
          <button
            disabled
            className="w-full py-2 bg-white/20 text-white rounded-lg font-semibold cursor-default"
          >
            Current Plan
          </button>
        ) : (
          <button
            onClick={handleUpgrade}
            className="w-full py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-all font-semibold"
          >
            Upgrade to Pro
          </button>
        )}
      </div>
    </div>
  );
}

