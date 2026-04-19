import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import {
  getFeatureUsageCount,
  getOverallAIUsageCount,
  trackUsage,
  TIER_LIMITS,
} from '../config/supabase';
import {
  TIER_CREDIT_POOLS,
  FEATURE_CREDIT_COSTS,
  FEATURE_RUN_CAPS,
  FEATURE_LABELS,
  getFeatureCreditCost,
  getFeatureRunCap,
  getResetDateLabel,
} from '../config/creditConfig';

/**
 * useAIUsage — track and gate AI feature usage.
 *
 * Two-step enforcement matches creditConfig.js:
 *   1. Run cap (per-feature monthly run cap from FEATURE_RUN_CAPS)
 *   2. Credit pool (shared monthly pool from TIER_CREDIT_POOLS)
 *
 * The returned `canGenerate` boolean is a synchronous best-effort flag useful
 * for disabling UI. Callers that fire API calls MUST await `checkCanGenerate()`
 * first, which performs a fresh DB-backed check and returns a structured
 * `{ allowed, reason, message, ... }` object.
 *
 * @param {string} [featureName] - Feature key from FEATURE_CREDIT_COSTS
 *                                 (e.g. 'igniteEngine', 'planBuilder7Day').
 *                                 When null the hook only tracks the overall pool.
 */
