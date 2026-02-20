import { useState, useContext, useMemo } from 'react';
import { X, Sparkles, Check, Copy, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { useContent } from '../context/ContentContext';
import { useToast } from '../context/ToastContext';
import { generatePlatformRemixes } from '../services/grokAPI';
import { usePreferredPlatforms } from '../hooks/usePreferredPlatforms';

/**
 * RemixAllModal - One-click multi-platform content remix
 * 
 * Takes original content and generates platform-optimized versions
 * for all major social platforms simultaneously.
 */
export default function RemixAllModal({ isOpen, onClose, originalContent, post = null }) {
  const { brandData } = useContext(BrandContext);
  const { schedulePost } = useContent();
  const { showToast } = useToast();
  const { platforms: preferredPlatformsList } = usePreferredPlatforms();
  
  // Convert preferred platforms to the format expected by this component
  const PLATFORMS = useMemo(() => {
    return preferredPlatformsList.map(p => ({
      id: p.id,
      name: p.displayName || p.name,
      icon: p.icon,
      color: p.gradient,
      charLimit: p.charLimit,
      hashtagTip: p.hashtagTip
    }));
  }, [preferredPlatformsList]);
  
  const [isRemixing, setIsRemixing] = useState(false);
  const [remixes, setRemixes] = useState({});
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [copiedPlatform, setCopiedPlatform] = useState(null);
  const [schedulingPlatform, setSchedulingPlatform] = useState(null);
  
  // Initialize selected platforms when PLATFORMS changes
  useMemo(() => {
    if (selectedPlatforms.length === 0 && PLATFORMS.length > 0) {
      setSelectedPlatforms(PLATFORMS.map(p => p.id));
    }
  }, [PLATFORMS]);

  if (!isOpen) return null;

  const content = originalContent || post?.caption || '';

  const handleRemixAll = async () => {
    if (!content.trim()) {
      showToast('No content to remix', 'error');
      return;
    }

    setIsRemixing(true);
    setRemixes({});

    try {
      const platformNames = selectedPlatforms.map(id => 
        PLATFORMS.find(p => p.id === id)?.name
      ).filter(Boolean);

      const result = await generatePlatformRemixes(content, brandData, platformNames);
      
      if (result.success && Object.keys(result.remixes).length > 0) {
        setRemixes(result.remixes);
        showToast(`Generated ${Object.keys(result.remixes).length} platform versions!`, 'success');
      } else {
        showToast('Failed to generate remixes. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Remix error:', error);
      showToast('Failed to generate remixes', 'error');
    } finally {
      setIsRemixing(false);
    }
  };

  const handleCopy = async (platformId) => {
    const remix = remixes[platformId];
    if (!remix) return;

    try {
      const fullText = `${remix.caption}\n\n${remix.hashtags}`.trim();
      await navigator.clipboard.writeText(fullText);
      setCopiedPlatform(platformId);
      showToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopiedPlatform(null), 2000);
    } catch (error) {
      showToast('Failed to copy', 'error');
    }
  };

  const handleSchedule = async (platformId) => {
    const remix = remixes[platformId];
    const platform = PLATFORMS.find(p => p.id === platformId);
    if (!remix || !platform) return;

    setSchedulingPlatform(platformId);

    try {
      // Schedule the post
      const postData = {
        title: post?.title || `${platform.name} Post`,
        platforms: [platform.name],
        contentType: post?.contentType || 'Text Post',
        scheduledDate: post?.scheduledDate || new Date().toISOString().split('T')[0],
        scheduledTime: post?.scheduledTime || '12:00',
        caption: remix.caption,
        hashtags: remix.hashtags,
        keywords: post?.keywords || '',
        imagePrompt: post?.imagePrompt || '',
        videoPrompt: post?.videoPrompt || '',
        media: post?.media || []
      };

      const postId = await schedulePost(postData);
      if (postId) {
        showToast(`Scheduled for ${platform.name}!`, 'success');
      } else {
        showToast('Failed to schedule', 'error');
      }
    } catch (error) {
      console.error('Schedule error:', error);
      showToast('Failed to schedule post', 'error');
    } finally {
      setSchedulingPlatform(null);
    }
  };

  const handleScheduleAll = async () => {
    const platformsWithRemixes = Object.keys(remixes);
    if (platformsWithRemixes.length === 0) {
      showToast('Generate remixes first', 'warning');
      return;
    }

    let scheduled = 0;
    for (const platformId of platformsWithRemixes) {
      await handleSchedule(platformId);
      scheduled++;
    }

    showToast(`Scheduled ${scheduled} posts!`, 'success');
  };

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-4xl w-full max-h-[90dvh] overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
              <Sparkles className="w-6 h-6 text-huttle-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-huttle-primary flex items-center gap-2">
                Smart Caption Remix
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                One-click optimization for all platforms
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-lg transition-colors text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Original Content */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Original Content</h3>
            <p className="text-gray-800 whitespace-pre-wrap line-clamp-4">{content}</p>
          </div>

          {/* Platform Selection */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Platforms to Remix</h3>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const isSelected = selectedPlatforms.includes(platform.id);
                
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-huttle-primary bg-huttle-primary/5'
                        : 'border-gray-200 hover:border-gray-300 opacity-60'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center bg-gradient-to-br ${platform.color} text-white`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{platform.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-huttle-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remix Button */}
          <button
            onClick={handleRemixAll}
            disabled={isRemixing || selectedPlatforms.length === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-huttle-primary to-huttle-primary-light text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-huttle-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRemixing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Platform Versions...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Remix for {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
              </>
            )}
          </button>

          {/* Remixed Content Grid */}
          {Object.keys(remixes).length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Platform-Optimized Versions</h3>
                <button
                  onClick={handleScheduleAll}
                  className="flex items-center gap-2 px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors text-sm font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLATFORMS.filter(p => remixes[p.id]).map((platform) => {
                  const remix = remixes[platform.id];
                  const Icon = platform.icon;
                  const isCopied = copiedPlatform === platform.id;
                  const isScheduling = schedulingPlatform === platform.id;

                  return (
                    <div
                      key={platform.id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Platform Header */}
                      <div className={`px-4 py-3 bg-gradient-to-r ${platform.color} text-white flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5" />
                          <span className="font-semibold">{platform.name}</span>
                        </div>
                        <span className="text-xs opacity-80">{platform.hashtagTip}</span>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4">
                            {remix.caption}
                          </p>
                          {remix.caption.length > 200 && (
                            <button className="text-xs text-huttle-primary mt-1 hover:underline">
                              Show more
                            </button>
                          )}
                        </div>

                        {remix.hashtags && (
                          <p className="text-sm text-huttle-primary break-words">
                            {remix.hashtags}
                          </p>
                        )}

                        {/* Character Count */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {remix.caption.length} / {platform.charLimit} chars
                          </span>
                          {remix.caption.length > platform.charLimit && (
                            <span className="text-red-500 font-medium">Over limit!</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleCopy(platform.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-4 h-4 text-green-600" />
                                <span className="text-green-600">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleSchedule(platform.id)}
                            disabled={isScheduling}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-huttle-primary text-white hover:bg-huttle-primary-dark rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isScheduling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Calendar className="w-4 h-4" />
                                <span>Schedule</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Regenerate Button */}
              <button
                onClick={handleRemixAll}
                disabled={isRemixing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-huttle-primary bg-huttle-primary/10 rounded-lg hover:bg-huttle-primary/20 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRemixing ? 'animate-spin' : ''}`} />
                Regenerate All
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Remix button for use in post cards
 */
export function RemixButton({ content, post, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-md transition-all font-medium ${className}`}
        title="Remix for all platforms"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Remix All
      </button>

      <RemixAllModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        originalContent={content}
        post={post}
      />
    </>
  );
}

