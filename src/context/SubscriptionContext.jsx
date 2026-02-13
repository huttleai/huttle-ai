import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getUserTier, getRemainingUsage, trackUsage, hasFeatureAccess, getStorageUsage as getSupabaseStorageUsage, TIERS, TIER_LIMITS, FEATURES, canAccessFeature as canTierAccessFeature } from '../config/supabase';
import { useToast } from './ToastContext';
import { AuthContext } from './AuthContext';
import { isDemoMode } from '../services/stripeAPI';

export const SubscriptionContext = createContext();

// Demo mode storage key
const DEMO_TIER_KEY = 'demo_subscription_tier';

export function SubscriptionProvider({ children }) {
  const { addToast: showToast } = useToast();
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  
  // Check for dev mode (same pattern as AuthContext)
  // SECURITY: Only allow via explicit environment variable in development
  const skipAuth = import.meta.env.DEV === true && import.meta.env.VITE_SKIP_AUTH === 'true';
  
  // Check if in demo mode (Stripe not configured)
  const demoMode = isDemoMode();
  
  // Founders Only: ALL authenticated users are effectively Pro.
  // No free/essentials tier enforcement — paid-entry app.
  const getInitialTier = () => {
    return TIERS.PRO;
  };
  
  const [userTier, setUserTier] = useState(getInitialTier);
  const [usage, setUsage] = useState({});
  const [storageUsage, setStorageUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Get actual user ID from AuthContext
  const userId = user?.id || null;

  // Function to change tier in demo mode
  const setDemoTier = useCallback((newTier) => {
    if (!skipAuth) {
      console.warn('setDemoTier only works in dev skip-auth mode');
      return false;
    }
    if (!Object.values(TIERS).includes(newTier)) {
      console.error('Invalid tier:', newTier);
      return false;
    }
    localStorage.setItem(DEMO_TIER_KEY, newTier);
    setUserTier(newTier);
    console.log('🎭 Demo Mode: Tier changed to', newTier);
    return true;
  }, [skipAuth]);

  // Listen for demo tier changes from other components (e.g., checkout simulation)
  useEffect(() => {
    if (!skipAuth) return;
    
    const handleStorageChange = (e) => {
      if (e.key === DEMO_TIER_KEY && e.newValue) {
        if (Object.values(TIERS).includes(e.newValue)) {
          setUserTier(e.newValue);
          console.log('🎭 Demo Mode: Tier synced to', e.newValue);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [skipAuth]);

  // Founders Only: Force Pro tier for ALL authenticated users.
  // This bypasses Stripe tier lookups entirely — every user is a founding member.
  useEffect(() => {
    setUserTier(TIERS.PRO);
    setLoading(false);
    
    if (userId) {
      refreshStorageUsage();
    }
    
    console.log('🚀 Founders Only: All users set to Pro tier');
  }, [userId]);

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

  const checkFeatureAccess = useCallback((feature) => {
    // Founders Only: All features unlocked
    return true;
  }, []);

  const getFeatureLimit = useCallback((feature) => {
    // Founders Only: Unlimited for all features
    return TIER_LIMITS[TIERS.PRO]?.[feature] || Infinity;
  }, []);

  const getAuthoritativeRemainingUsage = useCallback(async (feature) => {
    // Founders Only: Unlimited usage for all features
    return Infinity;
  }, []);

  const checkAndTrackUsage = async (feature, metadata = {}) => {
    // Founders Only: All features allowed for all authenticated users
    if (!userId) {
      return { allowed: false, reason: 'auth', remaining: 0 };
    }

    // Track usage for analytics but never block
    try {
      await trackUsage(userId, feature, metadata);
    } catch (e) {
      console.warn('Usage tracking failed (non-blocking):', e);
    }

    return { allowed: true, remaining: Infinity };
  };

  const refreshUsage = useCallback(async (feature) => {
    const remaining = await getAuthoritativeRemainingUsage(feature);
    setUsage((prev) => (
      prev?.[feature] === remaining ? prev : { ...prev, [feature]: remaining }
    ));
    return remaining;
  }, [getAuthoritativeRemainingUsage]);

  const getTierDisplayName = (tier) => {
    const names = {
      [TIERS.FREE]: 'Free',
      [TIERS.ESSENTIALS]: 'Essentials',
      [TIERS.PRO]: 'Pro',
      [TIERS.FOUNDER]: 'Founders Club',
    };
    return names[tier] || 'Free';
  };

  const getTierColor = (tier) => {
    const colors = {
      [TIERS.FREE]: 'text-gray-600',
      [TIERS.ESSENTIALS]: 'text-huttle-primary',
      [TIERS.PRO]: 'text-purple-600',
      [TIERS.FOUNDER]: 'text-amber-600',
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
    // Founders Only: No upgrade messages — all users are Pro
    return '';
  };

  const canAccessFeatureByName = (featureName) => {
    // Founders Only: All features unlocked
    return true;
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
        getAuthoritativeRemainingUsage,
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
        // Demo mode helpers
        isDemoMode: demoMode,
        setDemoTier,
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

