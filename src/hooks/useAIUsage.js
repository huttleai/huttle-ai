import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import {
  getFeatureUsageCount,
  getOverallAIUsageCount,
  trackUsage,
  TIER_LIMITS,
  TIERS,
} from '../config/supabase';

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
  const tierLimits = (userTier && TIER_LIMITS[userTier]) || {};
  const rawFeatureLimit = featureName ? (tierLimits[featureName] ?? null) : null;
  /** Only numeric caps participate in per-feature gating (booleans are access flags, not quotas). */
  const numericFeatureLimit = typeof rawFeatureLimit === 'number' ? rawFeatureLimit : null;
  const overallLimit = tierLimits.aiGenerations ?? 0;

  const isOverallLimitReached = overallLimit > 0 && overallUsed >= overallLimit;
  const isFeatureLimitReached =
    numericFeatureLimit !== null && numericFeatureLimit > 0 && featureUsed >= numericFeatureLimit;
  const canGenerate = !isOverallLimitReached && !isFeatureLimitReached;

  const percentage = overallLimit > 0 ? Math.round((overallUsed / overallLimit) * 100) : 0;
  const featurePercentage = numericFeatureLimit
    ? Math.round((featureUsed / numericFeatureLimit) * 100)
    : 0;

  const refreshUsage = useCallback(async () => {
    if (!user?.id) return;
    try {
      const overall = await getOverallAIUsageCount(user.id);
      if (mountedRef.current) setOverallUsed(overall);

      if (featureName && numericFeatureLimit !== null) {
        const count = await getFeatureUsageCount(user.id, featureName);
        if (mountedRef.current) setFeatureUsed(count);
      }
    } catch (err) {
      console.error('Error refreshing AI usage:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id, featureName, numericFeatureLimit]);

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

    const incrementFeatureCounter = metadata.incrementFeatureCounter !== false;
    const rawCredits = metadata.overallCredits;
    const overallCredits =
      Number.isFinite(Number(rawCredits)) && Number(rawCredits) >= 0
        ? Math.floor(Number(rawCredits))
        : (incrementFeatureCounter && featureName ? 1 : 0);

    // Re-check limits before tracking (prevent race conditions)
    const currentOverall = await getOverallAIUsageCount(user.id);
    if (overallLimit > 0 && currentOverall + overallCredits > overallLimit) {
      if (mountedRef.current) setOverallUsed(currentOverall);
      return { allowed: false, reason: 'overall_limit' };
    }

    if (incrementFeatureCounter && featureName && numericFeatureLimit !== null && numericFeatureLimit > 0) {
      const currentFeature = await getFeatureUsageCount(user.id, featureName);
      if (currentFeature >= numericFeatureLimit) {
        if (mountedRef.current) setFeatureUsed(currentFeature);
        return { allowed: false, reason: 'feature_limit' };
      }
    }

    const featureKey = featureName || 'aiGenerations';

    if (incrementFeatureCounter) {
      await trackUsage(user.id, featureKey, metadata);
    }

    for (let i = 0; i < overallCredits; i += 1) {
      await trackUsage(user.id, 'aiGenerations', {
        ...metadata,
        sourceFeature: featureName || metadata.sourceFeature || 'aiGenerations',
        creditIndex: i,
      });
    }

    if (mountedRef.current) {
      setOverallUsed((prev) => prev + overallCredits);
      if (incrementFeatureCounter && featureName && numericFeatureLimit !== null) {
        setFeatureUsed((prev) => prev + 1);
      }
    }

    return { allowed: true };
  }, [user?.id, featureName, numericFeatureLimit, overallLimit]);

  return {
    overallUsed,
    overallLimit,
    featureUsed,
    featureLimit: numericFeatureLimit,
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
