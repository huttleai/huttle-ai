/**
 * Server-side generating-access and trial-aware usage gate.
 * Client checks in useAIUsage are advisory; this is the enforceable path.
 */

import {
  DASHBOARD_GENERATION_SOURCE,
  getCreditPool,
  getFeatureCreditCost,
  getFeatureRunCap,
  getResetDateLabel,
  FEATURE_LABELS,
} from '../../src/config/creditConfig.js';
import {
  isGeneratingAccessStatus,
  isReadOnlyStatus,
  isTrialingStatus,
  READ_ONLY_GENERATE_MESSAGE,
} from '../../src/config/subscriptionAccess.js';

function getStartOfMonthISO() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export async function loadLatestSubscription(supabase, userId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('tier, status, trial_end')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { subscription: null, error };
  return { subscription: data ?? null, error: null };
}

async function getMonthlyFeatureCount(supabase, userId, feature) {
  const { count, error } = await supabase
    .from('user_activity')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', getStartOfMonthISO());

  if (error) throw error;
  return count ?? 0;
}

async function getMonthlyCreditUsage(supabase, userId) {
  const { count, error } = await supabase
    .from('user_activity')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', 'aiGenerations')
    .or(`metadata->>source.is.null,metadata->>source.neq.${DASHBOARD_GENERATION_SOURCE}`)
    .gte('created_at', getStartOfMonthISO());

  if (error) throw error;
  return count ?? 0;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{
 *   userId: string,
 *   featureKey?: string | null,
 *   skipPool?: boolean,
 * }} options
 * @returns {Promise<{
 *   ok: boolean,
 *   statusCode?: number,
 *   error?: string,
 *   message?: string,
 *   subscription?: object | null,
 *   isTrialing?: boolean,
 * }>}
 */
export async function assertCanGenerate(supabase, { userId, featureKey = null, skipPool = false } = {}) {
  if (!userId) {
    return {
      ok: false,
      statusCode: 401,
      error: 'unauthenticated',
      message: 'Please sign in to continue.',
    };
  }

  const { subscription, error } = await loadLatestSubscription(supabase, userId);
  if (error) {
    return {
      ok: false,
      statusCode: 500,
      error: 'subscription_lookup_failed',
      message: 'Failed to verify subscription.',
    };
  }

  const status = subscription?.status || null;

  if (isReadOnlyStatus(status)) {
    return {
      ok: false,
      statusCode: 403,
      error: 'read_only',
      message: READ_ONLY_GENERATE_MESSAGE,
      subscription,
    };
  }

  if (!subscription || !isGeneratingAccessStatus(status) || !subscription.tier) {
    return {
      ok: false,
      statusCode: 403,
      error: 'subscription_required',
      message: 'Choose a plan to start generating.',
      subscription,
    };
  }

  const userTier = subscription.tier;
  const trialing = isTrialingStatus(status);

  if (skipPool || !featureKey) {
    return { ok: true, subscription, isTrialing: trialing };
  }

  const cap = getFeatureRunCap(featureKey, userTier, trialing);
  if (cap === 0) {
    return {
      ok: false,
      statusCode: 403,
      error: 'tier_restricted',
      message: 'This feature is not available on the current plan.',
      subscription,
      isTrialing: trialing,
    };
  }

  try {
    if (typeof cap === 'number' && cap > 0) {
      const runsThisMonth = await getMonthlyFeatureCount(supabase, userId, featureKey);
      if (runsThisMonth >= cap) {
        const featureLabel = FEATURE_LABELS[featureKey] || 'this feature';
        const resetDate = getResetDateLabel();
        return {
          ok: false,
          statusCode: 429,
          error: 'run_cap',
          message: `You've used all ${cap} ${featureLabel} runs for this month. Your limit resets on ${resetDate}.`,
          subscription,
          isTrialing: trialing,
        };
      }
    }

    const creditsRequired = getFeatureCreditCost(featureKey);
    if (creditsRequired > 0) {
      const creditsUsed = await getMonthlyCreditUsage(supabase, userId);
      const poolLimit = getCreditPool(userTier, trialing);
      const remaining = Math.max(0, poolLimit - creditsUsed);
      if (poolLimit <= 0 || remaining < creditsRequired) {
        const resetDate = getResetDateLabel();
        return {
          ok: false,
          statusCode: 429,
          error: 'pool_exhausted',
          message: `This feature uses ${creditsRequired} credits. You have ${remaining} credits left this month. Your credits reset on ${resetDate}.`,
          subscription,
          isTrialing: trialing,
        };
      }
    }
  } catch {
    return {
      ok: false,
      statusCode: 500,
      error: 'usage_lookup_failed',
      message: 'Failed to verify usage limits.',
      subscription,
      isTrialing: trialing,
    };
  }

  return { ok: true, subscription, isTrialing: trialing };
}

export function sendUsageGateRejection(res, gateResult, { grokStyle = false } = {}) {
  if (grokStyle) {
    return res.status(gateResult.statusCode).json({
      error: true,
      message: gateResult.message,
      code: gateResult.error,
    });
  }

  return res.status(gateResult.statusCode).json({
    error: gateResult.error,
    message: gateResult.message,
  });
}

/** Map grokConfig featureKey values onto creditConfig billing keys. */
export const GROK_FEATURE_TO_BILLING = {
  caption: 'captions',
  captionVariations: 'captions',
  hashtag: 'hashtags',
  hookBuilder: 'hooks',
  cta: 'ctas',
  contentQualityScorer: 'scorer',
  visualBrainstorm: 'visuals',
  visualIdeas: 'visuals',
  contentRemix: 'contentRemix',
  platformRemixes: 'contentRemix',
  nicheIntel: 'nicheIntel',
  fullPostBuilder: 'fullPostBuilderRuns',
  igniteEngine: 'igniteEngine',
  humanizerScore: 'aiHumanizerScore',
  audienceInsights: 'audienceInsights',
  trendIdeas: 'trendPulse',
  improveContent: 'captions',
  autoImprovePhrase: 'captions',
  voiceTranscriptPolish: 'aiHumanizerRewrite',
  contentRepurposer: 'contentRemix',
};

export const GROK_SKIP_POOL_FEATURES = new Set([
  'dashboardWidget',
  'optimizeTimes',
  'performancePrediction',
  'perplexityGrokFallback',
  'contentPlan',
]);
