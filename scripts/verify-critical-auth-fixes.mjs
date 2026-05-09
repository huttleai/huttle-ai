import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const usageAlertApi = read('api/emails/send-usage-alert-trigger.js');
assert(
  usageAlertApi.includes('authenticateBillingRequest(req, supabase)'),
  'usage alert trigger must authenticate requests'
);
assert(
  usageAlertApi.includes('const userId = authResult.user.id'),
  'usage alert trigger must derive userId from auth'
);
assert(
  !usageAlertApi.includes('json({ sent: true, email'),
  'usage alert trigger must not return user email'
);

const usageHook = read('src/hooks/useAIUsage.js');
assert(
  usageHook.includes('supabase.auth.getSession()') &&
    usageHook.includes('Authorization: `Bearer ${session.access_token}`'),
  'useAIUsage must send a bearer token to usage alert trigger'
);

const cancellationFeedbackApi = read('api/submit-cancellation-feedback.js');
assert(
  cancellationFeedbackApi.includes('authenticateBillingRequest(req, supabase)'),
  'cancellation feedback endpoint must authenticate requests'
);
assert(
  cancellationFeedbackApi.includes('const userId = authResult.user.id'),
  'cancellation feedback endpoint must derive userId from auth'
);

const cancellationModal = read('src/components/CancelSubscriptionModal.jsx');
assert(
  cancellationModal.includes('supabase.auth.getSession()') &&
    cancellationModal.includes('Authorization: `Bearer ${session.access_token}`'),
  'cancellation feedback caller must send a bearer token'
);

const stripeWebhook = read('api/stripe-webhook.js');
assert(
  stripeWebhook.includes("return res.status(500).json({ error: 'Internal processing error' })"),
  'Stripe webhook unhandled errors must return non-2xx so Stripe retries'
);

console.log('Critical auth/retry regression checks passed.');
