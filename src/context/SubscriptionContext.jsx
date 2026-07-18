import { createContext, useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { getRemainingUsage, trackUsage, hasFeatureAccess, getStorageUsage as getSupabaseStorageUsage, supabase, TABLES, TIERS, TIER_LIMITS, FEATURES, canAccessFeature as canTierAccessFeature } from '../config/supabase';
import { AuthContext, SESSION_REFRESHED_EVENT } from './AuthContext';
import { getSubscriptionStatus, isDemoMode } from '../services/stripeAPI';
import { getConfirmedAccessToken } from '../utils/authReady';
import { getTierConfig } from '../utils/tierConfig';

export const SubscriptionContext = createContext();

const subscriptionCache = { data: null, timestamp: null };
const CACHE_TTL_MS = 60 * 1000;

export function clearSubscriptionCache() {
  subscriptionCache.data = null;
  subscriptionCache.timestamp = null;
}

// Demo mode storage key
const DEMO_TIER_KEY = 'demo_subscription_tier';
const ACTIVE_ACCESS_STATUSES = new Set(['active', 'trialing', 'past_due']);
const MAX_SUBSCRIPTION_RETRIES = 3;
const SUBSCRIPTION_INITIAL_RETRY_DELAY_MS = 1000;
const SUBSCRIPTION_POLL_INTERVAL_MS = 60000;
const SUBSCRIPTION_TIMEOUT_MS = 10000;

async function getDatabaseSubscription(userId) {
  const { data, error } = await supabase
    .from(TABLES.SUBSCRIPTIONS)
    .select('id, user_id, tier, status, current_period_start, current_period_end, cancel_at_period_end, cancelled_at')
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
  if (normalizedPlan === 'free') return TIERS.FREE;
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
  const sessionConfirmed = authContext?.sessionConfirmed ?? false;
  
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
  /** True after the first subscription resolution for the current session (blocks ProtectedRoute until then; background polls do not flip this). */
  const [subscriptionReady, setSubscriptionReady] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [isSubscriptionDegraded, setIsSubscriptionDegraded] = useState(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const requestTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isRefreshingRef = useRef(false);
  /** Last successfully resolved subscription state (kept during degraded loads). */
  const lastKnownRef = useRef({ tier: null, status: null, subscription: null });
  /** Timestamp of the last refresh attempt (debounces TOKEN_REFRESHED nudges). */
  const lastRefreshAtRef = useRef(0);
  /** Mirrors ready/degraded state for event listeners without stale closures. */
  const subscriptionStateRef = useRef({ ready: false, degraded: false });
  /** Lets scheduleRetry re-invoke refreshSubscription without a circular useCallback dependency. */
  const refreshSubscriptionRef = useRef(null);

  // Get actual user ID from AuthContext
  const userId = user?.id || null;

  useEffect(() => {
    setSubscriptionReady(false);
    lastKnownRef.current = { tier: null, status: null, subscription: null };
    retryCountRef.current = 0;
  }, [userId]);

  useEffect(() => {
    subscriptionStateRef.current = { ready: subscriptionReady, degraded: isSubscriptionDegraded };
  }, [subscriptionReady, isSubscriptionDegraded]);

  const applySubscriptionFallback = useCallback(({ status = 'inactive', tier = null, degraded = false, error = null } = {}) => {
    setSubscription(null);
    setSubscriptionStatus(status);
    setUserTier(tier);
    setSubscriptionError(error);
    setIsSubscriptionDegraded(degraded);
  }, []);

  const clearRequestTimeout = useCallback(() => {
    if (requestTimeoutRef.current) {
      window.clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
  }, []);

  const abortInFlightSubscriptionRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const clearSubscriptionTimers = useCallback(() => {
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    clearRequestTimeout();
    abortInFlightSubscriptionRequest();
  }, [abortInFlightSubscriptionRequest, clearRequestTimeout]);

  const scheduleRetry = useCallback(() => {
    if (retryCountRef.current >= MAX_SUBSCRIPTION_RETRIES) {
      return false;
    }

    const retryDelay = SUBSCRIPTION_INITIAL_RETRY_DELAY_MS * (2 ** retryCountRef.current);
    retryCountRef.current += 1;

    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = window.setTimeout(() => {
      retryTimeoutRef.current = null;
      void refreshSubscriptionRef.current?.({ preserveRetryState: true });
    }, retryDelay);

    return true;
  }, []);

  /**
   * Timeout/transient failure path. Never confirms FREE for a paying user:
   * keeps the last-known tier when one exists (degraded but usable), otherwise
   * stays unresolved (subscriptionReady=false) while retries are pending, and
   * only defaults to a degraded FREE after retries are exhausted with no
   * last-known tier so users are never locked behind an infinite spinner.
   */
  const applyDegradedSubscriptionState = useCallback((message) => {
    const lastKnown = lastKnownRef.current;
    const didScheduleRetry = scheduleRetry();

    setSubscriptionError(message);
    setIsSubscriptionDegraded(true);

    if (lastKnown.tier) {
      setSubscription(lastKnown.subscription);
      setUserTier(lastKnown.tier);
      setSubscriptionStatus(lastKnown.status || 'unknown');
      setSubscriptionReady(true);
      if (!didScheduleRetry) {
        retryCountRef.current = 0;
      }
      return;
    }

    setSubscriptionStatus('unknown');

    if (!didScheduleRetry) {
      setUserTier(TIERS.FREE);
      setSubscription(null);
      setSubscriptionReady(true);
      retryCountRef.current = 0;
      return;
    }
    // Initial load still unresolved and a retry is scheduled — keep
    // subscriptionReady=false so ProtectedRoute keeps showing the loader.
  }, [scheduleRetry]);

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

  const refreshSubscription = useCallback(async ({ preserveRetryState = false, bypassCache = false } = {}) => {
    if (skipAuth) {
      retryCountRef.current = 0;
      setUserTier(localStorage.getItem(DEMO_TIER_KEY) || TIERS.PRO);
      setSubscription(null);
      setSubscriptionStatus('active');
      setSubscriptionError(null);
      setIsSubscriptionDegraded(false);
      setLoading(false);
      setSubscriptionReady(true);
      return;
    }

    if (!userId) {
      retryCountRef.current = 0;
      clearSubscriptionTimers();
      applySubscriptionFallback();
      setLoading(false);
      setSubscriptionReady(false);
      return;
    }

    if (!sessionConfirmed) {
      // Half-session (cached user, session never confirmed): do NOT confirm FREE.
      // Keep the route in a loading state — AuthContext recovery or a late
      // TOKEN_REFRESHED event will nudge this refresh once a real session exists.
      clearSubscriptionTimers();
      setSubscriptionStatus('unknown');
      setIsSubscriptionDegraded(true);
      setSubscriptionError('Restoring your session…');
      setLoading(true);
      setSubscriptionReady(false);
      return;
    }

    if (isRefreshingRef.current) {
      // A scheduled retry fired while the previous request is still hanging.
      // Re-schedule instead of dropping it; once retries are exhausted, resolve
      // degraded so the route is never locked behind the spinner.
      if (preserveRetryState && !scheduleRetry()) {
        applyDegradedSubscriptionState('Billing status is temporarily unavailable.');
      }
      return;
    }

    if (!preserveRetryState && retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    isRefreshingRef.current = true;
    setLoading(true);
    lastRefreshAtRef.current = Date.now();

    // Token gate: acquire a real Bearer token (getSession → refreshSession once
    // with transient-network backoff) BEFORE starting the request budget, so a
    // slow token refresh does not eat the 10s window or resolve to FREE.
    let hasAccessToken = false;
    try {
      await getConfirmedAccessToken();
      hasAccessToken = true;
    } catch {
      hasAccessToken = false;
    }

    if (!hasAccessToken) {
      isRefreshingRef.current = false;
      setLoading(false);
      applyDegradedSubscriptionState('Billing status is temporarily unavailable while your session reconnects.');
      return;
    }

    let timedOut = false;
    abortInFlightSubscriptionRequest();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    requestTimeoutRef.current = window.setTimeout(() => {
      requestTimeoutRef.current = null;
      timedOut = true;
      console.warn('⚠️ [Subscription] Load timed out after 10s — keeping last-known tier and retrying.');
      abortController.abort();
      setLoading(false);
      applyDegradedSubscriptionState('Billing status is temporarily unavailable. Retrying…');
    }, SUBSCRIPTION_TIMEOUT_MS);

    try {
      const isCacheValid =
        !bypassCache &&
        subscriptionCache.data !== null &&
        subscriptionCache.timestamp !== null &&
        Date.now() - subscriptionCache.timestamp < CACHE_TTL_MS;

      const [databaseResult, stripeResult] = await Promise.all([
        getDatabaseSubscription(userId),
        isCacheValid
          ? Promise.resolve(subscriptionCache.data)
          : getSubscriptionStatus({ signal: abortController.signal }),
      ]);

      clearRequestTimeout();
      abortControllerRef.current = null;
      if (timedOut) return;

      if (!databaseResult.success) {
        console.error('Error loading subscription from database:', databaseResult.error);
      }

      const databaseSubscription = databaseResult.subscription;
      const hasActiveDatabaseSubscription = Boolean(
        databaseSubscription && ACTIVE_ACCESS_STATUSES.has(databaseSubscription.status)
      );

      if ((stripeResult?.unauthorized || stripeResult?.statusCode === 401) && !hasActiveDatabaseSubscription) {
        // stripeAPI already refreshed the session and retried once on 401. A
        // persistent 401 with a paid last-known tier is treated as a degraded
        // load (retry) rather than a confirmed downgrade to FREE.
        if (lastKnownRef.current.tier && lastKnownRef.current.tier !== TIERS.FREE) {
          applyDegradedSubscriptionState('Billing status could not be verified. Retrying…');
          return;
        }
        retryCountRef.current = 0;
        clearSubscriptionTimers();
        applySubscriptionFallback({ tier: TIERS.FREE });
        setSubscriptionReady(true);
        return;
      }

      const stripeSubscription = stripeResult.success ? stripeResult.subscription : null;
      const databaseTier = databaseSubscription ? normalizeTier(databaseSubscription.tier) : null;
      const nextStatus = databaseSubscription?.status || stripeSubscription?.status || stripeResult.status || 'inactive';
      const hasActiveSubscription = ACTIVE_ACCESS_STATUSES.has(nextStatus);
      const resolvedStripeTier = normalizeTier(stripeSubscription?.plan || stripeResult.plan);
      const nextTier = hasActiveSubscription
        ? (databaseTier || resolvedStripeTier || TIERS.FREE)
        : TIERS.FREE;
      // Build the public subscription object. Sensitive Stripe IDs are stripped:
      // the server-side API endpoints resolve them from the authenticated user_id.
      const nextSubscription = stripeSubscription
        ? {
            subscriptionRecordId: databaseSubscription?.id ?? null,
            currentPeriodStart: stripeSubscription.currentPeriodStart ?? databaseSubscription?.current_period_start ?? null,
            currentPeriodEnd: stripeSubscription.currentPeriodEnd ?? databaseSubscription?.current_period_end ?? null,
            trialStart: stripeSubscription.trialStart ?? null,
            trialEnd: stripeSubscription.trialEnd ?? null,
            cancelAtPeriodEnd: stripeSubscription.cancelAtPeriodEnd ?? databaseSubscription?.cancel_at_period_end ?? false,
            cancelledAt: stripeSubscription.cancelledAt ?? databaseSubscription?.cancelled_at ?? null,
            billingCycle: stripeSubscription.billingCycle ?? null,
            upcomingPlanChange: stripeSubscription.upcomingPlanChange ?? null,
            user_id: databaseSubscription?.user_id ?? userId,
            plan: databaseTier || stripeSubscription.plan || null,
            tier: databaseTier || stripeSubscription.tier || stripeSubscription.plan || null,
            status: databaseSubscription?.status || stripeSubscription.status,
          }
        : (databaseSubscription
          ? {
              subscriptionRecordId: databaseSubscription.id,
              currentPeriodStart: databaseSubscription.current_period_start ?? null,
              currentPeriodEnd: databaseSubscription.current_period_end ?? null,
              trialStart: null,
              trialEnd: null,
              cancelAtPeriodEnd: databaseSubscription.cancel_at_period_end ?? false,
              cancelledAt: databaseSubscription.cancelled_at ?? null,
              billingCycle: null,
              upcomingPlanChange: null,
              plan: databaseTier,
              tier: databaseTier,
              status: databaseSubscription.status,
            }
          : null);
      const usingSafeFallback = Boolean(stripeResult?.degraded && !databaseSubscription && !stripeSubscription);

      if (usingSafeFallback) {
        // Stripe status is unavailable and the DB has no active row — do not
        // confirm FREE from a transient failure; keep last-known tier and retry.
        applyDegradedSubscriptionState(stripeResult.error || 'Billing status is temporarily unavailable.');
        return;
      }

      if (!isCacheValid && stripeResult?.success && !stripeResult?.shouldRetry) {
        subscriptionCache.data = stripeResult;
        subscriptionCache.timestamp = Date.now();
      }

      setSubscription(nextSubscription);
      setSubscriptionStatus(nextStatus);
      setUserTier(nextTier);
      setSubscriptionError(null);
      setIsSubscriptionDegraded(false);
      setSubscriptionReady(true);
      lastKnownRef.current = { tier: nextTier, status: nextStatus, subscription: nextSubscription };

      if (stripeResult?.shouldRetry) {
        scheduleRetry();
      } else {
        retryCountRef.current = 0;
      }
    } catch (error) {
      clearRequestTimeout();
      abortControllerRef.current = null;
      if (timedOut) return;

      console.error('Error loading subscription:', error);
      applyDegradedSubscriptionState('Billing status is temporarily unavailable. Retrying…');
    } finally {
      isRefreshingRef.current = false;
      if (!timedOut) {
        setLoading(false);
      }
    }
  }, [abortInFlightSubscriptionRequest, applyDegradedSubscriptionState, applySubscriptionFallback, clearRequestTimeout, clearSubscriptionTimers, scheduleRetry, sessionConfirmed, skipAuth, userId]);

  useEffect(() => {
    refreshSubscriptionRef.current = refreshSubscription;
  }, [refreshSubscription]);

  // Late session confirmation (TOKEN_REFRESHED / recovery): refresh billing only
  // when the last load never resolved or resolved degraded. Routine hourly token
  // refreshes on a healthy subscription are ignored, preventing refetch loops.
  useEffect(() => {
    if (skipAuth) return undefined;

    const handleSessionRefreshed = () => {
      const { ready, degraded } = subscriptionStateRef.current;
      if (ready && !degraded) return;
      if (Date.now() - lastRefreshAtRef.current < 5000) return;
      void refreshSubscriptionRef.current?.({ bypassCache: true });
    };

    window.addEventListener(SESSION_REFRESHED_EVENT, handleSessionRefreshed);
    return () => window.removeEventListener(SESSION_REFRESHED_EVENT, handleSessionRefreshed);
  }, [skipAuth]);

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
    // Return 0 on failure — do NOT include `storageUsage` in deps, which would
    // cause an infinite loop: fetch → setState → new callback → re-fetch.
    return 0;
  }, [skipAuth, userId]);

  useEffect(() => {
    if (skipAuth) {
      void refreshSubscription();

      return () => {
        clearSubscriptionTimers();
      };
    }

    if (!sessionConfirmed) {
      clearSubscriptionTimers();
      if (userId) {
        // Cached user without a confirmed session: stay unresolved (loading)
        // rather than confirming FREE. The sessionConfirmed flip re-runs this
        // effect and loads the real tier.
        setSubscriptionStatus('unknown');
        setIsSubscriptionDegraded(true);
        setSubscriptionError('Restoring your session…');
        setLoading(true);
        setSubscriptionReady(false);
      } else {
        applySubscriptionFallback();
        setLoading(false);
      }

      return () => {
        clearSubscriptionTimers();
      };
    }

    if (!userId) {
      retryCountRef.current = 0;
      clearSubscriptionTimers();
      applySubscriptionFallback();
      setLoading(false);

      return () => {
        clearSubscriptionTimers();
      };
    }

    void refreshSubscription();
    pollingIntervalRef.current = window.setInterval(() => {
      void refreshSubscription();
    }, SUBSCRIPTION_POLL_INTERVAL_MS);

    return () => {
      clearSubscriptionTimers();
    };
  }, [applySubscriptionFallback, clearSubscriptionTimers, refreshSubscription, sessionConfirmed, skipAuth, userId]);

  useEffect(() => {
    if (userId) {
      refreshStorageUsage();
    } else {
      setStorageUsage(0);
    }
  }, [userId, refreshStorageUsage]);

  const isTrialing = subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';
  const isFounder = userTier === TIERS.FOUNDER;
  const isBuilder = userTier === TIERS.BUILDER;
  const isAnnualFounder = isFounder || isBuilder;
  const isPro = userTier === TIERS.PRO || userTier === TIERS.FOUNDER || userTier === TIERS.BUILDER;
  const generationLimit = TIER_LIMITS[userTier]?.aiGenerations ?? 0;
  const isCancelScheduled = Boolean(subscription?.cancelAtPeriodEnd);
  const trialEndsAt = useMemo(
    () => (subscription?.trialEnd ? new Date(subscription.trialEnd) : null),
    [subscription?.trialEnd]
  );
  const trialDaysRemaining = useMemo(() => {
    if (!trialEndsAt) return null;

    const remainingMs = trialEndsAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  }, [trialEndsAt]);
  const hasPaidAccess =
    Boolean(userTier && userTier !== TIERS.FREE) && ACTIVE_ACCESS_STATUSES.has(subscriptionStatus);

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

  const getTierDisplayName = useCallback((tier) => {
    const names = {
      [TIERS.FREE]: 'Free',
      [TIERS.ESSENTIALS]: 'Essentials',
      [TIERS.PRO]: 'Pro',
      [TIERS.BUILDER]: 'Legacy Annual',
      [TIERS.FOUNDER]: 'Founders Club',
    };
    return names[tier] || 'No Active Plan';
  }, []);

  const getTierColor = useCallback((tier) => {
    const colors = {
      [TIERS.FREE]: 'text-gray-600',
      [TIERS.ESSENTIALS]: 'text-huttle-primary',
      [TIERS.PRO]: 'text-purple-600',
      [TIERS.BUILDER]: 'text-sky-600',
      [TIERS.FOUNDER]: 'text-amber-600',
    };
    return colors[tier] || 'text-gray-600';
  }, []);

  const getStorageLimit = useCallback(() => {
    if (skipAuth) {
      return TIER_LIMITS[TIERS.PRO]?.storageLimit || 25 * 1024 * 1024 * 1024;
    }
    return TIER_LIMITS[userTier]?.storageLimit ?? 0;
  }, [skipAuth, userTier]);

  const getStorageUsage = useCallback(() => storageUsage, [storageUsage]);

  const canUploadFile = useCallback((fileSize) => {
    const limit = TIER_LIMITS[userTier]?.storageLimit ?? 0;
    return (storageUsage + fileSize) <= limit;
  }, [userTier, storageUsage]);

  const getUpgradeMessage = useCallback(() => {
    if (isPastDue) {
      return 'Your payment needs attention. Update your billing details to keep full access.';
    }
    if (subscriptionStatus === 'canceled') {
      return 'Your subscription has ended. Choose a plan to get back to creating content.';
    }
    if (!userTier || userTier === TIERS.FREE) {
      return 'Choose a plan to unlock Huttle AI.';
    }
    return '';
  }, [isPastDue, subscriptionStatus, userTier]);

  const canAccessFeatureByName = useCallback((featureName) => {
    return canTierAccessFeature(featureName, userTier);
  }, [userTier]);

  const value = useMemo(() => ({
    userTier,
    tier: userTier,
    tierConfig: getTierConfig(userTier),
    userId,
    subscription,
    subscriptionStatus,
    isTrialing,
    isPastDue,
    isFounder,
    isBuilder,
    isAnnualFounder,
    isPro,
    generationLimit,
    isCancelScheduled,
    trialEndsAt,
    trialDaysRemaining,
    hasPaidAccess,
    usage,
    loading,
    subscriptionReady,
    subscriptionError,
    isSubscriptionDegraded,
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
    isDemoMode: demoMode,
    setDemoTier,
  }), [
    userTier, userId, subscription, subscriptionStatus, isTrialing, isPastDue,
    isFounder, isBuilder, isAnnualFounder, isPro, generationLimit, isCancelScheduled,
    trialEndsAt, trialDaysRemaining, hasPaidAccess, usage, loading, subscriptionReady,
    subscriptionError, isSubscriptionDegraded, checkFeatureAccess, getFeatureLimit,
    checkAndTrackUsage, refreshUsage, getAuthoritativeRemainingUsage,
    getTierDisplayName, getTierColor, getStorageLimit, getStorageUsage,
    refreshStorageUsage, canUploadFile, getUpgradeMessage, canAccessFeatureByName,
    refreshSubscription, demoMode, setDemoTier,
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
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

