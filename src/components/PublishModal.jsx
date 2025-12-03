import { useState, useMemo } from 'react';
import { X, ExternalLink, Copy, Check, AlertCircle, Instagram, Facebook, Youtube, QrCode, Smartphone, Monitor } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../context/ToastContext';
import { supabase } from '../config/supabase';
import { usePreferredPlatforms, normalizePlatformName } from '../hooks/usePreferredPlatforms';

// Platform deep link configurations
const PLATFORM_CONFIGS = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'from-purple-600 to-pink-600',
    deepLink: (url, caption, hashtags) => {
      const text = `${caption}\n\n${hashtags}`.trim();
      return `instagram://library?AssetPath=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    },
    fallbackUrl: 'https://www.instagram.com/create/story/',
    instructions: 'Opens Instagram app to upload with pre-filled caption'
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'from-blue-600 to-blue-800',
    deepLink: (url, caption, hashtags) => {
      const text = `${caption}\n\n${hashtags}`.trim();
      return `fb://compose?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    },
    fallbackUrl: 'https://www.facebook.com/dialog/share',
    instructions: 'Opens Facebook app to create post with your content'
  },
  tiktok: {
    name: 'TikTok',
    icon: ({ className }) => <span className={className}>🎵</span>,
    color: 'from-black to-gray-800',
    deepLink: (url, caption, hashtags) => {
      const text = `${caption}\n\n${hashtags}`.trim();
      return `snssdk1233://upload?video=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    },
    fallbackUrl: 'https://www.tiktok.com/upload',
    instructions: 'Opens TikTok app to upload video with pre-filled caption'
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'from-red-600 to-red-800',
    deepLink: (url, caption, hashtags, title) => {
      const description = `${caption}\n\n${hashtags}`.trim();
      return `youtube://upload?video=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`;
    },
    fallbackUrl: 'https://studio.youtube.com/upload',
    instructions: 'Opens YouTube Studio to upload with pre-filled details'
  },
  twitter: {
    name: 'X (Twitter)',
    icon: ({ className }) => <span className={className}>𝕏</span>,
    color: 'from-black to-gray-900',
    deepLink: (url, caption, hashtags) => {
      const text = `${caption}\n\n${hashtags}`.trim();
      return `twitter://post?message=${encodeURIComponent(text)}`;
    },
    fallbackUrl: 'https://twitter.com/intent/tweet',
    instructions: 'Opens X app to create post with your caption'
  }
};

