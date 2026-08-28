import {
  DASHBOARD_GENERATION_SOURCE,
  getCreditPool,
  getStartOfMonthISO,
} from '../../src/config/creditConfig.js';
import { isTrialingStatus } from '../../src/config/subscriptionAccess.js';
import { sendUsageAlert80Email, sendUsageAlert100Email } from './send-usage-alert.js';
import { EMAIL_ACTIVITY_FEATURES, EMAIL_TIER_LABELS } from './templateIds.js';

const USAGE_ALERT_80_RATIO = 0.8;

export function resolveUsageAlertThreshold(creditsUsed, poolLimit) {
  if (!poolLimit || poolLimit <= 0) return null;
  const ratio = creditsUsed / poolLimit;
  if (ratio >= 1) return 100;
  if (ratio >= USAGE_ALERT_80_RATIO) return 80;
  return null;
}

function getCreditResetDetails() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const creditResetDate = nextMonth.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const daysUntilReset = Math.ceil(
    (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return { creditResetDate, daysUntilReset };
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

async function hasSentAlertThisCycle(supabase, userId, feature) {
  const { count, error } = await supabase
    .from('user_activity')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', getStartOfMonthISO());

  if (error) throw error;
  return (count ?? 0) > 0;
}

async function loadSubscription(supabase, userId, subscription) {
  if (subscription?.tier) return subscription;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('tier, status, trial_end')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function resolveRecipient(supabase, userId) {
  const [{ data: profile }, { data: userRow }] = await Promise.all([
    supabase
      .from('user_profile')
      .select('first_name')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  let email = userRow?.email || null;
  if (!email && typeof supabase.auth?.admin?.getUserById === 'function') {
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    email = authUser?.user?.email || null;
  }

  return {
    email,
    firstName: profile?.first_name || userRow?.full_name || '',
  };
}

async function markAlertSent(supabase, userId, feature, metadata) {
  const { error } = await supabase.from('user_activity').insert({
    user_id: userId,
    feature,
    metadata,
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`Usage alert ${feature} sent but idempotency row failed:`, error.message);
  }
}

/**
 * Send one usage-alert email for a threshold (80 or 100) if it has not
 * already been sent this billing cycle. Mirrors send-usage-alert-trigger.
 */
export async function sendUsageAlertForThreshold(supabase, {
  userId,
  threshold,
  subscription = null,
  creditsUsed = null,
  poolLimit = null,
} = {}, {
  send80 = sendUsageAlert80Email,
  send100 = sendUsageAlert100Email,
} = {}) {
  if (!supabase || !userId || (threshold !== 80 && threshold !== 100)) {
    return { skipped: true, reason: 'missing_params' };
  }

  const feature = threshold === 100
    ? EMAIL_ACTIVITY_FEATURES.usageAlert100
    : EMAIL_ACTIVITY_FEATURES.usageAlert80;

  if (await hasSentAlertThisCycle(supabase, userId, feature)) {
    return { skipped: true, reason: 'already_sent_this_cycle' };
  }

  const sub = await loadSubscription(supabase, userId, subscription);
  const trialing = isTrialingStatus(sub?.status);
  const resolvedPool = Number.isFinite(poolLimit)
    ? poolLimit
    : getCreditPool(sub?.tier, trialing);
  const used = Number.isFinite(creditsUsed)
    ? creditsUsed
    : await getMonthlyCreditUsage(supabase, userId);

  const { email, firstName } = await resolveRecipient(supabase, userId);
  if (!email) {
    return { skipped: true, reason: 'missing_email' };
  }

  const planName = EMAIL_TIER_LABELS[sub?.tier] || 'Pro';
  const { creditResetDate, daysUntilReset } = getCreditResetDetails();
  const payload = {
    email,
    firstName,
    planName,
    creditResetDate,
    daysUntilReset,
    creditsUsed: used,
    creditLimit: resolvedPool,
    userId,
  };

  if (threshold === 100) {
    await send100(payload);
  } else {
    await send80(payload);
  }

  await markAlertSent(supabase, userId, feature, {
    planName,
    creditResetDate,
    daysUntilReset,
    creditsUsed: used,
    creditLimit: resolvedPool,
    threshold,
  });

  return { sent: true, threshold };
}

/**
 * After credits are recorded, send 80% and/or 100% alerts for this cycle.
 * Best-effort: never throws to the usage-gate caller.
 */
export async function maybeSendUsageThresholdEmails(supabase, {
  userId,
  subscription = null,
} = {}, sendFns) {
  if (!supabase || !userId) {
    return { skipped: true, reason: 'missing_params' };
  }

  try {
    const sub = await loadSubscription(supabase, userId, subscription);
    const poolLimit = getCreditPool(sub?.tier, isTrialingStatus(sub?.status));
    if (!poolLimit || poolLimit <= 0) {
      return { skipped: true, reason: 'no_pool' };
    }

    const creditsUsed = await getMonthlyCreditUsage(supabase, userId);
    const threshold = resolveUsageAlertThreshold(creditsUsed, poolLimit);
    if (!threshold) {
      return { skipped: true, reason: 'below_threshold', creditsUsed, poolLimit };
    }

    return sendUsageAlertForThreshold(supabase, {
      userId,
      threshold,
      subscription: sub,
      creditsUsed,
      poolLimit,
    }, sendFns);
  } catch (err) {
    console.error('Usage threshold email failed:', err);
    return { skipped: true, reason: 'error', error: err.message };
  }
}

export { USAGE_ALERT_80_RATIO };
