import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { getRemainingUsage, trackUsage, hasFeatureAccess, getStorageUsage as getSupabaseStorageUsage, supabase, TABLES, TIERS, TIER_LIMITS, FEATURES, canAccessFeature as canTierAccessFeature } from '../config/supabase';
import { AuthContext } from './AuthContext';
import { getSubscriptionStatus, isDemoMode } from '../services/stripeAPI';

export const SubscriptionContext = createContext();

// Demo mode storage key
const DEMO_TIER_KEY = 'demo_subscription_tier';
const ACTIVE_ACCESS_STATUSES = new Set(['active', 'trialing', 'past_due']);

async function getDatabaseSubscription(userId) {
  const { data, error } = await supabase
    .from(TABLES.SUBSCRIPTIONS)
    .select('id, user_id, tier, status')
    .eq('user_id', userId)
    .in('status', Array.from(ACTIVE_ACCESS_STATUSES))
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: true, subscription: null };
    }

    return { success: false, error, subscription: null };
  }

  return { success: true, subscription: data ?? null };
}

function normalizeTier(plan) {
  if (!plan) return null;

  const normalizedPlan = String(plan).toLowerCase();
  if (normalizedPlan === 'essentials') return TIERS.ESSENTIALS;
  if (normalizedPlan === 'pro') return TIERS.PRO;
  if (normalizedPlan === 'builder' || normalizedPlan === 'builders' || normalizedPlan === 'builders_club') {
    return TIERS.BUILDER;
  }
  if (normalizedPlan === 'founders' || normalizedPlan === 'founder' || normalizedPlan === 'founders_club') {
    return TIERS.FOUNDER;
  }

  return null;
}

