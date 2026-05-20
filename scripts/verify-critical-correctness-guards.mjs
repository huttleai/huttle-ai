import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const usageAlert = read('api/emails/send-usage-alert-trigger.js');
assert(
  usageAlert.includes("import { authenticateBillingRequest } from '../_utils/billing.js';"),
  'usage-alert trigger must import authenticateBillingRequest'
);
assert(
  usageAlert.includes('const authResult = await authenticateBillingRequest(req, supabase);'),
  'usage-alert trigger must authenticate the bearer token'
);
assert(
  usageAlert.includes('requestedUserId && requestedUserId !== authenticatedUserId'),
  'usage-alert trigger must reject body/auth user mismatches'
);
assert(
  !usageAlert.includes('auth.admin.getUserById(userId)'),
  'usage-alert trigger must not trust body userId for admin email lookup'
);
assert(
  !usageAlert.includes('json({ sent: true, email'),
  'usage-alert trigger must not return recipient email'
);

const usageHook = read('src/hooks/useAIUsage.js');
assert(
  usageHook.includes("Authorization: `Bearer ${session.access_token}`"),
  'useAIUsage must forward the Supabase bearer token to usage-alert trigger'
);

const cancellationFeedback = read('api/submit-cancellation-feedback.js');
assert(
  cancellationFeedback.includes("import { authenticateBillingRequest } from './_utils/billing.js';"),
  'cancellation feedback endpoint must import authenticateBillingRequest'
);
assert(
  cancellationFeedback.includes('const authResult = await authenticateBillingRequest(req, supabase);'),
  'cancellation feedback endpoint must authenticate the bearer token'
);
assert(
  cancellationFeedback.includes('user_id && user_id !== authenticatedUserId'),
  'cancellation feedback endpoint must reject body/auth user mismatches'
);
assert(
  cancellationFeedback.includes("user_id: authenticatedUserId"),
  'cancellation feedback inserts must bind user_id to the authenticated user'
);

const cancelModal = read('src/components/CancelSubscriptionModal.jsx');
assert(
  cancelModal.includes("Authorization: `Bearer ${session.access_token}`"),
  'CancelSubscriptionModal must forward the Supabase bearer token with feedback'
);

const planBuilder = read('src/pages/AIPlanBuilder.jsx');
assert(
  !planBuilder.includes('incrementFeatureCounter: false'),
  'AI Plan Builder live path must write the run-counter row'
);

const stripeWebhook = read('api/stripe-webhook.js');
assert(
  stripeWebhook.includes('criticalProcessingError'),
  'Stripe webhook must track critical processing failures'
);
assert(
  stripeWebhook.indexOf('if (criticalProcessingError)') < stripeWebhook.indexOf('const marked = await markEventProcessed'),
  'Stripe webhook must not mark failed critical processing as processed'
);
assert(
  stripeWebhook.includes("return res.status(500).json({ error: 'Internal processing error' });"),
  'Stripe webhook outer catch must return 500 so Stripe retries unhandled failures'
);
assert(
  stripeWebhook.includes(".eq('stripe_subscription_id', subscription.id)"),
  'Stripe deletion handling must fall back to subscriptions.stripe_subscription_id'
);

console.log('verify-critical-correctness-guards: OK');
