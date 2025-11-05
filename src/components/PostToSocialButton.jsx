import React, { useState, useContext } from 'react';
import { ExternalLink, Copy, Loader } from 'lucide-react';
import { openInSocialMedia, openInAllPlatforms } from '../utils/socialMediaHelpers';
import { useToast } from '../context/ToastContext';
import { validatePost, checkPlatformConnections } from '../utils/socialConnectionChecker';
import { useNotifications } from '../context/NotificationContext';
import { sendPostToN8n, isN8nConfigured } from '../services/n8nAPI';
import { AuthContext } from '../context/AuthContext';

export default function PostToSocialButton({ post, platform = null }) {
  const { addToast } = useToast();
  const { addConnectionWarning, addMissingContentWarning } = useNotifications();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [n8nConfigured, setN8nConfigured] = useState(false);

  // Check n8n configuration on mount
  React.useEffect(() => {
    setN8nConfigured(isN8nConfigured());
  }, []);

  const handleQuickPost = async (selectedPlatform) => {
    setLoading(true);

    // Validate post first
    const validation = validatePost(post);
    if (!validation.isValid) {
      addMissingContentWarning(post, validation.missing);
      setLoading(false);
      return;
    }

    // Check if platform is connected (async)
    const userId = user?.id || 'demo-user-123'; // Fallback for demo
    const connectionCheck = await checkPlatformConnections(post, userId);
    if (!connectionCheck.allConnected) {
      const isThisPlatformConnected = !connectionCheck.unconnected.includes(selectedPlatform);
      if (!isThisPlatformConnected) {
        addConnectionWarning(selectedPlatform);
        setLoading(false);
        setShowDropdown(false);
        return;
      }
    }

    try {
      // Route through n8n if configured and user is authenticated
      if (n8nConfigured && user?.id) {
        const n8nResult = await sendPostToN8n(post, user.id);
        if (n8nResult.success) {
          addToast(`Post sent to ${selectedPlatform} via n8n!`, 'success');
        } else {
          addToast(n8nResult.error || 'Failed to send post via n8n', 'error');
        }
      } else {
        // Fallback to manual posting
        const result = await openInSocialMedia(post, selectedPlatform);
        if (result.success) {
          addToast(result.message, 'success');
        } else {
          addToast(result.message, 'error');
        }
      }
    } catch (error) {
      console.error('Posting error:', error);
      addToast('Failed to post. Please try again.', 'error');
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

    // Check platform connections (async)
    const userId = user?.id || 'demo-user-123'; // Fallback for demo
    const connectionCheck = await checkPlatformConnections(post, userId);
    if (!connectionCheck.allConnected) {
      addToast(`Some platforms not connected: ${connectionCheck.unconnected.join(', ')}`, 'warning');
    }

    try {
      // Route through n8n if configured and user is authenticated
      if (n8nConfigured && user?.id) {
        const n8nResult = await sendPostToN8n(post, user.id);
        if (n8nResult.success) {
          addToast('Post sent to all platforms via n8n!', 'success');
        } else {
          addToast(n8nResult.error || 'Failed to send post via n8n', 'error');
        }
      } else {
        // Fallback to manual posting
        const result = await openInAllPlatforms(post);
        addToast(result.message, 'success');
      }
    } catch (error) {
      console.error('Post to all error:', error);
      addToast('Failed to post to platforms. Please try again.', 'error');
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

