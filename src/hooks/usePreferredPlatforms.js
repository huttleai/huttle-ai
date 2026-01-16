import { useState, useEffect, useCallback } from 'react';
import { InstagramIcon, FacebookIcon, TikTokIcon, TwitterXIcon, YouTubeIcon } from '../components/SocialIcons';

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
const DEFAULT_PLATFORMS = ['Instagram', 'TikTok'];

/**
 * Custom hook to manage preferred platforms
 * 
 * @returns {Object} Platform management utilities
 * - preferredPlatforms: Array of platform names the user has selected
 * - preferredPlatformIds: Array of normalized platform IDs
 * - platforms: Full platform objects filtered by user preferences
 * - allPlatforms: All available platforms (for Settings page)
 * - togglePlatform: Function to toggle a platform on/off
 * - isPlatformPreferred: Function to check if a platform is preferred
 * - savePlatforms: Function to save platforms to localStorage
 */
export function usePreferredPlatforms() {
  const [preferredPlatforms, setPreferredPlatforms] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PLATFORMS;
    } catch {
      return DEFAULT_PLATFORMS;
    }
  });

  // Sync with localStorage changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : DEFAULT_PLATFORMS;
          setPreferredPlatforms(newValue);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Get normalized IDs for the preferred platforms
  const preferredPlatformIds = preferredPlatforms
    .map(name => normalizePlatformName(name))
    .filter(Boolean);

  // Filter ALL_PLATFORMS to only include preferred ones
  const platforms = ALL_PLATFORMS.filter(platform => 
    preferredPlatformIds.includes(platform.id)
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
    return preferredPlatformIds.includes(normalizedId);
  }, [preferredPlatformIds]);

  // Save platforms directly (for bulk updates)
  const savePlatforms = useCallback((platforms) => {
    setPreferredPlatforms(platforms);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(platforms));
  }, []);

  return {
    // User's preferred platform names (as stored)
    preferredPlatforms,
    // Normalized IDs
    preferredPlatformIds,
    // Full platform objects filtered by preferences
    platforms,
    // All available platforms (for Settings page)
    allPlatforms: ALL_PLATFORMS,
    // Utility functions
    togglePlatform,
    isPlatformPreferred,
    savePlatforms
  };
}

export default usePreferredPlatforms;












