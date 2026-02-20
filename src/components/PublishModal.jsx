import { useState, useEffect, useMemo } from 'react';
import { X, ExternalLink, Copy, Check, CheckCircle2, Instagram, Facebook, Youtube, Download, Clipboard, ArrowRight, Image } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { supabase, getSignedUrl } from '../config/supabase';
import { usePreferredPlatforms } from '../hooks/usePreferredPlatforms';

// Platform configurations
const PLATFORM_CONFIGS = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'from-purple-600 to-pink-600',
    uploadUrl: 'https://www.instagram.com/',
    appScheme: 'instagram://',
    instructions: 'Open Instagram, tap + to create, upload your media, then paste the caption.'
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'from-blue-600 to-blue-800',
    uploadUrl: 'https://www.facebook.com/',
    appScheme: 'fb://',
    instructions: 'Open Facebook, tap "What\'s on your mind?", upload media, then paste caption.'
  },
  tiktok: {
    name: 'TikTok',
    icon: ({ className }) => <span className={className}>🎵</span>,
    color: 'from-black to-gray-800',
    uploadUrl: 'https://www.tiktok.com/upload',
    appScheme: 'snssdk1233://',
    instructions: 'Open TikTok, tap + to upload your video, then paste the caption.'
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'from-red-600 to-red-800',
    uploadUrl: 'https://studio.youtube.com/upload',
    appScheme: 'youtube://',
    instructions: 'Open YouTube Studio, tap upload, add your video, then paste title and description.'
  },
  twitter: {
    name: 'X (Twitter)',
    icon: ({ className }) => <span className={className}>𝕏</span>,
    color: 'from-black to-gray-900',
    uploadUrl: 'https://twitter.com/compose/tweet',
    appScheme: 'twitter://',
    instructions: 'Open X, tap compose, paste your caption, and attach media if needed.'
  }
};

/**
 * Map a post platform name (e.g. "Instagram", "X") to a PLATFORM_CONFIGS key
 */
const mapPlatformToConfigKey = (platformName) => {
  if (!platformName) return '';
  const p = platformName.toLowerCase().trim();
  if (p.includes('instagram')) return 'instagram';
  if (p.includes('facebook')) return 'facebook';
  if (p.includes('tiktok')) return 'tiktok';
  if (p.includes('youtube')) return 'youtube';
  if (p.includes('twitter') || p === 'x') return 'twitter';
  return '';
};

