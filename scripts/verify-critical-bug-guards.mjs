import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertBefore(source, earlier, later, message) {
  const earlierIndex = source.indexOf(earlier);
  const laterIndex = source.indexOf(later);
  assert(earlierIndex !== -1, `Missing guard snippet: ${earlier}`);
  assert(laterIndex !== -1, `Missing guard snippet: ${later}`);
  assert(earlierIndex < laterIndex, message);
}

const checkout = read('api/create-checkout-session.js');
assert(
  checkout.includes('planFromPriceId !== normalizedPlanId') &&
    checkout.includes('expectedPriceId !== priceId'),
  'Checkout must reject mismatched client planId, billingCycle, and Stripe priceId.'
);
assert(
  checkout.includes("planId: normalizedPlanId") &&
    checkout.includes('billingCycle: normalizedBillingCycle'),
  'Checkout metadata must use server-normalized plan and billing cycle values.'
);

const stripePlans = read('api/_utils/stripePlans.js');
assertBefore(
  stripePlans,
  'const planFromPriceId = getPlanFromPriceId(priceId);',
  'return normalizePlanId(planId || metadataPlanId);',
  'Stripe plan resolution must prefer the actual price ID over mutable metadata.'
);

const billing = read('api/_utils/billing.js');
assert(
  !billing.includes('return !metaUserId || metaUserId === userId;') &&
    billing.includes('return metaUserId === userId;'),
  'Billing customer lookup must not adopt unstamped email-only Stripe customer matches.'
);

const usageAlert = read('api/emails/send-usage-alert-trigger.js');
assert(
  usageAlert.includes('parseBearerToken(req.headers.authorization)') &&
    usageAlert.includes('await supabase.auth.getUser(token)') &&
    usageAlert.includes('user.id !== userId'),
  'Usage-alert trigger must authenticate and bind the submitted userId to the bearer token.'
);
assert(
  usageAlert.includes('return res.status(200).json({ sent: true })') &&
    !usageAlert.includes('json({ sent: true, email'),
  'Usage-alert trigger must not return recipient email data.'
);

const usageHook = read('src/hooks/useAIUsage.js');
assert(
  usageHook.includes('await supabase.auth.getSession()') &&
    usageHook.includes('Authorization: `Bearer ${session.access_token}`'),
  'useAIUsage must forward the current Supabase access token to the usage-alert trigger.'
);

const planBuilderProxy = read('api/plan-builder-proxy.js');
assert(
  planBuilderProxy.includes("job.user_id !== user.id || job.type !== 'plan_builder'") &&
    planBuilderProxy.includes("job.status !== 'queued'"),
  'Plan Builder proxy must verify job ownership, type, and queued status before triggering n8n.'
);
assertBefore(
  planBuilderProxy,
  "source: 'plan-builder-proxy'",
  'fetch(N8N_WEBHOOK_URL',
  'Plan Builder proxy must reserve the run counter before triggering n8n.'
);
assert(
  planBuilderProxy.includes('resolvePlanBuilderCap(n8nPayload.timePeriod, userTier)') &&
    planBuilderProxy.includes('PLAN_BUILDER_14DAY_ALLOWED_TIERS.includes(userTier)'),
  'Plan Builder proxy must enforce server-side period caps and 14-day tier eligibility.'
);

const stripeWebhook = read('api/stripe-webhook.js');
assert(
  stripeWebhook.includes("throw new Error('Failed to mark Stripe webhook event as processed')") &&
    stripeWebhook.includes('return res.status(500).json({ received: false'),
  'Stripe webhook must fail non-idempotent processing errors so Stripe retries.'
);
assert(
  stripeWebhook.includes('throw subErr;') &&
    stripeWebhook.includes('No Supabase user found for deleted Stripe subscription') &&
    stripeWebhook.includes('subscription.metadata?.supabase_user_id'),
  'Stripe webhook must retry failed checkout syncs and resolve deleted subscriptions beyond user_profile.'
);
assert(
  !stripeWebhook.includes('cancel_at_period_end: false,\n              updated_at') &&
    stripeWebhook.includes('cancelAtPeriodEnd = Boolean(stripeSub.cancel_at_period_end)'),
  'Invoice-paid sync must mirror live Stripe cancel_at_period_end instead of clearing scheduled cancellations.'
);

console.log('Critical bug guards passed.');
