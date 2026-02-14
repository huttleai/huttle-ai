import { useState, useEffect, useCallback, useContext } from 'react';
import { InstagramIcon, FacebookIcon, TikTokIcon, TwitterXIcon, YouTubeIcon } from '../components/SocialIcons';
import { BrandContext } from '../context/BrandContext';

/**
 * Master list of all supported platforms with their metadata
 * This is the single source of truth for platform configuration
 */
export const ALL_PLATFORMS = [
  { 
    id: 'instagram',
    name: 'Instagram', 
    icon: InstagramIcon, 
    color: 'bg-pink-500',
    gradient: 'from-purple-600 to-pink-600',
    charLimit: 2200,
    hashtagTip: '10-15 hashtags',
    description: 'Photos, reels, and stories'
  },
  { 
    id: 'facebook',
    name: 'Facebook', 
    icon: FacebookIcon, 
    color: 'bg-blue-600',
    gradient: 'from-blue-600 to-blue-800',
    charLimit: 63206,
    hashtagTip: '2-5 hashtags',
    description: 'Posts and stories'
  },
  { 
    id: 'tiktok',
    name: 'TikTok', 
    icon: TikTokIcon, 
    color: 'bg-black',
    gradient: 'from-black to-gray-800',
    charLimit: 2200,
    hashtagTip: '3-5 hashtags',
    description: 'Short-form videos'
  },
  { 
    id: 'youtube',
    name: 'YouTube', 
    icon: YouTubeIcon, 
    color: 'bg-red-600',
    gradient: 'from-red-600 to-red-800',
    charLimit: 5000,
    hashtagTip: '3-5 hashtags',
    description: 'Videos and shorts'
  },
  { 
    id: 'x',
    name: 'X', 
    displayName: 'X (Twitter)',
    icon: TwitterXIcon, 
    color: 'bg-black',
    gradient: 'from-black to-gray-900',
    charLimit: 280,
    hashtagTip: '1-2 hashtags',
    description: 'Tweets and threads'
  }
];

/**
 * Normalize platform name to match our standard IDs
 * Handles various formats: "Instagram", "instagram", "X (Twitter)", "twitter", etc.
 */
export const normalizePlatformName = (name) => {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  
  if (lower.includes('instagram')) return 'instagram';
  if (lower.includes('facebook')) return 'facebook';
  if (lower.includes('tiktok')) return 'tiktok';
  if (lower.includes('youtube')) return 'youtube';
  if (lower === 'x' || lower.includes('twitter') || lower === 'x (twitter)') return 'x';
  
  return null;
};

/**
 * Get platform by ID or name
 */
export const getPlatformById = (idOrName) => {
  const normalizedId = normalizePlatformName(idOrName);
  return ALL_PLATFORMS.find(p => p.id === normalizedId) || null;
};

const STORAGE_KEY = 'preferredPlatforms';

/**
 * Custom hook to manage preferred platforms
 * 
 * Brand Voice platforms are the source of truth. If the user has set platforms
 * in their Brand Voice, only those platforms are shown. If no Brand Voice
 * platforms are set, `platforms` will be empty and `hasPlatformsConfigured`
 * will be false — callers should show a setup prompt.
 * 
 * @returns {Object} Platform management utilities
 * - preferredPlatforms: Array of platform names the user has selected
 * - preferredPlatformIds: Array of normalized platform IDs
 * - platforms: Full platform objects filtered by Brand Voice (empty if none configured)
 * - allPlatforms: All available platforms (for Settings page)
 * - hasPlatformsConfigured: Whether the user has selected platforms in Brand Voice
 * - togglePlatform: Function to toggle a platform on/off
 * - isPlatformPreferred: Function to check if a platform is preferred
 * - savePlatforms: Function to save platforms to localStorage
 */
export function usePreferredPlatforms() {
  const brandContext = useContext(BrandContext);
  const brandData = brandContext?.brandData;

  const [preferredPlatforms, setPreferredPlatforms] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync with localStorage changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : [];
          setPreferredPlatforms(newValue);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Brand Voice platforms are the primary source of truth
  const brandPlatformIds = (brandData?.platforms || [])
    .map(name => normalizePlatformName(name))
    .filter(Boolean);

  // Whether the user has configured platforms in Brand Voice
  const hasPlatformsConfigured = brandPlatformIds.length > 0;

  // Get normalized IDs for the preferred platforms (localStorage)
  const preferredPlatformIds = preferredPlatforms
    .map(name => normalizePlatformName(name))
    .filter(Boolean);

  // If Brand Voice has platforms, use those as source of truth
  // Otherwise, fall back to localStorage preferences (which may also be empty)
  const activePlatformIds = hasPlatformsConfigured
    ? brandPlatformIds
    : preferredPlatformIds;

  // Filter ALL_PLATFORMS to only include active platforms
  const platforms = ALL_PLATFORMS.filter(platform => 
    activePlatformIds.includes(platform.id)
  );

  // Toggle a platform preference
  const togglePlatform = useCallback((platformName) => {
    setPreferredPlatforms(prev => {
      const newPlatforms = prev.includes(platformName)
        ? prev.filter(p => p !== platformName)
        : [...prev, platformName];
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPlatforms));
      
      return newPlatforms;
    });
  }, []);

  // Check if a platform is preferred
  const isPlatformPreferred = useCallback((platformName) => {
    const normalizedId = normalizePlatformName(platformName);
    return activePlatformIds.includes(normalizedId);
  }, [activePlatformIds]);

  // Save platforms directly (for bulk updates)
  const savePlatforms = useCallback((platforms) => {
    setPreferredPlatforms(platforms);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(platforms));
  }, []);

  return {
    // User's preferred platform names (as stored)
    preferredPlatforms,
    // Normalized IDs
    preferredPlatformIds: activePlatformIds,
    // Full platform objects filtered by Brand Voice (empty if none configured)
    platforms,
    // All available platforms (for Settings page)
    allPlatforms: ALL_PLATFORMS,
    // Whether Brand Voice platforms are configured
    hasPlatformsConfigured,
    // Utility functions
    togglePlatform,
    isPlatformPreferred,
    savePlatforms
  };
}

export default usePreferredPlatforms;














