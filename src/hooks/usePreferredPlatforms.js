import { useState, useEffect, useCallback, useContext } from 'react';
import { InstagramIcon, FacebookIcon, TikTokIcon, TwitterXIcon, YouTubeIcon } from '../components/SocialIcons';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';

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
 * After the signed-in user's brand profile has loaded (`brandFetchComplete`),
 * `user_profile.preferred_platforms` is the source of truth — including an empty
 * array — so Settings and Brand Profile stay in sync and clearing all platforms
 * does not resurrect stale `localStorage` values.
 *
 * Before that (or when logged out), `preferredPlatforms` in localStorage is used.
 *
 * @returns {Object} Platform management utilities
 * - preferredPlatforms: Raw localStorage-backed selection (logged-out / pre-fetch)
 * - preferredPlatformIds: Active normalized platform IDs (profile or local fallback)
 * - platforms: Full platform objects for active IDs
 * - allPlatforms: All available platforms (for Settings page)
 * - hasPlatformsConfigured: True when at least one platform is selected
 * - togglePlatform: Toggle by canonical id or any label `normalizePlatformName` accepts
 * - isPlatformPreferred: Check by id or label
 * - savePlatforms: Bulk set localStorage list
 */
export function usePreferredPlatforms() {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const brandContext = useContext(BrandContext);
  const brandData = brandContext?.brandData;
  const brandFetchComplete = brandContext?.brandFetchComplete ?? false;

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

  const brandPlatformIds = [
    ...new Set(
      (brandData?.platforms || [])
        .map((name) => normalizePlatformName(name))
        .filter(Boolean)
    ),
  ];

  const preferredPlatformIds = [
    ...new Set(
      preferredPlatforms
        .map((name) => normalizePlatformName(name))
        .filter(Boolean)
    ),
  ];

  /** Signed-in + profile fetch finished → always trust `brandData.platforms` (even []). */
  const useBrandProfileForPlatforms = Boolean(user?.id && brandFetchComplete);

  const activePlatformIds = useBrandProfileForPlatforms
    ? brandPlatformIds
    : preferredPlatformIds;

  const hasPlatformsConfigured = activePlatformIds.length > 0;

  // Filter ALL_PLATFORMS to only include active platforms
  const platforms = ALL_PLATFORMS.filter(platform => 
    activePlatformIds.includes(platform.id)
  );

  const togglePlatform = useCallback(
    (platformIdOrLabel) => {
      const toggledId = normalizePlatformName(platformIdOrLabel);
      if (!toggledId) return;

      if (useBrandProfileForPlatforms && brandContext?.updateBrandData) {
        const currentBrandPlatforms = brandContext.brandData?.platforms || [];
        const isSelected = currentBrandPlatforms.some(
          (p) => normalizePlatformName(p) === toggledId
        );
        const newPlatforms = isSelected
          ? currentBrandPlatforms.filter((p) => normalizePlatformName(p) !== toggledId)
          : [...currentBrandPlatforms, toggledId];
        brandContext.updateBrandData({ platforms: newPlatforms });
        return;
      }

      setPreferredPlatforms((prev) => {
        const isSelected = prev.some((p) => normalizePlatformName(p) === toggledId);
        const newPlatforms = isSelected
          ? prev.filter((p) => normalizePlatformName(p) !== toggledId)
          : [...prev, toggledId];

        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPlatforms));

        return newPlatforms;
      });
    },
    [useBrandProfileForPlatforms, brandContext]
  );

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
    hasPlatformsConfigured,
    // Utility functions
    togglePlatform,
    isPlatformPreferred,
    savePlatforms
  };
}

export default usePreferredPlatforms;