export default function PublishModal({ isOpen, onClose, post }) {
  const { addToast } = useToast();
  const { preferredPlatformIds } = usePreferredPlatforms();
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [completedSteps, setCompletedSteps] = useState({});
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [downloadingMedia, setDownloadingMedia] = useState(false);
  const [copiedContentType, setCopiedContentType] = useState(null);

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Determine the pre-selected platform from the post's platforms array
  const postPlatformKey = useMemo(() => {
    const platforms = post?.platforms || [];
    if (platforms.length > 0) {
      return mapPlatformToConfigKey(platforms[0]);
    }
    return '';
  }, [post?.platforms]);

  // Auto-select platform when modal opens
  useEffect(() => {
    if (isOpen && postPlatformKey) {
      setSelectedPlatform(postPlatformKey);
    }
    if (isOpen) {
      setPublished(false);
      setCompletedSteps({});
      setPublishing(false);
      setDownloadingMedia(false);
      setCopiedContentType(null);
    }
  }, [isOpen, postPlatformKey]);

  // Filter to user's preferred platforms
  const filteredPlatformConfigs = useMemo(() => {
    const idToConfigKey = {
      'instagram': 'instagram',
      'facebook': 'facebook',
      'tiktok': 'tiktok',
      'youtube': 'youtube',
      'x': 'twitter'
    };
    
    const filtered = {};
    preferredPlatformIds.forEach(id => {
      const configKey = idToConfigKey[id];
      if (configKey && PLATFORM_CONFIGS[configKey]) {
        filtered[configKey] = PLATFORM_CONFIGS[configKey];
      }
    });
    
    return Object.keys(filtered).length > 0 ? filtered : PLATFORM_CONFIGS;
  }, [preferredPlatformIds]);

  if (!isOpen || !post) return null;

  const selectedConfig = selectedPlatform ? PLATFORM_CONFIGS[selectedPlatform] : null;
  const hasMedia = post.media?.length > 0 || post.storage_path;
  const fullText = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();

  const markStep = (step) => {
    setCompletedSteps(prev => ({ ...prev, [step]: true }));
  };

  // Step 1: Copy content snippets
  const handleCopyContent = async (content, contentTypeLabel) => {
    if (!content || !content.trim()) {
      addToast(`No ${contentTypeLabel.toLowerCase()} available to copy.`, 'info');
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      markStep('copy');
      setCopiedContentType(contentTypeLabel);
      addToast(`${contentTypeLabel} copied!`, 'success');
    } catch {
      addToast('Failed to copy. Please select and copy manually.', 'error');
    }
  };

  // Step 2: Download media (if available)
  const handleDownloadMedia = async () => {
    setDownloadingMedia(true);
    try {
      // Try to get a signed URL for the media
      let downloadUrl = null;
      
      if (post.storage_path) {
        const result = await getSignedUrl(post.storage_path, 300); // 5 min expiry
        if (result.success) {
          downloadUrl = result.signedUrl;
        }
      } else if (post.media?.length > 0) {
        const firstMedia = post.media[0];
        if (firstMedia.storagePath) {
          const result = await getSignedUrl(firstMedia.storagePath, 300);
          if (result.success) {
            downloadUrl = result.signedUrl;
          }
        } else if (firstMedia.url && !firstMedia.url.startsWith('blob:')) {
          downloadUrl = firstMedia.url;
        }
      }

      if (downloadUrl) {
        // Trigger download via hidden anchor
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = post.title ? `${post.title.replace(/[^a-zA-Z0-9]/g, '_')}` : 'media';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        markStep('download');
        addToast(isMobile ? 'Media downloading. Save to camera roll.' : 'Media downloaded!', 'success');
      } else {
        addToast('No media file available for this post.', 'info');
      }
    } catch (error) {
      console.error('Media download error:', error);
      addToast('Failed to download media. Try again.', 'error');
    } finally {
      setDownloadingMedia(false);
    }
  };

  // Step 3: Open platform
  const handleOpenPlatform = () => {
    const config = PLATFORM_CONFIGS[selectedPlatform];
    if (!config) return;

    if (isMobile) {
      // Try app scheme first, fallback to web
      const appWindow = window.open(config.appScheme, '_blank');
      setTimeout(() => {
        if (!appWindow || appWindow.closed) {
          window.open(config.uploadUrl, '_blank');
        }
      }, 800);
    } else {
      window.open(config.uploadUrl, '_blank');
    }

    markStep('open');
    addToast(`Opening ${config.name}...`, 'success');
  };

  // Step 4: Mark as posted
  const handleMarkPublished = async () => {
    setPublishing(true);
    
    // Track publish attempt (non-blocking)
    supabase.auth.getUser().then(({ data: userData }) => {
      if (userData?.user) {
        supabase.from('user_publishes').insert({
          user_id: userData.user.id,
          post_id: post.id,
          platform: selectedPlatform,
          deep_link_used: isMobile
        }).catch(() => {});
      }
    });

    setPublished(true);
    setPublishing(false);
    addToast('Post marked as posted!', 'success');

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const allStepsDone = completedSteps.copy && completedSteps.open;

  // Build checklist steps
  const steps = [
    {
      id: 'copy',
      label: 'Copy content',
      description: 'Copy full post, caption only, or hashtags only',
      icon: Clipboard,
      action: () => handleCopyContent(fullText, 'Full post'),
      actionLabel: completedSteps.copy ? 'Copied!' : 'Copy Full',
      completed: !!completedSteps.copy,
      required: true
    },
    ...(hasMedia ? [{
      id: 'download',
      label: isMobile ? 'Save media to device' : 'Download media',
      description: isMobile ? 'Save to your camera roll' : 'Save the image/video to your computer',
      icon: Download,
      action: handleDownloadMedia,
      actionLabel: downloadingMedia ? 'Saving...' : (completedSteps.download ? 'Saved!' : (isMobile ? 'Save' : 'Download')),
      completed: !!completedSteps.download,
      loading: downloadingMedia,
      required: false
    }] : []),
    {
      id: 'open',
      label: `Open ${selectedConfig?.name || 'platform'}`,
      description: isMobile ? 'Opens the app on your phone' : 'Opens the website in a new tab',
      icon: ExternalLink,
      action: handleOpenPlatform,
      actionLabel: completedSteps.open ? 'Opened!' : 'Copy & Open',
      completed: !!completedSteps.open,
      required: true
    },
    {
      id: 'paste',
      label: 'Paste & post',
      description: selectedConfig?.instructions || 'Paste your caption and upload media',
      icon: ArrowRight,
      action: null, // No button — this is a manual step
      completed: false,
      required: false,
      isManual: true
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto animate-fadeIn" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ready to Post</h2>
            <p className="text-xs text-gray-500 mt-0.5">Copy your content, open the platform, then confirm</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {published ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Marked as Posted!</h3>
            <p className="text-sm text-gray-600">
              Your post has been marked as posted on {selectedConfig?.name}.
            </p>
          </div>
        ) : (
          <>
            {/* Post Preview */}
            <div className="px-5 pt-4 pb-3">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start gap-3">
                  {/* Media thumbnail */}
                  {hasMedia && (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <Image className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{post.title}</h4>
                    {post.caption && (
                      <p className="text-gray-600 text-xs whitespace-pre-wrap line-clamp-2 mt-0.5">{post.caption}</p>
                    )}
                    {post.hashtags && (
                      <p className="text-xs text-huttle-primary mt-1 line-clamp-1">{post.hashtags}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Selection */}
            {!selectedPlatform ? (
              <div className="px-5 pb-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Where are you posting?</h3>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(filteredPlatformConfigs).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedPlatform(key)}
                        className="p-3 rounded-xl border-2 border-gray-200 hover:border-huttle-primary hover:bg-huttle-primary/5 transition-all text-center"
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center mx-auto mb-1.5`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-xs font-medium text-gray-700">{config.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Step-by-Step Checklist */
              <div className="px-5 pb-5">
                {/* Platform header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${selectedConfig.color} flex items-center justify-center`}>
                      <selectedConfig.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{selectedConfig.name}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedPlatform(''); setCompletedSteps({}); }}
                    className="text-xs text-huttle-primary hover:text-huttle-primary-dark font-medium"
                  >
                    Change
                  </button>
                </div>

                <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Copy options</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                      onClick={() => handleCopyContent(fullText, 'Full post')}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                        copiedContentType === 'Full post'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Full Post
                    </button>
                    <button
                      onClick={() => handleCopyContent(post.caption || '', 'Caption')}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                        copiedContentType === 'Caption'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Caption
                    </button>
                    <button
                      onClick={() => handleCopyContent(post.hashtags || '', 'Hashtags')}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                        copiedContentType === 'Hashtags'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Hashtags
                    </button>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-2.5">
                  {steps.map((step, idx) => {
                    const StepIcon = step.icon;
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          step.completed
                            ? 'border-green-200 bg-green-50/50'
                            : step.isManual
                            ? 'border-gray-100 bg-gray-50/50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        {/* Step number / check */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          step.completed
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {step.completed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </div>

                        {/* Step info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${step.completed ? 'text-green-700' : 'text-gray-900'}`}>
                            {step.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                        </div>

                        {/* Action button */}
                        {step.action && (
                          <button
                            onClick={step.action}
                            disabled={step.loading}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 flex items-center gap-1.5 ${
                              step.completed
                                ? 'bg-green-100 text-green-700'
                                : 'bg-huttle-primary text-white hover:bg-huttle-primary-dark shadow-sm'
                            }`}
                          >
                            {step.loading && (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                            )}
                            <StepIcon className="w-3.5 h-3.5" />
                            {step.actionLabel}
                          </button>
                        )}

                        {/* Manual step indicator */}
                        {step.isManual && (
                          <span className="text-xs text-gray-400 italic flex-shrink-0">Manual</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Mark as Posted button */}
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMarkPublished}
                    disabled={!allStepsDone || publishing}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                      allStepsDone && !publishing
                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {publishing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark as Posted</span>
                      </>
                    )}
                  </button>
                </div>

                {!allStepsDone && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Complete the Copy and Open steps to mark as posted
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