export function SubscriptionProvider({ children }) {
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  
  // Check for dev mode (same pattern as AuthContext)
  // SECURITY: Only allow via explicit environment variable in development
  const skipAuth = import.meta.env.DEV === true && import.meta.env.VITE_SKIP_AUTH === 'true';
  
  // Check if in demo mode (Stripe not configured)
  const demoMode = isDemoMode();

  const [userTier, setUserTier] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
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
    return true;
  }, [skipAuth]);

  // Listen for demo tier changes from other components (e.g., checkout simulation)
  useEffect(() => {
    if (!skipAuth) return;
    
    const handleStorageChange = (e) => {
      if (e.key === DEMO_TIER_KEY && e.newValue) {
        if (Object.values(TIERS).includes(e.newValue)) {
          setUserTier(e.newValue);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [skipAuth]);

  const refreshSubscription = useCallback(async () => {
    if (skipAuth) {
      setUserTier(localStorage.getItem(DEMO_TIER_KEY) || TIERS.PRO);
      setSubscription(null);
      setSubscriptionStatus('active');
      setLoading(false);
      return;
    }

    if (!userId) {
      setUserTier(null);
      setSubscription(null);
      setSubscriptionStatus('inactive');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [databaseResult, stripeResult] = await Promise.all([
        getDatabaseSubscription(userId),
        getSubscriptionStatus(),
      ]);

      if (!databaseResult.success) {
        console.error('Error loading subscription from database:', databaseResult.error);
      }

      const databaseSubscription = databaseResult.subscription;
      const stripeSubscription = stripeResult.success ? stripeResult.subscription : null;
      const databaseTier = databaseSubscription ? normalizeTier(databaseSubscription.tier) : null;
      const nextStatus = databaseSubscription?.status || stripeSubscription?.status || stripeResult.status || 'inactive';
      const nextTier = databaseTier
        || (stripeSubscription && ACTIVE_ACCESS_STATUSES.has(nextStatus)
          ? normalizeTier(stripeSubscription.plan || stripeResult.plan)
          : null);
      const nextSubscription = stripeSubscription
        ? {
            ...stripeSubscription,
            ...(databaseSubscription
              ? {
                  id: databaseSubscription.id,
                  user_id: databaseSubscription.user_id,
                  plan: databaseTier,
                  tier: databaseTier,
                  status: databaseSubscription.status,
                }
              : {}),
          }
        : (databaseSubscription
          ? {
              ...databaseSubscription,
              plan: databaseTier,
              tier: databaseTier,
            }
          : null);

      setSubscription(nextSubscription);
      setSubscriptionStatus(nextStatus);
      setUserTier(nextTier);
    } catch (error) {
      console.error('Error loading subscription:', error);
      setSubscription(null);
      setSubscriptionStatus('inactive');
      setUserTier(null);
    } finally {
      setLoading(false);
    }
  }, [skipAuth, userId]);

  const refreshStorageUsage = useCallback(async () => {
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
  }, [skipAuth, storageUsage, userId]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  useEffect(() => {
    if (userId) {
      refreshStorageUsage();
    } else {
      setStorageUsage(0);
    }
  }, [userId, refreshStorageUsage]);

  const isTrialing = subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';
  const trialEndsAt = useMemo(
    () => (subscription?.trialEnd ? new Date(subscription.trialEnd) : null),
    [subscription?.trialEnd]
  );
  const trialDaysRemaining = useMemo(() => {
    if (!trialEndsAt) return null;

    const remainingMs = trialEndsAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  }, [trialEndsAt]);
  const hasPaidAccess = Boolean(userTier) && ACTIVE_ACCESS_STATUSES.has(subscriptionStatus);

  const checkFeatureAccess = useCallback((feature) => {
    return hasFeatureAccess(userTier, feature) || canTierAccessFeature(feature, userTier);
  }, [userTier]);

  const getFeatureLimit = useCallback((feature) => {
    return TIER_LIMITS[userTier]?.[feature] ?? 0;
  }, [userTier]);

  const getAuthoritativeRemainingUsage = useCallback(async (feature) => {
    if (skipAuth) {
      return Infinity;
    }

    if (!userId) {
      return 0;
    }

    const featureLimit = getFeatureLimit(feature);

    if (featureLimit === -1 || featureLimit === true) {
      return Infinity;
    }

    if (featureLimit === false || featureLimit === 0) {
      return 0;
    }

    if (typeof featureLimit !== 'number') {
      return Infinity;
    }

    return getRemainingUsage(userId, feature, userTier);
  }, [getFeatureLimit, skipAuth, userId, userTier]);

  const checkAndTrackUsage = async (feature, metadata = {}) => {
    if (!userId) {
      return { allowed: false, reason: 'auth', remaining: 0 };
    }

    if (!checkFeatureAccess(feature)) {
      return { allowed: false, reason: 'upgrade', remaining: 0 };
    }

    const remaining = await getAuthoritativeRemainingUsage(feature);
    if (remaining <= 0) {
      return { allowed: false, reason: 'limit', remaining: 0 };
    }

    try {
      await trackUsage(userId, feature, metadata);
    } catch (e) {
      console.warn('Usage tracking failed (non-blocking):', e);
    }

    return {
      allowed: true,
      remaining: remaining === Infinity ? Infinity : Math.max(0, remaining - 1),
    };
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
      [TIERS.ESSENTIALS]: 'Essentials',
      [TIERS.PRO]: 'Pro',
      [TIERS.BUILDER]: 'Builders Club',
      [TIERS.FOUNDER]: 'Founders Club',
    };
    return names[tier] || 'No Active Plan';
  };

  const getTierColor = (tier) => {
    const colors = {
      [TIERS.ESSENTIALS]: 'text-huttle-primary',
      [TIERS.PRO]: 'text-purple-600',
      [TIERS.BUILDER]: 'text-sky-600',
      [TIERS.FOUNDER]: 'text-amber-600',
    };
    return colors[tier] || 'text-gray-600';
  };

  const getStorageLimit = () => {
    if (skipAuth) {
      return TIER_LIMITS[TIERS.PRO]?.storageLimit || 50 * 1024 * 1024 * 1024;
    }
    return TIER_LIMITS[userTier]?.storageLimit ?? 0;
  };

  const getStorageUsage = () => {
    return storageUsage;
  };

  const canUploadFile = (fileSize) => {
    const limit = getStorageLimit();
    const currentUsage = getStorageUsage();
    return (currentUsage + fileSize) <= limit;
  };

  const getUpgradeMessage = () => {
    if (isPastDue) {
      return 'Your payment needs attention. Update your billing details to keep full access.';
    }

    if (subscriptionStatus === 'canceled') {
      return 'Your subscription has ended. Choose a plan to get back to creating content.';
    }

    if (!userTier) {
      return 'Choose a plan to unlock Huttle AI.';
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
        subscription,
        subscriptionStatus,
        isTrialing,
        isPastDue,
        trialEndsAt,
        trialDaysRemaining,
        hasPaidAccess,
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
        refreshSubscription,
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

