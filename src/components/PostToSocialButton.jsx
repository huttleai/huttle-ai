import React, { useState } from 'react';
import { ExternalLink, Loader } from 'lucide-react';
import { openInSocialMedia, openInAllPlatforms } from '../utils/socialMediaHelpers';
import { useToast } from '../context/ToastContext';
import { validatePost } from '../utils/socialConnectionChecker';
import { useNotifications } from '../context/NotificationContext';

/**
 * PostToSocialButton - Opens social media apps via deep linking
 * 
 * NOTE: This component uses deep linking, NOT API posting.
 * - Mobile: Opens native app with pre-filled content (where supported)
 * - Desktop: Copies content to clipboard and opens web version
 */
export default function PostToSocialButton({ post, platform = null }) {
  const { addToast } = useToast();
  const { addMissingContentWarning } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleQuickPost = async (selectedPlatform) => {
    setLoading(true);

    // Validate post first
    const validation = validatePost(post);
    if (!validation.isValid) {
      addMissingContentWarning(post, validation.missing);
      setLoading(false);
      return;
    }

    try {
      // Use deep linking to open platform
      const result = await openInSocialMedia(post, selectedPlatform);
      if (result.success) {
        addToast(result.message, 'success');
      } else {
        addToast(result.message, 'error');
      }
    } catch (error) {
      console.error('Posting error:', error);
      addToast('Failed to open platform. Please try again.', 'error');
    } finally {
      setLoading(false);
      setShowDropdown(false);
    }
  };

  const handlePostToAll = async () => {
    setLoading(true);

    // Validate post first
    const validation = validatePost(post);
    if (!validation.isValid) {
      addMissingContentWarning(post, validation.missing);
      setLoading(false);
      return;
    }

    try {
      // Open all platforms using deep links
      const result = await openInAllPlatforms(post);
      addToast(result.message, 'success');
    } catch (error) {
      console.error('Post to all error:', error);
      addToast('Failed to open platforms. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Single platform button
  if (platform) {
    return (
      <button
        onClick={() => handleQuickPost(platform)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-huttle-primary to-huttle-primary-light text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <ExternalLink className="w-4 h-4" />
        )}
        Post to {platform}
      </button>
    );
  }

  // Multi-platform dropdown button
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-huttle-primary to-huttle-primary-light text-white rounded-lg hover:shadow-lg transition-all font-medium"
      >
        <ExternalLink className="w-4 h-4" />
        Post Now
        <span className="ml-1">▼</span>
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-20 min-w-[250px] overflow-hidden">
            {/* Post to all button */}
            {post.platforms && post.platforms.length > 1 && (
              <>
                <button
                  onClick={handlePostToAll}
                  disabled={loading}
                  className="w-full text-left px-4 py-3 hover:bg-huttle-primary hover:bg-opacity-10 transition-all flex items-center gap-3 border-b border-gray-200 font-semibold text-huttle-primary disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  Post to All Platforms
                </button>
              </>
            )}

            {/* Individual platform buttons */}
            {post.platforms && post.platforms.length > 0 ? (
              post.platforms.map((plat) => (
                <button
                  key={plat}
                  onClick={() => handleQuickPost(plat)}
                  disabled={loading}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Post to {plat}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">
                No platforms selected
              </div>
            )}

            {/* Help text */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                💡 Content will be copied to your clipboard and the app will open for platforms that don't support pre-filling.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
