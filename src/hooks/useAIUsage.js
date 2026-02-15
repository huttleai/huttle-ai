import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { getFeatureUsageCount, getOverallAIUsageCount, trackUsage, TIER_LIMITS, TIERS } from '../config/supabase';

/**
 * useAIUsage — track and gate AI feature usage.
 *
 * @param {string} [featureName] - Optional feature key (e.g. 'trendDeepDive')
 * @returns {{
 *   overallUsed: number,
 *   overallLimit: number,
 *   featureUsed: number,
 *   featureLimit: number | null,
 *   isOverallLimitReached: boolean,
 *   isFeatureLimitReached: boolean,
 *   canGenerate: boolean,
 *   trackFeatureUsage: () => Promise<{allowed: boolean}>,
 *   refreshUsage: () => Promise<void>,
 *   loading: boolean,
 *   percentage: number,
 *   featurePercentage: number,
 * }}
 */
export default function useAIUsage(featureName = null) {
  const { user } = useContext(AuthContext);
  const { userTier } = useSubscription();
  const [overallUsed, setOverallUsed] = useState(0);
  const [featureUsed, setFeatureUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Get limits from tier config instead of hardcoding
  const tierLimits = TIER_LIMITS[userTier] || TIER_LIMITS[TIERS.FOUNDER] || {};
  const featureLimit = featureName ? (tierLimits[featureName] ?? null) : null;
  const overallLimit = tierLimits.aiGenerations || 800;

  const isOverallLimitReached = overallUsed >= overallLimit;
  const isFeatureLimitReached = featureLimit !== null && featureUsed >= featureLimit;
  const canGenerate = !isOverallLimitReached && !isFeatureLimitReached;

  const percentage = overallLimit > 0 ? Math.round((overallUsed / overallLimit) * 100) : 0;
  const featurePercentage = featureLimit
    ? Math.round((featureUsed / featureLimit) * 100)
    : 0;

  const refreshUsage = useCallback(async () => {
    if (!user?.id) return;
    try {
      const overall = await getOverallAIUsageCount(user.id);
      if (mountedRef.current) setOverallUsed(overall);

      if (featureName) {
        const count = await getFeatureUsageCount(user.id, featureName);
        if (mountedRef.current) setFeatureUsed(count);
      }
    } catch (err) {
      console.error('Error refreshing AI usage:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id, featureName]);

  // Load usage on mount
  useEffect(() => {
    mountedRef.current = true;
    refreshUsage();
    return () => { mountedRef.current = false; };
  }, [refreshUsage]);

  /**
   * Track usage for this feature AND the overall counter.
   * Returns { allowed } — false if limit was reached.
   */
  const trackFeatureUsage = useCallback(async (metadata = {}) => {
    if (!user?.id) return { allowed: false };

    // Re-check limits before tracking (prevent race conditions)
    const currentOverall = await getOverallAIUsageCount(user.id);
    if (currentOverall >= overallLimit) {
      if (mountedRef.current) setOverallUsed(currentOverall);
      return { allowed: false, reason: 'overall_limit' };
    }

    if (featureName && featureLimit !== null) {
      const currentFeature = await getFeatureUsageCount(user.id, featureName);
      if (currentFeature >= featureLimit) {
        if (mountedRef.current) setFeatureUsed(currentFeature);
        return { allowed: false, reason: 'feature_limit' };
      }
    }

    // Track the feature usage
    const featureKey = featureName || 'aiGenerations';
    await trackUsage(user.id, featureKey, metadata);

    // Also track toward the overall counter if using a specific feature
    if (featureName && featureName !== 'aiGenerations') {
      await trackUsage(user.id, 'aiGenerations', { ...metadata, sourceFeature: featureName });
    }

    // Optimistic update
    if (mountedRef.current) {
      setOverallUsed(prev => prev + 1);
      if (featureName) setFeatureUsed(prev => prev + 1);
    }

    return { allowed: true };
  }, [user?.id, featureName, featureLimit, overallLimit]);

  return {
    overallUsed,
    overallLimit,
    featureUsed,
    featureLimit,
    isOverallLimitReached,
    isFeatureLimitReached,
    canGenerate,
    trackFeatureUsage,
    refreshUsage,
    loading,
    percentage,
    featurePercentage,
  };
}
