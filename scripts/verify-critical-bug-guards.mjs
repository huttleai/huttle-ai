import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function assertContains(file, needle, message) {
  const content = read(file);
  if (!content.includes(needle)) {
    throw new Error(`${message}\nMissing in ${file}: ${needle}`);
  }
}

function assertNotContains(file, needle, message) {
  const content = read(file);
  if (content.includes(needle)) {
    throw new Error(`${message}\nUnexpected in ${file}: ${needle}`);
  }
}

function sliceBetween(file, start, end) {
  const content = read(file);
  const startIndex = content.indexOf(start);
  if (startIndex === -1) {
    throw new Error(`Missing section start in ${file}: ${start}`);
  }
  const endIndex = content.indexOf(end, startIndex + start.length);
  if (endIndex === -1) {
    throw new Error(`Missing section end in ${file}: ${end}`);
  }
  return content.slice(startIndex, endIndex);
}

assertContains(
  'api/emails/send-usage-alert-trigger.js',
  'authenticateBillingRequest(req, supabase)',
  'Usage alert trigger must authenticate before using the service-role client.'
);
assertContains(
  'api/emails/send-usage-alert-trigger.js',
  'requestedUserId && requestedUserId !== userId',
  'Usage alert trigger must reject cross-user body IDs.'
);
assertNotContains(
  'api/emails/send-usage-alert-trigger.js',
  'return res.status(200).json({ sent: true, email',
  'Usage alert trigger must not return recipient PII.'
);

assertContains(
  'api/submit-cancellation-feedback.js',
  'authenticateBillingRequest(req, supabase)',
  'Cancellation feedback must authenticate before using the service-role client.'
);
assertContains(
  'api/submit-cancellation-feedback.js',
  'const userId = authResult.user.id',
  'Cancellation feedback writes must be bound to the authenticated user.'
);
assertContains(
  'src/components/CancelSubscriptionModal.jsx',
  'Authorization: `Bearer ${session.access_token}`',
  'Cancellation feedback client must forward the Supabase access token.'
);
assertContains(
  'src/hooks/useAIUsage.js',
  'Authorization: `Bearer ${session.access_token}`',
  'Usage alert client must forward the Supabase access token.'
);

const webhook = read('api/stripe-webhook.js');
const topLevelCatchIndex = webhook.indexOf("logError('stripe_webhook.unhandled_error'");
if (topLevelCatchIndex === -1) {
  throw new Error('Stripe webhook must log top-level unhandled processing errors.');
}
const topLevelCatch = webhook.slice(topLevelCatchIndex, webhook.indexOf('\n  }\n}', topLevelCatchIndex));
if (!topLevelCatch.includes('return res.status(500).json')) {
  throw new Error('Stripe webhook top-level catch must return 500 so Stripe retries failed critical sync work.');
}
assertNotContains(
  'api/stripe-webhook.js',
  "return res.status(200).json({ received: true, error:",
  'Stripe webhook must not acknowledge failed critical processing as successful.'
);

const invoicePaid = sliceBetween(
  'api/stripe-webhook.js',
  "case 'invoice.paid':",
  "case 'invoice.payment_succeeded':"
);
if (!invoicePaid.includes('cancelAtPeriodEnd = Boolean(stripeSub.cancel_at_period_end)')) {
  throw new Error('invoice.paid must sync cancel_at_period_end from the live Stripe subscription.');
}
if (!invoicePaid.includes('...(cancelAtPeriodEnd !== null && { cancel_at_period_end: cancelAtPeriodEnd })')) {
  throw new Error('invoice.paid must not blindly clear cancel_at_period_end when Stripe lookup fails.');
}

assertContains(
  'api/stripe-webhook.js',
  ".eq('stripe_subscription_id', stripeSubId)",
  'Deleted subscription webhooks must be able to downgrade by Stripe subscription ID.'
);
assertContains(
  'api/stripe-webhook.js',
  'throw new Error(delError.message || \'Failed to sync deleted subscription\')',
  'Deleted subscription DB sync failures must force a Stripe retry.'
);

assertContains(
  'api/subscription-status.js',
  'NO_ACCESS_STRIPE_STATUSES',
  'Subscription status API must treat live terminal Stripe statuses as no-access.'
);
assertContains(
  'src/context/SubscriptionContext.jsx',
  'isLiveStripeNoAccess',
  'Subscription context must not let stale DB active rows override live terminal Stripe statuses.'
);

assertContains(
  'api/plan-builder-proxy.js',
  'reservePlanBuilderUsage',
  'Plan Builder proxy must reserve usage on the active n8n launch path.'
);
assertContains(
  'api/plan-builder-proxy.js',
  'job.user_id !== userId || job.type !== \'plan_builder\'',
  'Plan Builder proxy must verify job ownership before forwarding to n8n.'
);
assertContains(
  'api/plan-builder-proxy.js',
  'PLAN_BUILDER_14DAY_ALLOWED_TIERS',
  'Plan Builder proxy must enforce the 14-day tier gate server-side.'
);
assertContains(
  'api/plan-builder-proxy.js',
  'releasePlanBuilderUsage',
  'Plan Builder proxy must release reserved usage when n8n rejects the handoff.'
);
assertNotContains(
  'src/pages/AIPlanBuilder.jsx',
  'planUsage.trackFeatureUsage',
  'Plan Builder client must not charge credits before the proxy accepts the n8n handoff.'
);

console.log('Critical bug guard checks passed.');
