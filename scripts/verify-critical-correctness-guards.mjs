import { readFileSync } from 'node:fs';

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, expected, message) {
  assert(content.includes(expected), message);
}

function assertNotIncludes(content, unexpected, message) {
  assert(!content.includes(unexpected), message);
}

const usageAlertTrigger = read('api/emails/send-usage-alert-trigger.js');
assertIncludes(
  usageAlertTrigger,
  'authenticateBillingRequest',
  'usage alert trigger must authenticate Supabase bearer tokens'
);
assertIncludes(
  usageAlertTrigger,
  'const userId = authResult.user.id',
  'usage alert trigger must derive userId from the authenticated user'
);
assertIncludes(
  usageAlertTrigger,
  'requestedUserId && requestedUserId !== userId',
  'usage alert trigger must reject body/auth user mismatches'
);
assertNotIncludes(
  usageAlertTrigger,
  'json({ sent: true, email',
  'usage alert trigger must not leak recipient email in responses'
);

const useAIUsage = read('src/hooks/useAIUsage.js');
assertIncludes(
  useAIUsage,
  'Authorization: `Bearer ${session.access_token}`',
  'useAIUsage must forward the Supabase token to the usage alert trigger'
);

const cancellationFeedback = read('api/submit-cancellation-feedback.js');
assertIncludes(
  cancellationFeedback,
  'authenticateBillingRequest',
  'cancellation feedback must authenticate Supabase bearer tokens'
);
assertIncludes(
  cancellationFeedback,
  'const userId = authResult.user.id',
  'cancellation feedback must derive userId from the authenticated user'
);
assertIncludes(
  cancellationFeedback,
  'requestedUserId && requestedUserId !== userId',
  'cancellation feedback must reject body/auth user mismatches'
);

const cancelModal = read('src/components/CancelSubscriptionModal.jsx');
assertIncludes(
  cancelModal,
  'Authorization: `Bearer ${session.access_token}`',
  'CancelSubscriptionModal must forward the Supabase token with feedback'
);

const planBuilderProxy = read('api/plan-builder-proxy.js');
assertIncludes(
  planBuilderProxy,
  ".from('jobs')",
  'Plan Builder proxy must load the job before triggering n8n'
);
assertIncludes(
  planBuilderProxy,
  'job.user_id !== user.id',
  'Plan Builder proxy must reject cross-user job execution'
);
assertIncludes(
  planBuilderProxy,
  'PLAN_BUILDER_14DAY_ALLOWED_TIERS',
  'Plan Builder proxy must enforce 14-day tier entitlement'
);
assertIncludes(
  planBuilderProxy,
  'resolvePlanBuilderCap',
  'Plan Builder proxy must resolve server-side run caps'
);
assertIncludes(
  planBuilderProxy,
  ".contains('metadata', { job_id })",
  'Plan Builder proxy must make run-counter reservation idempotent per job'
);
assertIncludes(
  planBuilderProxy,
  "source: 'plan-builder-proxy'",
  'Plan Builder proxy must reserve authoritative run-counter rows'
);

const aiPlanBuilder = read('src/pages/AIPlanBuilder.jsx');
assertIncludes(
  aiPlanBuilder,
  'const usageResult = await planUsage.trackFeatureUsage',
  'AIPlanBuilder must inspect usage tracking result before n8n trigger'
);
assertIncludes(
  aiPlanBuilder,
  '!usageResult?.allowed',
  'AIPlanBuilder must stop when usage tracking rejects the generation'
);

const billingUtils = read('api/_utils/billing.js');
assertIncludes(
  billingUtils,
  'STRIPE_CUSTOMER_USER_MISMATCH',
  'billing customer mismatch must have a hard-fail error code'
);
assertIncludes(
  billingUtils,
  "throw retrieveErr;",
  'billing customer mismatch must not be swallowed as a transient Stripe read error'
);

const stripeWebhook = read('api/stripe-webhook.js');
assertIncludes(
  stripeWebhook,
  'subscription_deleted_user_from_subscription_id',
  'subscription deletion must resolve users from subscriptions when profile mapping is missing'
);

console.log('verify-critical-correctness-guards: OK');