export default function useAIUsage(featureName = null) {
  const { user } = useContext(AuthContext);
  const { userTier } = useSubscription();
  const [overallUsed, setOverallUsed] = useState(0);
  const [featureUsed, setFeatureUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Overall pool comes from creditConfig; fall back to TIER_LIMITS for unknown tiers.
  const tierLimits = (userTier && TIER_LIMITS[userTier]) || {};
  const overallLimit =
    (userTier && TIER_CREDIT_POOLS[userTier]) ?? tierLimits.aiGenerations ?? 0;

  // Per-feature run cap. Prefer creditConfig.FEATURE_RUN_CAPS; fall back to
  // the numeric value in TIER_LIMITS for features that predate the refactor.
  const creditConfigCap = featureName ? getFeatureRunCap(featureName, userTier) : undefined;
  const rawFeatureLimit = featureName ? tierLimits[featureName] : null;
  const numericFeatureLimit =
    creditConfigCap === null
      ? null
      : typeof creditConfigCap === 'number'
        ? creditConfigCap
        : typeof rawFeatureLimit === 'number'
          ? rawFeatureLimit
          : null;

  // Credit cost per run (used to default trackFeatureUsage's overallCredits).
  const creditsPerRun = featureName ? getFeatureCreditCost(featureName) : 0;

  const isOverallLimitReached = overallLimit > 0 && overallUsed >= overallLimit;
  const isFeatureLimitReached =
    numericFeatureLimit !== null && numericFeatureLimit > 0 && featureUsed >= numericFeatureLimit;
  // Zero-cost features bypass the overall pool gate entirely.
  const canGenerate =
    (creditsPerRun === 0 || !isOverallLimitReached) && !isFeatureLimitReached;

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

  useEffect(() => {
    mountedRef.current = true;
    refreshUsage();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshUsage]);

  /**
   * Pre-flight check. Call this BEFORE firing any API request — if it returns
   * `allowed: false` the caller must show `message` to the user and NOT make
   * the API call / log any credits.
   *
   * @returns {Promise<{
   *   allowed: boolean,
   *   reason?: 'run_cap' | 'pool_exhausted',
   *   message?: string,
   *   runsUsed?: number,
   *   cap?: number,
   *   remaining?: number,
   *   required?: number,
   * }>}
   */
  const checkCanGenerate = useCallback(async () => {
    if (!user?.id) {
      return { allowed: false, reason: 'unauthenticated', message: 'Please sign in to continue.' };
    }

    const resetDate = getResetDateLabel();
    const featureLabel = (featureName && FEATURE_LABELS[featureName]) || 'this feature';

    // STEP A — Run cap check (cheaper; runs first).
    if (featureName) {
      const cap = getFeatureRunCap(featureName, userTier);
      if (cap !== null && cap !== undefined) {
        const runsThisMonth = await getFeatureUsageCount(user.id, featureName);
        if (mountedRef.current) setFeatureUsed(runsThisMonth);
        if (runsThisMonth >= cap) {
          return {
            allowed: false,
            reason: 'run_cap',
            message: `You've used all ${cap} ${featureLabel} runs for this month. Your limit resets on ${resetDate}.`,
            runsUsed: runsThisMonth,
            cap,
          };
        }
      }
    }

    // STEP B — Credit pool check.
    const creditsRequired = creditsPerRun;
    if (creditsRequired === 0) return { allowed: true, remaining: null, creditsRequired: 0 };

    const creditsUsed = await getOverallAIUsageCount(user.id);
    if (mountedRef.current) setOverallUsed(creditsUsed);

    const poolLimit = overallLimit;
    const remaining = Math.max(0, poolLimit - creditsUsed);

    if (poolLimit > 0 && remaining < creditsRequired) {
      return {
        allowed: false,
        reason: 'pool_exhausted',
        message: `This feature uses ${creditsRequired} credits. You have ${remaining} credits left this month. Your credits reset on ${resetDate}.`,
        remaining,
        required: creditsRequired,
      };
    }

    return { allowed: true, remaining, creditsRequired };
  }, [user?.id, featureName, userTier, creditsPerRun, overallLimit]);

  /**
   * Track usage for this feature AND the overall pool.
   *
   * Behavior per creditConfig.js:
   *   • Zero-cost features (aiHumanizerScore, algorithmChecker) write NO rows.
   *   • Capped features write 1 run-counter row (feature = featureName) so run
   *     caps can be enforced.
   *   • `overallCredits` aiGenerations rows are written (creditIndex 0..N-1),
   *     defaulting to FEATURE_CREDIT_COSTS[featureName].
   *
   * Returns `{ allowed: false, reason }` if the DB-backed re-check trips a
   * limit before any row is written.
   */
  const trackFeatureUsage = useCallback(
    async (metadata = {}) => {
      if (!user?.id) return { allowed: false, reason: 'unauthenticated' };

      const incrementFeatureCounter = metadata.incrementFeatureCounter !== false;
      // Callers may override the credit cost (e.g. Full Post Builder passes its own),
      // but the default comes from FEATURE_CREDIT_COSTS so no feature has to hardcode.
      const rawCredits = metadata.overallCredits;
      const overallCredits = Number.isFinite(Number(rawCredits))
        ? Math.max(0, Math.floor(Number(rawCredits)))
        : creditsPerRun;

      // Race-condition guard: re-read both counts before writing any row.
      const currentOverall = await getOverallAIUsageCount(user.id);
      if (overallLimit > 0 && overallCredits > 0 && currentOverall + overallCredits > overallLimit) {
        if (mountedRef.current) setOverallUsed(currentOverall);
        return { allowed: false, reason: 'pool_exhausted' };
      }

      if (
        incrementFeatureCounter &&
        featureName &&
        numericFeatureLimit !== null &&
        numericFeatureLimit > 0
      ) {
        const currentFeature = await getFeatureUsageCount(user.id, featureName);
        if (currentFeature >= numericFeatureLimit) {
          if (mountedRef.current) setFeatureUsed(currentFeature);
          return { allowed: false, reason: 'run_cap' };
        }
      }

      // Strip control keys that shouldn't be persisted in metadata.
      const { incrementFeatureCounter: _omit1, overallCredits: _omit2, ...persistMetadata } =
        metadata;

      // Run-counter row (only for capped features). This is what FEATURE_RUN_CAPS counts.
      if (incrementFeatureCounter && featureName && numericFeatureLimit !== null) {
        await trackUsage(user.id, featureName, {
          ...persistMetadata,
          type: 'run_counter',
          timestamp: new Date().toISOString(),
        });
      }

      // aiGenerations credit rows — one per credit consumed.
      const sourceFeature = featureName || persistMetadata.sourceFeature || 'aiGenerations';
      for (let i = 0; i < overallCredits; i += 1) {
        await trackUsage(user.id, 'aiGenerations', {
          ...persistMetadata,
          sourceFeature,
          creditIndex: i,
          overallCredits,
        });
      }

      if (mountedRef.current) {
        setOverallUsed((prev) => prev + overallCredits);
        if (incrementFeatureCounter && featureName && numericFeatureLimit !== null) {
          setFeatureUsed((prev) => prev + 1);
        }
      }

      return { allowed: true, creditsLogged: overallCredits };
    },
    [user?.id, featureName, numericFeatureLimit, overallLimit, creditsPerRun]
  );

  return {
    overallUsed,
    overallLimit,
    featureUsed,
    featureLimit: numericFeatureLimit,
    featureRunCap: numericFeatureLimit,
    creditsPerRun,
    isOverallLimitReached,
    isFeatureLimitReached,
    canGenerate,
    checkCanGenerate,
    trackFeatureUsage,
    refreshUsage,
    loading,
    percentage,
    featurePercentage,
    resetDateLabel: getResetDateLabel(),
  };
}

// Re-exports so pages can import config from a single place.
export { TIER_CREDIT_POOLS, FEATURE_CREDIT_COSTS, FEATURE_RUN_CAPS };
