import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function assertIncludes(content, expected, message) {
  if (!content.includes(expected)) {
    throw new Error(message);
  }
}

function assertNotIncludes(content, unexpected, message) {
  if (content.includes(unexpected)) {
    throw new Error(message);
  }
}

const usageTrigger = read('api/emails/send-usage-alert-trigger.js');
assertIncludes(
  usageTrigger,
  "import { authenticateBillingRequest } from '../_utils/billing.js';",
  'usage-alert trigger must use shared bearer auth'
);
assertIncludes(
  usageTrigger,
  'const authResult = await authenticateBillingRequest(req, supabase);',
  'usage-alert trigger must authenticate before service-role work'
);
assertIncludes(
  usageTrigger,
  'requestedUserId && requestedUserId !== userId',
  'usage-alert trigger must reject body/session user mismatches'
);
assertIncludes(
  usageTrigger,
  'return res.status(200).json({ sent: true });',
  'usage-alert trigger response must not expose recipient email or plan metadata'
);
assertNotIncludes(
  usageTrigger,
  'return res.status(200).json({ sent: true, email',
  'usage-alert trigger must not return recipient PII'
);

const usageHook = read('src/hooks/useAIUsage.js');
assertIncludes(
  usageHook,
  'supabase.auth.getSession()',
  'useAIUsage must fetch a session before calling the protected usage-alert trigger'
);
assertIncludes(
  usageHook,
  'Authorization: `Bearer ${accessToken}`',
  'useAIUsage must forward the Supabase access token to the usage-alert trigger'
);

const usageEmail = read('api/emails/send-usage-alert.js');
assertIncludes(
  usageEmail,
  'const { data, error } = await resend.emails.send',
  'usage-alert email helper must inspect the Resend SDK result'
);
assertIncludes(
  usageEmail,
  'if (error) {',
  'usage-alert email helper must throw when Resend returns an error'
);

const stripeWebhook = read('api/stripe-webhook.js');
assertIncludes(
  stripeWebhook,
  "case 'customer.subscription.deleted':",
  'Stripe webhook must handle subscription deletions'
);
assertIncludes(
  stripeWebhook,
  ".eq('stripe_subscription_id', subscription.id)",
  'subscription.deleted must resolve users via stripe_subscription_id fallback'
);
assertIncludes(
  stripeWebhook,
  'stripe_webhook.subscription_deleted_user_from_subscription_row',
  'subscription.deleted fallback should log subscription-row user resolution'
);
assertIncludes(
  stripeWebhook,
  'stripe_webhook.subscription_deleted_user_resolution_failed',
  'subscription.deleted must log hard user-resolution failures'
);

console.log('Critical bug guards passed');
