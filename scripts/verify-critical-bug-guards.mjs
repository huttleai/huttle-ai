import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert(startIndex !== -1, `Missing start marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(endIndex !== -1, `Missing end marker after ${start}: ${end}`);
  return source.slice(startIndex, endIndex);
}

const stripeWebhook = read('api/stripe-webhook.js');
const invoicePaidCase = sliceBetween(stripeWebhook, "case 'invoice.paid'", "case 'invoice.payment_succeeded'");
const checkoutCase = sliceBetween(stripeWebhook, "case 'checkout.session.completed'", "case 'customer.subscription.trial_will_end'");
const subscriptionDeletedCase = sliceBetween(stripeWebhook, "case 'customer.subscription.deleted'", "case 'invoice.payment_failed'");

assert(
  stripeWebhook.includes("return res.status(500).json({ error: 'Webhook processing failed' });"),
  'Stripe webhook must return 500 for unhandled processing failures so Stripe retries.'
);
assert(
  checkoutCase.includes('throw new Error(`Could not resolve Supabase user') &&
    checkoutCase.includes('throw subErr') &&
    checkoutCase.includes('throw err'),
  'checkout.session.completed must rethrow critical user-resolution and subscription-sync failures.'
);
assert(
  invoicePaidCase.includes("typeof cancelAtPeriodEnd === 'boolean'") &&
    !invoicePaidCase.includes('cancel_at_period_end: false'),
  'invoice.paid must preserve Stripe cancel_at_period_end instead of blindly clearing it.'
);
assert(
  subscriptionDeletedCase.includes(".eq('stripe_subscription_id', subscription.id)") &&
    subscriptionDeletedCase.includes('throw targetedDeleteError'),
  'customer.subscription.deleted must revoke local access by subscription ID when profile mapping is missing.'
);

const subscriptionStatus = read('api/subscription-status.js');
assert(
  subscriptionStatus.includes('TERMINAL_STRIPE_STATUSES') &&
    subscriptionStatus.includes('TERMINAL_STRIPE_STATUSES.has(subStatus)') &&
    subscriptionStatus.includes('plan: null') &&
    subscriptionStatus.includes('tier: null'),
  'subscription-status must treat live Stripe terminal statuses as no-access responses.'
);

const subscriptionContext = read('src/context/SubscriptionContext.jsx');
assert(
  subscriptionContext.includes('TERMINAL_STRIPE_STATUSES') &&
    subscriptionContext.includes('hasTerminalStripeStatus') &&
    subscriptionContext.includes('databaseSubscription && !hasTerminalStripeStatus'),
  'SubscriptionContext must not let stale active database rows override terminal Stripe statuses.'
);

const usageAlert = read('api/emails/send-usage-alert-trigger.js');
assert(
  usageAlert.includes('authenticateBillingRequest') &&
    usageAlert.includes('requestedUserId !== authResult.user.id') &&
    !usageAlert.includes('sent: true, email'),
  'usage-alert trigger must authenticate the user, reject cross-user bodies, and avoid returning email addresses.'
);

const useAIUsage = read('src/hooks/useAIUsage.js');
assert(
  useAIUsage.includes('Authorization: `Bearer ${session.access_token}`') &&
    useAIUsage.includes("return { allowed: false, reason: 'tracking_failed'"),
  'useAIUsage must send auth for usage alerts and surface tracking write failures.'
);

const planBuilder = read('src/pages/AIPlanBuilder.jsx');
assert(
  !planBuilder.includes('incrementFeatureCounter: false') &&
    planBuilder.includes('const usageResult = await planUsage.trackFeatureUsage') &&
    planBuilder.includes('if (!usageResult?.allowed)'),
  'AI Plan Builder must write/check run-counter usage on the active direct-job path.'
);

const trialMigration = read('supabase/migrations/20260612113000_allow_trial_3_day_reminders.sql');
assert(
  trialMigration.includes("'trial_3_days'") &&
    trialMigration.includes('trial_email_reminders_reminder_type_check'),
  'Trial reminder migration must allow the trial_3_days idempotency key.'
);

console.log('Critical bug guard checks passed.');
