import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function assertGuard(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const webhook = read('api/stripe-webhook.js');
assertGuard(
  /return res\.status\(500\)\.json\(\{ received: false, error: 'Webhook processing failed' \}\)/.test(webhook),
  'Stripe webhook must return 500 on unhandled processing failures so Stripe retries.'
);
assertGuard(
  !/return res\.status\(200\)\.json\(\{ received: true, error: 'Internal processing error/.test(webhook),
  'Stripe webhook must not ACK failed processing as received.'
);
assertGuard(
  /throw new Error\('Checkout session could not be matched to a Supabase user'\)/.test(webhook) &&
    /throw subErr;/.test(webhook),
  'checkout.session.completed must fail closed on missing user or subscription sync failure.'
);
assertGuard(
  /async function resolveSubscriptionUser/.test(webhook) &&
    /\.eq\('stripe_subscription_id', subscription\.id\)/.test(webhook) &&
    /Deleted subscription could not be matched to a Supabase user/.test(webhook),
  'customer.subscription.deleted must resolve by subscription id or metadata before acknowledging.'
);
const invoicePaidBlock =
  webhook.match(/case 'invoice\.paid': \{[\s\S]*?case 'invoice\.payment_succeeded': \{/u)?.[0] || '';
assertGuard(
  /liveCancelAtPeriodEnd/.test(invoicePaidBlock) &&
    !/cancel_at_period_end:\s*false/.test(invoicePaidBlock),
  'invoice.paid must not blindly clear cancel_at_period_end.'
);

const subscriptionStatusApi = read('api/subscription-status.js');
assertGuard(
  /const TERMINAL_ACCESS_STATUSES = new Set\(\['canceled', 'cancelled', 'unpaid', 'incomplete_expired'\]\)/.test(subscriptionStatusApi) &&
    /stripeSubscription && TERMINAL_ACCESS_STATUSES\.has\(subStatus\)/.test(subscriptionStatusApi),
  'subscription-status API must treat Stripe terminal statuses as inactive instead of falling back to Supabase.'
);

const subscriptionContext = read('src/context/SubscriptionContext.jsx');
assertGuard(
  /const TERMINAL_ACCESS_STATUSES = new Set\(\['canceled', 'cancelled', 'unpaid', 'incomplete_expired'\]\)/.test(subscriptionContext) &&
    /const shouldTrustStripeStatus =[\s\S]*TERMINAL_ACCESS_STATUSES\.has\(stripeStatus\)/.test(subscriptionContext) &&
    /status: nextStatus/.test(subscriptionContext),
  'SubscriptionContext must not let stale database status override authoritative Stripe terminal status.'
);

const usageAlert = read('api/emails/send-usage-alert-trigger.js');
assertGuard(
  /authenticateBillingRequest/.test(usageAlert) &&
    /targetUserId !== authResult\.user\.id/.test(usageAlert) &&
    /return res\.status\(200\)\.json\(\{ sent: true \}\)/.test(usageAlert),
  'usage-alert trigger must authenticate, bind userId to the session, and avoid PII responses.'
);
assertGuard(
  !/json\(\{ sent: true, email, planName/.test(usageAlert),
  'usage-alert trigger must not return recipient email or plan details.'
);

const useAiUsage = read('src/hooks/useAIUsage.js');
assertGuard(
  /Authorization: `Bearer \$\{session\.access_token\}`/.test(useAiUsage),
  'useAIUsage must forward the Supabase access token to the usage-alert trigger.'
);

const planBuilderProxy = read('api/plan-builder-proxy.js');
assertGuard(
  /resolvePlanBuilderCap/.test(planBuilderProxy) &&
    /\.from\('jobs'\)[\s\S]*\.select\('id, user_id, status'\)/.test(planBuilderProxy) &&
    /job\.user_id !== user\.id/.test(planBuilderProxy),
  'plan-builder-proxy must verify job ownership before triggering n8n.'
);
assertGuard(
  /\.from\('user_activity'\)[\s\S]*\.eq\('feature', featureKey\)/.test(planBuilderProxy) &&
    /\.from\('user_activity'\)[\s\S]*source: 'plan-builder-proxy'/.test(planBuilderProxy),
  'plan-builder-proxy must enforce and reserve server-side Plan Builder run caps.'
);

const billingUtils = read('api/_utils/billing.js');
assertGuard(
  !/return !metaUserId \|\| metaUserId === userId/.test(billingUtils) &&
    /return metaUserId === userId/.test(billingUtils),
  'billing context must not adopt ambiguous email-only Stripe customer matches.'
);

console.log('critical bug guards passed');
