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
import { maybeSendUsageThresholdEmails } from '../emails/usageThresholdAlerts.js';

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
 * Server-owned billing key for each AI proxy route.
 * Never derived from client `grokFeatureKey` / `billingFeature` fields.
 */
export const ROUTE_BILLING_FEATURES = Object.freeze({
  grok: 'aiProxyCall',
  claude: 'aiProxyCall',
  perplexity: 'trendPulse',
  'perplexity-deep-dive': 'nicheIntel',
  'n8n-generator': 'contentRemix',
  'content-remix': 'contentRemix',
  'deep-dive': 'trendDeepDive',
});

/**
 * Resolve the billed feature from the server route. Request body is ignored.
 * @param {string} routeId
 * @param {{ originalUrl?: string, url?: string, huttleBillingRoute?: string }} [req]
 * @returns {string | null}
 */
export function resolveRouteBillingFeature(routeId, req = {}) {
  const explicit = typeof req.huttleBillingRoute === 'string' ? req.huttleBillingRoute : routeId;
  const path = String(req.originalUrl || req.url || '');
  if (explicit === 'perplexity-deep-dive' || path.includes('perplexity-deep-dive')) {
    return ROUTE_BILLING_FEATURES['perplexity-deep-dive'];
  }
  return ROUTE_BILLING_FEATURES[explicit] || ROUTE_BILLING_FEATURES[routeId] || null;
}

/**
 * Subscription / read-only access only. Used by polish routes that do not
 * deduct from the credit pool (e.g. silent humanize). Does not skip a pool
 * check based on client input — callers that bill must use assertCanGenerate.
 */
export async function assertGeneratingAccess(supabase, { userId } = {}) {
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

  return {
    ok: true,
    subscription,
    isTrialing: isTrialingStatus(status),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{
 *   userId: string,
 *   featureKey?: string | null,
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
export async function assertCanGenerate(supabase, { userId, featureKey = null } = {}) {
  const access = await assertGeneratingAccess(supabase, { userId });
  if (!access.ok) return access;

  const { subscription, isTrialing: trialing } = access;

  if (!featureKey) {
    return {
      ok: false,
      statusCode: 400,
      error: 'feature_required',
      message: 'This generation could not be billed. Please try again.',
      subscription,
      isTrialing: trialing,
    };
  }

  const userTier = subscription.tier;

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

/**
 * Build the user_activity rows for a reserved feature run.
 * One run-counter row plus one aiGenerations row per credit, matching
 * plan-builder-proxy and useAIUsage.trackFeatureUsage.
 */
export function buildFeatureUsageReservationRows({
  userId,
  featureKey,
  metadata = {},
  reservationSource,
  reservationKey,
}) {
  const creditCost = getFeatureCreditCost(featureKey);
  const timestamp = new Date().toISOString();
  const commonMetadata = {
    ...metadata,
    reservation_key: reservationKey,
    reservation_source: reservationSource,
  };

  return [
    {
      user_id: userId,
      feature: featureKey,
      metadata: {
        ...commonMetadata,
        type: 'run_counter',
        reservation_index: 'run',
      },
      created_at: timestamp,
    },
    ...Array.from({ length: creditCost }, (_, creditIndex) => ({
      user_id: userId,
      feature: 'aiGenerations',
      metadata: {
        ...commonMetadata,
        sourceFeature: featureKey,
        creditIndex,
        overallCredits: creditCost,
        reservation_index: `credit:${creditIndex}`,
      },
      created_at: timestamp,
    })),
  ];
}

/**
 * Reserve a feature run + credit-pool rows before expensive work starts.
 * PostgreSQL commits every row in this insert together or rolls them all back.
 *
 * @returns {Promise<{ creditCost: number, rowsWritten: number }>}
 */
export async function reserveFeatureUsage(supabase, options) {
  const { userId, featureKey } = options || {};
  if (!userId || !featureKey) {
    throw new Error('userId and featureKey are required to reserve usage');
  }

  const rows = buildFeatureUsageReservationRows(options);
  const { error } = await supabase.from('user_activity').insert(rows);
  if (error) throw error;

  await maybeSendUsageThresholdEmails(supabase, { userId }).catch((alertError) => {
    console.error('Usage threshold email failed after reservation:', alertError);
  });

  return {
    creditCost: getFeatureCreditCost(featureKey),
    rowsWritten: rows.length,
  };
}

/** Client-visible usage-gate codes that must not fall back to a second AI path. */
export const USAGE_GATE_NO_FALLBACK_CODES = new Set([
  'unauthenticated',
  'read_only',
  'subscription_required',
  'tier_restricted',
  'run_cap',
  'pool_exhausted',
]);

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

/**
 * Write the run-counter row (when the feature has a numeric run cap) plus one
 * `aiGenerations` row per credit. Call after a successful upstream generation,
 * never before, and never from the client as the system of record.
 *
 * @returns {Promise<{ ok: boolean, creditsLogged: number, error?: string }>}
 */
export async function recordGenerationUsage(supabase, {
  userId,
  featureKey,
  subscription = null,
  metadata = {},
} = {}) {
  if (!supabase || !userId || !featureKey) {
    return { ok: false, creditsLogged: 0, error: 'missing_params' };
  }

  const creditsRequired = getFeatureCreditCost(featureKey);
  const userTier = subscription?.tier || null;
  const trialing = isTrialingStatus(subscription?.status);
  const cap = userTier ? getFeatureRunCap(featureKey, userTier, trialing) : undefined;
  const timestamp = new Date().toISOString();
  const rows = [];

  if (typeof cap === 'number') {
    rows.push({
      user_id: userId,
      feature: featureKey,
      metadata: {
        ...metadata,
        type: 'run_counter',
        billedBy: 'ai_proxy',
      },
      created_at: timestamp,
    });
  }

  for (let i = 0; i < creditsRequired; i += 1) {
    rows.push({
      user_id: userId,
      feature: 'aiGenerations',
      metadata: {
        ...metadata,
        sourceFeature: featureKey,
        creditIndex: i,
        overallCredits: creditsRequired,
        billedBy: 'ai_proxy',
      },
      created_at: timestamp,
    });
  }

  if (rows.length === 0) {
    return { ok: true, creditsLogged: 0 };
  }

  const { error } = await supabase.from('user_activity').insert(rows);
  if (error) {
    return { ok: false, creditsLogged: 0, error: error.message };
  }

  await maybeSendUsageThresholdEmails(supabase, { userId, subscription }).catch((alertError) => {
    console.error('Usage threshold email failed after usage record:', alertError);
  });

  return { ok: true, creditsLogged: creditsRequired };
}
