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

const usageAlertTrigger = read('api/emails/send-usage-alert-trigger.js');
assert(
  usageAlertTrigger.includes('authenticateBillingRequest'),
  'usage-alert trigger must authenticate Supabase bearer tokens'
);
assert(
  usageAlertTrigger.includes('Authenticated user does not match request user'),
  'usage-alert trigger must reject body/auth user mismatches'
);
assert(
  !usageAlertTrigger.includes('json({ sent: true, email'),
  'usage-alert trigger response must not expose recipient email'
);

const subscriptionStatus = read('api/subscription-status.js');
assert(
  subscriptionStatus.includes('NO_ACCESS_STRIPE_STATUSES'),
  'subscription-status must identify live Stripe no-access statuses'
);
assert(
  subscriptionStatus.includes('stripeSubscription && NO_ACCESS_STRIPE_STATUSES.has(subStatus)'),
  'subscription-status must let live terminal Stripe status override stale DB rows'
);

const subscriptionContext = read('src/context/SubscriptionContext.jsx');
assert(
  subscriptionContext.includes('STRIPE_NO_ACCESS_STATUSES'),
  'SubscriptionContext must identify Stripe no-access statuses'
);
assert(
  subscriptionContext.includes('hasAuthoritativeNoAccessStripeStatus'),
  'SubscriptionContext must prefer authoritative Stripe no-access statuses'
);
assert(
  /if \(!sessionConfirmed\) \{[\s\S]*?setSubscriptionReady\(true\);[\s\S]*?return \(\) =>/.test(subscriptionContext),
  'SubscriptionContext must unblock ProtectedRoute when auth falls back without a confirmed session'
);

const planBuilderProxy = read('api/plan-builder-proxy.js');
assert(
  planBuilderProxy.includes(".from('jobs')") &&
    planBuilderProxy.includes('job.user_id !== user.id') &&
    planBuilderProxy.includes("job.type !== 'plan_builder'"),
  'plan-builder proxy must verify job ownership and type before triggering n8n'
);
assert(
  planBuilderProxy.includes('resolvePlanBuilderCap') &&
    planBuilderProxy.includes(".from('user_activity')") &&
    planBuilderProxy.includes("feature: 'aiGenerations'") &&
    planBuilderProxy.includes("metadata->>job_id"),
  'plan-builder proxy must reserve run-counter and credit usage idempotently'
);

const aiPlanBuilder = read('src/pages/AIPlanBuilder.jsx');
assert(
  !aiPlanBuilder.includes('incrementFeatureCounter: false'),
  'AIPlanBuilder must not suppress Plan Builder run-counter writes on the live path'
);
assert(
  aiPlanBuilder.includes('webhookStatus >= 400 && webhookStatus < 500'),
  'AIPlanBuilder must not fall back to Grok after proxy quota/auth denials'
);

const planBuilderApi = read('src/services/planBuilderAPI.js');
assert(
  planBuilderApi.includes('status: response.status'),
  'Plan Builder API service must preserve proxy HTTP status for quota/auth handling'
);

console.log('Critical bug guard checks passed.');
