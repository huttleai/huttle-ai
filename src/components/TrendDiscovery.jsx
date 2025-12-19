import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../config/supabase';
import { getTrendDeepDive } from '../services/n8nWorkflowAPI';
import MarkdownRenderer from './MarkdownRenderer';
import { 
  Search, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  User, 
  MessageSquare,
  ExternalLink,
  Lightbulb,
  Target,
  BookOpen
} from 'lucide-react';
import { 
  Instagram, 
  Music, 
  Twitter, 
  Facebook, 
  Youtube 
} from 'lucide-react';

/**
 * Platform configuration for the multi-select toggle
 * These are the 5 platforms supported by the Deep Research Engine
 */
const PLATFORMS = [
  { id: 'X', name: 'X', icon: Twitter },
  { id: 'TikTok', name: 'TikTok', icon: Music },
  { id: 'Instagram', name: 'Instagram', icon: Instagram },
  { id: 'Facebook', name: 'Facebook', icon: Facebook },
  { id: 'YouTube', name: 'YouTube', icon: Youtube },
];

/**
 * TrendDiscovery - Trend Discovery (Deep Dive) Component
 * 
 * Integrates with n8n TREND_DEEP_DIVE workflow to provide
 * AI-powered trend research with personalized context from user profile.
 */
export default function TrendDiscovery() {
  const { user } = useContext(AuthContext);
  const { addToast: showToast } = useToast();
  
  // User profile state
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  
  // Form state
  const [topic, setTopic] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  
  // Research state
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Fetch user profile from Supabase on mount
   */
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        setProfileLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('user_profile')
          .select('niche, brand_voice_preference, preferred_platforms, target_audience')
          .eq('user_id', user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error fetching user profile:', fetchError);
          showToast('Could not load your profile settings', 'warning');
        }

        if (data) {
          setUserProfile(data);
          // Pre-select platforms from user preferences
          if (data.preferred_platforms?.length > 0) {
            // Map database platform names to our platform IDs
            const mappedPlatforms = data.preferred_platforms
              .map(p => {
                // Handle common variations
                const normalized = p.toLowerCase();
                if (normalized.includes('twitter') || normalized === 'x') return 'X';
                if (normalized.includes('tiktok')) return 'TikTok';
                if (normalized.includes('instagram')) return 'Instagram';
                if (normalized.includes('facebook')) return 'Facebook';
                if (normalized.includes('youtube')) return 'YouTube';
                return p;
              })
              .filter(p => PLATFORMS.some(platform => platform.id === p));
            
            setSelectedPlatforms(mappedPlatforms);
          }
        }
      } catch (err) {
        console.error('Error in fetchUserProfile:', err);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.id, showToast]);

  /**
   * Toggle platform selection
   */
  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        return prev.filter(p => p !== platformId);
      }
      return [...prev, platformId];
    });
  };

  /**
   * Handle research submission
   */
  const handleResearch = async () => {
    // Validation
    if (!topic.trim()) {
      showToast('Please enter a research topic', 'warning');
      return;
    }

    if (selectedPlatforms.length === 0) {
      showToast('Please select at least one platform', 'warning');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const result = await getTrendDeepDive({
        trend: topic.trim(),
        niche: userProfile?.niche || '',
        platforms: selectedPlatforms,
        brandData: {
          brandVoice: userProfile?.brand_voice_preference || '',
          targetAudience: userProfile?.target_audience || ''
        }
      });

      if (result.success) {
        setResults(result);
        showToast('Research complete! AI-generated insights are ready.', 'ai');
      } else if (result.useFallback) {
        setError(`Research workflow not available: ${result.reason}`);
        showToast('Research service is not configured. Please check your settings.', 'warning');
      } else {
        setError('Failed to complete research. Please try again.');
        showToast('Research failed. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Research error:', err);
      setError(err.message || 'An unexpected error occurred');
      showToast('Research failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Render the Context Badge showing user's personalization settings
   */
  const renderContextBadge = () => {
    if (profileLoading) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg animate-pulse">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
      );
    }

    if (!userProfile?.niche) {
      return (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-800">
            Set up your <span className="font-medium">Brand Voice</span> for personalized research
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-huttle-primary/5 to-purple-50 border border-huttle-primary/20 rounded-lg">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-huttle-primary" />
          <span className="text-sm text-gray-700">
            Analyzing for: <span className="font-semibold text-huttle-primary">{userProfile.niche}</span>
          </span>
        </div>
        {userProfile.brand_voice_preference && (
          <>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-700">
                Voice: <span className="font-semibold text-purple-600">{userProfile.brand_voice_preference}</span>
              </span>
            </div>
          </>
        )}
      </div>
    );
  };

  /**
   * Render platform toggle buttons
   */
  const renderPlatformSelector = () => (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Target Platforms
      </label>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const isSelected = selectedPlatforms.includes(platform.id);
          
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => togglePlatform(platform.id)}
              disabled={isLoading}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
                transition-all duration-200 border-2
                ${isSelected
                  ? 'bg-huttle-primary text-white border-huttle-primary shadow-md shadow-huttle-primary/25'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-huttle-primary/50 hover:bg-gray-50'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
              <span>{platform.name}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">
        {selectedPlatforms.length === 0 
          ? 'Select platforms to focus your research'
          : `${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''} selected`
        }
      </p>
    </div>
  );

  /**
   * Render research results with markdown styling
   */
  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="mt-8 space-y-6">
        {/* Main Analysis */}
        {results.analysis && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-huttle-primary/5 to-purple-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-huttle-primary" />
                <h3 className="font-semibold text-gray-900">Research Analysis</h3>
              </div>
            </div>
            <div className="p-5">
              <MarkdownRenderer content={results.analysis} />
            </div>
          </div>
        )}

        {/* Content Ideas */}
        {results.contentIdeas?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Content Ideas</h3>
              </div>
            </div>
            <div className="p-5">
              <ul className="space-y-3">
                {results.contentIdeas.map((idea, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{idea}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Competitor Insights */}
        {results.competitorInsights?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Competitor Insights</h3>
              </div>
            </div>
            <div className="p-5">
              <ul className="space-y-2">
                {results.competitorInsights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Citations */}
        {results.citations?.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sources</h4>
            <div className="flex flex-wrap gap-2">
              {results.citations.map((citation, index) => (
                <a
                  key={index}
                  href={citation}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-huttle-primary hover:text-huttle-primary-dark hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Source {index + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-huttle-primary to-purple-600 flex items-center justify-center shadow-lg shadow-huttle-primary/25">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trend Discovery (Deep Dive)</h1>
            <p className="text-sm text-gray-500">AI-powered trend research personalized to your brand</p>
          </div>
        </div>
      </div>

      {/* Context Badge */}
      <div className="mb-6">
        {renderContextBadge()}
      </div>

      {/* Research Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Topic Input */}
        <div className="space-y-2">
          <label htmlFor="research-topic" className="block text-sm font-medium text-gray-700">
            Research Topic
          </label>
          <div className="relative">
            <input
              id="research-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., AI tools for content creators, sustainable fashion trends..."
              disabled={isLoading}
              className={`
                w-full px-4 py-3 pr-12 rounded-lg border border-gray-200 
                text-gray-900 placeholder-gray-400
                focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary
                transition-all duration-200
                ${isLoading ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
              `}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleResearch();
                }
              }}
            />
            <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
          </div>
        </div>

        {/* Platform Selector */}
        {renderPlatformSelector()}

        {/* Submit Button */}
        <button
          onClick={handleResearch}
          disabled={isLoading || !topic.trim() || selectedPlatforms.length === 0}
          className={`
            w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg
            font-semibold text-white transition-all duration-200
            ${isLoading || !topic.trim() || selectedPlatforms.length === 0
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-huttle-primary to-purple-600 hover:from-huttle-primary-dark hover:to-purple-700 shadow-lg shadow-huttle-primary/25 hover:shadow-xl hover:shadow-huttle-primary/30'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Researching... This may take 30+ seconds</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Run Trend Analysis</span>
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Research Failed</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-8 flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-huttle-primary/20 border-t-huttle-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-huttle-primary animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Analyzing trends across platforms...</p>
          <p className="text-sm text-gray-400 mt-1">This may take up to 45 seconds</p>
        </div>
      )}

      {/* Results */}
      {renderResults()}

      {/* Environment Variable Reminder */}
      {error?.includes('not configured') && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Setup Required</h4>
          <p className="text-sm text-blue-700 mb-2">
            Add the following to your <code className="px-1.5 py-0.5 bg-blue-100 rounded text-xs">.env</code> file:
          </p>
          <code className="block p-2 bg-blue-100 rounded text-xs text-blue-900 font-mono">
            VITE_N8N_TREND_DEEP_DIVE_WEBHOOK=https://your-n8n-instance.app/webhook/trend-deep-dive
          </code>
        </div>
      )}
    </div>
  );
}