export default function PublishModal({ isOpen, onClose, post }) {
  const { addToast } = useToast();
  const { preferredPlatformIds } = usePreferredPlatforms();
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' or 'qr'

  // Filter PLATFORM_CONFIGS to only show user's preferred platforms
  const filteredPlatformConfigs = useMemo(() => {
    // Map our platform IDs to the PLATFORM_CONFIGS keys
    const idToConfigKey = {
      'instagram': 'instagram',
      'facebook': 'facebook',
      'tiktok': 'tiktok',
      'youtube': 'youtube',
      'x': 'twitter' // PLATFORM_CONFIGS uses 'twitter' as the key
    };
    
    const filtered = {};
    preferredPlatformIds.forEach(id => {
      const configKey = idToConfigKey[id];
      if (configKey && PLATFORM_CONFIGS[configKey]) {
        filtered[configKey] = PLATFORM_CONFIGS[configKey];
      }
    });
    
    // If no platforms are preferred, show all (fallback)
    return Object.keys(filtered).length > 0 ? filtered : PLATFORM_CONFIGS;
  }, [preferredPlatformIds]);

  if (!isOpen || !post) return null;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Generate deep link for selected platform
  const getDeepLink = () => {
    if (!selectedPlatform) return '';
    const config = PLATFORM_CONFIGS[selectedPlatform];
    const mediaUrl = post.storage_path || post.url || '';
    const caption = post.caption || '';
    const hashtags = post.hashtags || '';
    const title = post.title || 'Untitled Post';
    return config.deepLink(mediaUrl, caption, hashtags, title);
  };

  // Generate QR code data (deep link + content info)
  const getQRData = () => {
    if (!selectedPlatform) return '';
    const deepLink = getDeepLink();
    // For QR, we use the deep link directly - when scanned on mobile, it will open the app
    return deepLink;
  };

  const handlePublish = async () => {
    if (!selectedPlatform) {
      addToast('Please select a platform', 'warning');
      return;
    }

    setPublishing(true);

    try {
      const config = PLATFORM_CONFIGS[selectedPlatform];
      const deepLink = getDeepLink();

      // Track publish attempt
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase.from('user_publishes').insert({
          user_id: userData.user.id,
          post_id: post.id,
          platform: selectedPlatform,
          deep_link_used: true
        }).catch(() => {}); // Ignore if table doesn't exist
      }

      // Try to open deep link
      if (isMobile) {
        // Mobile: Try deep link first, fallback to web
        const opened = window.open(deepLink, '_blank');
        
        // If deep link fails, try fallback after delay
        setTimeout(() => {
          if (!opened || opened.closed) {
            window.open(config.fallbackUrl, '_blank');
            addToast(`Opening ${config.name} in browser`, 'info');
          }
        }, 1000);
        
        addToast(`Opening ${config.name} app...`, 'success');
      } else {
        // Desktop: Copy to clipboard and open web version
        const fullText = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
        await navigator.clipboard.writeText(fullText);
        
        window.open(config.fallbackUrl, '_blank');
        addToast(`Caption copied! Opening ${config.name} in browser`, 'success');
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Publish error:', error);
      
      // Fallback: Copy to clipboard
      try {
        const fullText = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
        await navigator.clipboard.writeText(fullText);
        addToast('Caption copied to clipboard! Paste in your app', 'info');
      } catch (clipError) {
        addToast('Failed to publish. Please copy manually.', 'error');
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyContent = async () => {
    try {
      const fullText = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      addToast('Content copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      addToast('Failed to copy content', 'error');
    }
  };

  const handleCopyAndShowQR = async () => {
    // Copy content to clipboard first
    try {
      const fullText = `${post.caption || ''}\n\n${post.hashtags || ''}`.trim();
      await navigator.clipboard.writeText(fullText);
      addToast('Caption copied! Now scan QR code with your phone', 'success');
    } catch (error) {
      // Continue even if copy fails
    }
    setShowQRCode(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Publish to Social Media</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-huttle-primary" />
            Post Preview
          </h3>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">{post.title}</h4>
            {post.caption && (
              <p className="text-gray-700 mb-2 whitespace-pre-wrap line-clamp-3">{post.caption}</p>
            )}
            {post.hashtags && (
              <p className="text-sm text-huttle-primary">{post.hashtags}</p>
            )}
          </div>

          <button
            onClick={handleCopyContent}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Caption & Hashtags</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Selector - Only show on desktop */}
        {!isMobile && (
          <div className="px-6 pt-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => { setActiveTab('direct'); setShowQRCode(false); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'direct'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Monitor className="w-4 h-4" />
                Direct Publish
              </button>
              <button
                onClick={() => { setActiveTab('qr'); setShowQRCode(true); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'qr'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <QrCode className="w-4 h-4" />
                QR Code Bridge
              </button>
            </div>
          </div>
        )}

        {/* Platform Selection */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Select Platform</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {Object.entries(filteredPlatformConfigs).map(([key, config]) => {
              const Icon = config.icon;
              const isSelected = selectedPlatform === key;
              
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlatform(key)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-huttle-primary bg-huttle-primary/5 shadow-md scale-105'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{config.name}</p>
                </button>
              );
            })}
          </div>

          {/* QR Code Display */}
          {activeTab === 'qr' && selectedPlatform && (
            <div className="mb-6 p-6 bg-gradient-to-br from-slate-50 to-white rounded-xl border-2 border-dashed border-slate-200">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-huttle-primary/10 text-huttle-primary rounded-full text-sm font-semibold mb-4">
                  <Smartphone className="w-4 h-4" />
                  Scan with your phone
                </div>
                
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-100">
                    <QRCodeSVG
                      value={getQRData()}
                      size={180}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#1a1a1a"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-gray-900">
                    How to use:
                  </p>
                  <ol className="text-left max-w-xs mx-auto space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-huttle-primary text-white text-xs flex items-center justify-center font-bold">1</span>
                      <span>Content is copied to your clipboard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-huttle-primary text-white text-xs flex items-center justify-center font-bold">2</span>
                      <span>Scan QR code with your phone camera</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-huttle-primary text-white text-xs flex items-center justify-center font-bold">3</span>
                      <span>Open the link to launch {PLATFORM_CONFIGS[selectedPlatform]?.name}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-huttle-primary text-white text-xs flex items-center justify-center font-bold">4</span>
                      <span>Paste your caption and post!</span>
                    </li>
                  </ol>
                </div>

                <button
                  onClick={handleCopyContent}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors text-sm font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Caption First
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Instructions for Direct Publish */}
          {activeTab === 'direct' && selectedPlatform && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900">
                <strong>How it works:</strong> {PLATFORM_CONFIGS[selectedPlatform].instructions}
                {!isMobile && ' Your caption will be copied to clipboard automatically.'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
            >
              Cancel
            </button>
            {activeTab === 'direct' && (
              <button
                onClick={handlePublish}
                disabled={!selectedPlatform || publishing}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  selectedPlatform && !publishing
                    ? 'bg-huttle-primary text-white hover:bg-huttle-primary-dark shadow-md'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {publishing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    <span>Publish Now</span>
                  </>
                )}
              </button>
            )}
            {activeTab === 'qr' && (
              <button
                onClick={handleCopyAndShowQR}
                disabled={!selectedPlatform}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  selectedPlatform
                    ? 'bg-huttle-primary text-white hover:bg-huttle-primary-dark shadow-md'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>Copy & Show QR</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Detection Notice - Only show in direct tab */}
        {!isMobile && activeTab === 'direct' && (
          <div className="px-6 pb-6">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Smartphone className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    Want to post from your phone?
                  </p>
                  <p className="text-xs text-amber-700">
                    Switch to the "QR Code Bridge" tab to scan a QR code with your phone and post directly from the mobile app.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
