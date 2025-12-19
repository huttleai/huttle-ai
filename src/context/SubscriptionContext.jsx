import { createContext, useState, useContext, useEffect } from 'react';
import { getUserTier, getRemainingUsage, trackUsage, hasFeatureAccess, getStorageUsage as getSupabaseStorageUsage, TIERS, TIER_LIMITS, FEATURES, canAccessFeature as canTierAccessFeature } from '../config/supabase';
import { useToast } from './ToastContext';
import { AuthContext } from './AuthContext';

export const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
  const { addToast: showToast } = useToast();
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  
  // Check for dev mode (same pattern as AuthContext)
  // SECURITY: Only allow via explicit environment variable in development
  const skipAuth = import.meta.env.DEV === true && import.meta.env.VITE_SKIP_AUTH === 'true';
  
  const [userTier, setUserTier] = useState(skipAuth ? TIERS.PRO : TIERS.FREE);
  const [usage, setUsage] = useState({});
  const [storageUsage, setStorageUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Get actual user ID from AuthContext
  const userId = user?.id || null;

  useEffect(() => {
    if (skipAuth) {
      // Dev mode: Set to Pro tier immediately
      setUserTier(TIERS.PRO);
      setLoading(false);
      console.log('🚀 Development mode: Subscription tier set to Pro');
      return;
    }
    
    if (userId) {
      loadUserTier();
      refreshStorageUsage();
    } else {
      // No user logged in, reset to defaults
      setUserTier(TIERS.FREE);
      setUsage({});
      setStorageUsage(0);
      setLoading(false);
    }
  }, [userId, skipAuth]);

  const loadUserTier = async () => {
    try {
      const { success, tier } = await getUserTier(userId);
      if (success) {
        setUserTier(tier);
      }
    } catch (error) {
      console.error('Error loading tier:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFeatureAccess = (feature) => {
    return hasFeatureAccess(userTier, feature);
  };

  const getFeatureLimit = (feature) => {
    // Dev mode: Return unlimited for all features
    if (skipAuth) {
      return Infinity;
    }
    return TIER_LIMITS[userTier]?.[feature] || 0;
  };

  const checkAndTrackUsage = async (feature, metadata = {}) => {
    // Dev mode: Allow all features without limits
    if (skipAuth) {
      return { allowed: true, remaining: Infinity };
    }

    // Check if feature is available for tier
    if (!checkFeatureAccess(feature)) {
      showToast(`This feature requires ${userTier === TIERS.FREE ? 'Essentials' : 'Pro'} plan. Upgrade to unlock!`, 'warning');
      return { allowed: false, reason: 'tier' };
    }

    // Get remaining usage and limit for percentage calculation
    const remaining = await getRemainingUsage(userId, feature, userTier);
    const limit = TIER_LIMITS[userTier]?.[feature] || 0;
    
    if (remaining === Infinity) {
      // Unlimited - track and allow
      await trackUsage(userId, feature, metadata);
      return { allowed: true, remaining: Infinity };
    }

    if (remaining <= 0) {
      showToast(`AI limit reached. Upgrade to Pro for unlimited generations.`, 'error');
      return { allowed: false, reason: 'limit', remaining: 0 };
    }

    // Has usage left - track and allow
    await trackUsage(userId, feature, metadata);
    
    // Calculate usage percentage for threshold-based warnings
    const used = limit - remaining + 1; // +1 because we just used one
    const usagePercent = limit > 0 ? (used / limit) * 100 : 0;
    const remainingAfterUse = remaining - 1;
    
    // Show contextual warnings based on usage thresholds (80%, 90%, 95%)
    if (usagePercent >= 95 && remainingAfterUse > 0) {
      showToast(`Almost out! Only ${remainingAfterUse} AI credit${remainingAfterUse !== 1 ? 's' : ''} left. Upgrade to avoid interruption.`, 'warning');
    } else if (usagePercent >= 90 && remainingAfterUse > 0) {
      showToast(`Running low! Only ${remainingAfterUse} AI credit${remainingAfterUse !== 1 ? 's' : ''} remaining this month.`, 'warning');
    } else if (usagePercent >= 80 && remainingAfterUse > 0) {
      showToast(`You've used ${Math.round(usagePercent)}% of your AI credits. Upgrade for unlimited access.`, 'info');
    }

    return { allowed: true, remaining: remainingAfterUse };
  };

  const refreshUsage = async (feature) => {
    const remaining = await getRemainingUsage(userId, feature, userTier);
    setUsage((prev) => ({ ...prev, [feature]: remaining }));
    return remaining;
  };

  const getTierDisplayName = (tier) => {
    const names = {
      [TIERS.FREE]: 'Free',
      [TIERS.ESSENTIALS]: 'Essentials',
      [TIERS.PRO]: 'Pro',
    };
    return names[tier] || 'Free';
  };

  const getTierColor = (tier) => {
    const colors = {
      [TIERS.FREE]: 'text-gray-600',
      [TIERS.ESSENTIALS]: 'text-huttle-primary',
      [TIERS.PRO]: 'text-purple-600',
    };
    return colors[tier] || 'text-gray-600';
  };

  const getStorageLimit = () => {
    // Dev mode: Return Pro tier storage limit (25GB)
    if (skipAuth) {
      return TIER_LIMITS[TIERS.PRO]?.storageLimit || 25 * 1024 * 1024 * 1024; // 25GB in bytes
    }
    return TIER_LIMITS[userTier]?.storageLimit || TIER_LIMITS[TIERS.FREE].storageLimit;
  };

  const getStorageUsage = () => {
    return storageUsage;
  };

  const refreshStorageUsage = async () => {
    // Dev mode: Skip Supabase calls
    if (skipAuth) {
      setStorageUsage(0);
      return 0;
    }
    
    try {
      const result = await getSupabaseStorageUsage(userId);
      if (result.success) {
        setStorageUsage(result.usageBytes);
        return result.usageBytes;
      }
    } catch (error) {
      console.error('Error refreshing storage usage:', error);
    }
    return storageUsage;
  };

  const canUploadFile = (fileSize) => {
    const limit = getStorageLimit();
    const currentUsage = getStorageUsage();
    return (currentUsage + fileSize) <= limit;
  };

  const getUpgradeMessage = () => {
    if (userTier === TIERS.FREE) {
      return 'Upgrade to Essentials or Pro to unlock this feature!';
    }
    if (userTier === TIERS.ESSENTIALS) {
      return 'Upgrade to Pro for unlimited access!';
    }
    return '';
  };

  const canAccessFeatureByName = (featureName) => {
    return canTierAccessFeature(featureName, userTier);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        userTier,
        userId,
        usage,
        loading,
        checkFeatureAccess,
        getFeatureLimit,
        checkAndTrackUsage,
        refreshUsage,
        getTierDisplayName,
        getTierColor,
        canAccessFeature: canAccessFeatureByName,
        getStorageLimit,
        getStorageUsage,
        refreshStorageUsage,
        canUploadFile,
        getUpgradeMessage,
        TIERS,
        TIER_LIMITS,
        FEATURES,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// Custom hook
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

