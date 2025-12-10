import { useState, useMemo, useContext } from 'react';
import { 
  X, 
  Sparkles, 
  Clock, 
  Check, 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  TrendingUp,
  Info
} from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { generateOptimalTimes } from '../services/optimizeTimesAPI';
import { 
  formatTo12Hour, 
  filterFuturePosts, 
  sortPostsByDateTime,
  generateOptimizationSummary,
  getConfidenceColor,
  formatDateForDisplay,
  resolveTimeConflicts
} from '../utils/optimizeHelpers';
import { InstagramIcon, FacebookIcon, TikTokIcon, TwitterXIcon, YouTubeIcon } from './SocialIcons';

// Platform icon mapping
const getPlatformIcon = (platform) => {
  const p = platform?.toLowerCase();
  if (p?.includes('instagram')) return InstagramIcon;
  if (p?.includes('facebook')) return FacebookIcon;
  if (p?.includes('tiktok')) return TikTokIcon;
  if (p?.includes('twitter') || p?.includes('x')) return TwitterXIcon;
  if (p?.includes('youtube')) return YouTubeIcon;
  return null;
};

/**
 * OptimizeTimesModal - Modal for selecting and optimizing post times
 */
export default function OptimizeTimesModal({ 
  isOpen, 
  onClose, 
  posts = [],
  onOptimize 
}) {
  const { brandData } = useContext(BrandContext);
  const [selectedPostIds, setSelectedPostIds] = useState(new Set());
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [step, setStep] = useState('select'); // 'select' | 'preview' | 'complete'

  // Filter to only future posts
  const futurePosts = useMemo(() => {
    return sortPostsByDateTime(filterFuturePosts(posts));
  }, [posts]);

  // Group posts by platform for filtering
  const platformGroups = useMemo(() => {
    const groups = {};
    futurePosts.forEach(post => {
      (post.platforms || []).forEach(platform => {
        if (!groups[platform]) groups[platform] = [];
        groups[platform].push(post.id);
      });
    });
    return groups;
  }, [futurePosts]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectedPostIds.size === futurePosts.length) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(futurePosts.map(p => p.id)));
    }
  };

  // Handle platform filter select
  const handleSelectPlatform = (platform) => {
    const platformPostIds = platformGroups[platform] || [];
    const allSelected = platformPostIds.every(id => selectedPostIds.has(id));
    
    const newSelected = new Set(selectedPostIds);
    platformPostIds.forEach(id => {
      if (allSelected) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    });
    setSelectedPostIds(newSelected);
  };

  // Handle individual post toggle
  const handleTogglePost = (postId) => {
    const newSelected = new Set(selectedPostIds);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPostIds(newSelected);
  };

  // Run optimization
  const handleOptimize = async () => {
    if (selectedPostIds.size === 0) {
      setError('Please select at least one post to optimize');
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      const selectedPosts = futurePosts.filter(p => selectedPostIds.has(p.id));
      const result = await generateOptimalTimes(brandData, selectedPosts);

      if (result.success) {
        // Resolve any time conflicts
        const resolvedRecommendations = resolveTimeConflicts(
          result.recommendations.map(rec => {
            const post = selectedPosts.find(p => p.id === rec.postId);
            return { ...rec, date: post?.date, time: post?.time };
          })
        );

        setOptimizationResults({
          ...result,
          recommendations: resolvedRecommendations,
          summary: generateOptimizationSummary(resolvedRecommendations)
        });
        setStep('preview');
      } else {
        setError(result.error || 'Optimization failed. Please try again.');
      }
    } catch (err) {
      console.error('Optimization error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Apply optimizations
  const handleApply = async () => {
    if (!optimizationResults?.recommendations) return;

    setIsOptimizing(true);
    try {
      // Call the parent's onOptimize with the recommendations
      await onOptimize(optimizationResults.recommendations);
      setStep('complete');
    } catch (err) {
      console.error('Apply error:', err);
      setError('Failed to apply optimizations. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Reset and close
  const handleClose = () => {
    setSelectedPostIds(new Set());
    setOptimizationResults(null);
    setError(null);
    setStep('select');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-huttle-primary to-indigo-500 flex items-center justify-center shadow-lg shadow-huttle-primary/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Optimize Posting Times</h2>
                <p className="text-sm text-gray-500">
                  {step === 'select' && 'Select posts to optimize'}
                  {step === 'preview' && 'Review recommended changes'}
                  {step === 'complete' && 'Optimization complete!'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/80 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Step 1: Select Posts */}
            {step === 'select' && (
              <>
                {/* Brand Context Info */}
                {brandData?.niche && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
                    <Info className="w-5 h-5 text-huttle-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Optimizing for: </span>
                      {brandData.niche} 
                      {brandData.targetAudience && ` • ${brandData.targetAudience}`}
                    </div>
                  </div>
                )}

                {/* Quick Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <button
                    onClick={handleSelectAll}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedPostIds.size === futurePosts.length
                        ? 'bg-huttle-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {selectedPostIds.size === futurePosts.length ? 'Deselect All' : 'Select All'}
                  </button>
                  
                  {Object.keys(platformGroups).map(platform => {
                    const Icon = getPlatformIcon(platform);
                    const platformIds = platformGroups[platform];
                    const allSelected = platformIds.every(id => selectedPostIds.has(id));
                    
                    return (
                      <button
                        key={platform}
                        onClick={() => handleSelectPlatform(platform)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          allSelected
                            ? 'bg-huttle-primary/10 text-huttle-primary border border-huttle-primary/30'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {Icon && <Icon className="w-4 h-4" />}
                        <span>{platform}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Post List */}
                {futurePosts.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No future posts to optimize</p>
                    <p className="text-sm text-gray-400 mt-1">Schedule some posts first</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {futurePosts.map(post => {
                      const isSelected = selectedPostIds.has(post.id);
                      return (
                        <button
                          key={post.id}
                          onClick={() => handleTogglePost(post.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-huttle-primary bg-huttle-primary/5'
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected 
                              ? 'border-huttle-primary bg-huttle-primary' 
                              : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{post.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <span>{formatDateForDisplay(post.date)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTo12Hour(post.time)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {(post.platforms || []).slice(0, 2).map((platform, idx) => {
                              const Icon = getPlatformIcon(platform);
                              return Icon ? <Icon key={idx} className="w-4 h-4" /> : null;
                            })}
                            {(post.platforms?.length || 0) > 2 && (
                              <span className="text-xs text-gray-400">+{post.platforms.length - 2}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selection Count */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-gray-900">{selectedPostIds.size}</span> of {futurePosts.length} posts selected
                  </p>
                  
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Advanced
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Advanced Options */}
                {showAdvanced && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                    <p>Optimization uses AI to analyze your:</p>
                    <ul className="mt-2 space-y-1 ml-4 list-disc">
                      <li>Niche and industry patterns</li>
                      <li>Target audience active hours</li>
                      <li>Platform-specific best practices</li>
                      <li>Content type optimization</li>
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Step 2: Preview Changes */}
            {step === 'preview' && optimizationResults && (
              <>
                {/* Summary */}
                <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Optimization Preview</h3>
                      <p className="text-sm text-gray-600">
                        {optimizationResults.summary.changed} of {optimizationResults.summary.total} posts will be rescheduled
                        {optimizationResults.source === 'ai' && ' • AI-powered'}
                      </p>
                    </div>
                  </div>
                  
                  {optimizationResults.reasoning && (
                    <p className="mt-3 text-sm text-gray-700 bg-white/60 rounded-lg p-2">
                      <Sparkles className="w-4 h-4 inline mr-1 text-huttle-primary" />
                      {optimizationResults.reasoning}
                    </p>
                  )}
                </div>

                {/* Changes List */}
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {optimizationResults.recommendations.map((rec, index) => {
                    const post = futurePosts.find(p => p.id === rec.postId);
                    const hasChange = rec.originalTime !== rec.optimizedTime;
                    const Icon = getPlatformIcon(rec.platform);
                    
                    return (
                      <div
                        key={rec.postId}
                        className={`p-3 rounded-xl border ${
                          hasChange 
                            ? 'border-emerald-200 bg-emerald-50/50' 
                            : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="w-4 h-4" />}
                              <h4 className="font-medium text-gray-900 text-sm">{post?.title || 'Post'}</h4>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{formatDateForDisplay(post?.date)}</p>
                          </div>
                          
                          <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${getConfidenceColor(rec.confidence)}`}>
                            {rec.confidence}%
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`font-mono text-sm ${hasChange ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                            {formatTo12Hour(rec.originalTime)}
                          </span>
                          {hasChange && (
                            <>
                              <ArrowRight className="w-4 h-4 text-emerald-500" />
                              <span className="font-mono text-sm font-bold text-emerald-600">
                                {formatTo12Hour(rec.optimizedTime)}
                              </span>
                            </>
                          )}
                          {!hasChange && (
                            <span className="text-xs text-gray-500 ml-2">(already optimal)</span>
                          )}
                        </div>
                        
                        {rec.reason && hasChange && (
                          <p className="mt-1.5 text-xs text-gray-600">{rec.reason}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Step 3: Complete */}
            {step === 'complete' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Optimization Complete!</h3>
                <p className="text-gray-600 mb-6">
                  {optimizationResults?.summary.changed || 0} posts have been rescheduled to optimal times.
                </p>
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-huttle-primary text-white rounded-xl font-semibold hover:bg-huttle-primary-dark transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {step !== 'complete' && (
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              {step === 'select' && (
                <>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOptimize}
                    disabled={selectedPostIds.size === 0 || isOptimizing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-huttle-primary text-white rounded-xl font-semibold hover:bg-huttle-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Optimize {selectedPostIds.size} Post{selectedPostIds.size !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </>
              )}
              
              {step === 'preview' && (
                <>
                  <button
                    onClick={() => setStep('select')}
                    className="px-4 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={isOptimizing || !optimizationResults?.summary.hasChanges}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Apply {optimizationResults?.summary.changed || 0} Changes
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
