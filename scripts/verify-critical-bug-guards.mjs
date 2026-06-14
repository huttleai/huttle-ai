import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert(startIndex >= 0, `Missing block start: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(endIndex >= 0, `Missing block end: ${end}`);
  return source.slice(startIndex, endIndex);
}

const stripeWebhook = read('api/stripe-webhook.js');
const invoicePaidBlock = extractBetween(
  stripeWebhook,
  "case 'invoice.paid'",
  "case 'invoice.payment_succeeded'"
);

assert(
  stripeWebhook.includes("return res.status(500).json({ received: false"),
  'Stripe webhook must return 500 for unhandled processing errors so Stripe retries critical sync failures.'
);
assert(
  stripeWebhook.includes('throw subErr;'),
  'checkout.session.completed subscription sync failures must be rethrown before marking the webhook processed.'
);
assert(
  stripeWebhook.includes('subscription_deleted_user_from_subscription_row'),
  'customer.subscription.deleted must fall back to subscriptions.stripe_subscription_id when user_profile mapping is missing.'
);
assert(
  stripeWebhook.includes('throw delError;'),
  'customer.subscription.deleted Supabase update failures must be rethrown so Stripe retries.'
);
assert(
  invoicePaidBlock.includes('cancelAtPeriodEnd = stripeSub.cancel_at_period_end'),
  'invoice.paid must preserve the live Stripe cancel_at_period_end value.'
);
assert(
  !invoicePaidBlock.includes('cancel_at_period_end: false'),
  'invoice.paid must not unconditionally clear scheduled cancellations.'
);

const cancellationFeedback = read('api/submit-cancellation-feedback.js');
assert(
  cancellationFeedback.includes('authenticateBillingRequest'),
  'Cancellation feedback endpoint must authenticate bearer tokens before service-role writes.'
);
assert(
  cancellationFeedback.includes('user_id !== authResult.user.id'),
  'Cancellation feedback endpoint must reject body user_id values that do not match the authenticated user.'
);

const usageAlertTrigger = read('api/emails/send-usage-alert-trigger.js');
assert(
  usageAlertTrigger.includes('authenticateBillingRequest'),
  'Usage alert trigger must authenticate bearer tokens before service-role reads or writes.'
);
assert(
  usageAlertTrigger.includes('sendResult?.error'),
  'Usage alert trigger must check Resend SDK errors before writing the monthly suppression row.'
);
assert(
  usageAlertTrigger.includes('return res.status(200).json({ sent: true });'),
  'Usage alert trigger response must not expose recipient email or billing metadata.'
);

const useAiUsage = read('src/hooks/useAIUsage.js');
assert(
  useAiUsage.includes("Authorization: `Bearer ${session.access_token}`"),
  'useAIUsage must forward the Supabase access token to the usage alert trigger.'
);

const planBuilderProxy = read('api/plan-builder-proxy.js');
assert(
  planBuilderProxy.includes('reservePlanBuilderUsage'),
  'Plan Builder proxy must reserve usage server-side before forwarding to n8n.'
);
assert(
  planBuilderProxy.includes("source: 'plan-builder-proxy'"),
  'Plan Builder proxy must write idempotent run-counter and credit rows for direct jobs.'
);
assert(
  planBuilderProxy.includes('jobRecord.user_id !== user.id'),
  'Plan Builder proxy must verify job ownership before forwarding to n8n.'
);

const aiPlanBuilder = read('src/pages/AIPlanBuilder.jsx');
assert(
  !aiPlanBuilder.includes('incrementFeatureCounter: false'),
  'AIPlanBuilder direct path must not skip the Plan Builder run-counter.'
);
assert(
  aiPlanBuilder.includes('[401, 403, 429].includes(webhookStatus)'),
  'AIPlanBuilder must not fall back to Grok when the proxy rejects auth or quota.'
);

const trialReminderUtils = read('api/_utils/trialReminderUtils.js');
assert(
  trialReminderUtils.includes('resendResponse?.error'),
  'Trial reminders must not mark sent when Resend returns an error.'
);

const trialReminderMigration = read('supabase/migrations/20260614110100_allow_trial_3_day_reminders.sql');
assert(
  trialReminderMigration.includes("'trial_3_days'"),
  'Trial reminder constraint migration must allow trial_3_days.'
);

console.info('Critical bug guard checks passed.');
