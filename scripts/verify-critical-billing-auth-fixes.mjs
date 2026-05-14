import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const usageAlert = read('api/emails/send-usage-alert-trigger.js');
const usageHook = read('src/hooks/useAIUsage.js');
const subscriptionStatus = read('api/subscription-status.js');
const subscriptionContext = read('src/context/SubscriptionContext.jsx');
const stripeWebhook = read('api/stripe-webhook.js');

assert(
  usageAlert.includes('authenticateBillingRequest') &&
    usageAlert.includes('requestedUserId !== authResult.user.id') &&
    usageAlert.includes('res.status(403)'),
  'usage-alert trigger must authenticate and reject cross-user requests'
);

assert(
  !/json\(\{\s*sent:\s*true,\s*email\b/.test(usageAlert),
  'usage-alert trigger must not return the recipient email'
);

assert(
  usageHook.includes('Authorization: `Bearer ${accessToken}`'),
  'usage-alert frontend caller must send the Supabase access token'
);

assert(
  !subscriptionStatus.includes("subStatus === 'unpaid'") &&
    !subscriptionStatus.includes("subStatus === 'incomplete_expired'"),
  'subscription-status must not fall back to stale DB rows for terminal Stripe statuses'
);

assert(
  subscriptionContext.includes("const nextStatus = stripeSubscription?.status || stripeResult.status || databaseSubscription?.status || 'inactive'") &&
    subscriptionContext.includes("status: stripeSubscription.status || databaseSubscription?.status || 'inactive'"),
  'SubscriptionContext must prefer successful API/Stripe status over stale DB status'
);

assert(
  stripeWebhook.includes("from './_utils/authUsers.js'") &&
    !stripeWebhook.includes('filter: `email.eq.${customerEmail}`'),
  'Stripe webhook email fallback must use exact auth-user lookup, not unsupported listUsers filters'
);

assert(
  /checkout_no_user_found[\s\S]*throw new Error\('Could not resolve Supabase user for checkout session'\)/.test(stripeWebhook) &&
    /checkout_subscription_sync_failed[\s\S]*throw subErr/.test(stripeWebhook),
  'checkout webhook failures must throw so Stripe retries instead of marking the event processed'
);

assert(
  /catch \(error\) \{[\s\S]*return res\.status\(500\)\.json\(\{ error: 'Internal processing error' \}\)/.test(stripeWebhook),
  'Stripe webhook top-level catch must return 500 so Stripe retries unexpected failures'
);

console.log('verify-critical-billing-auth-fixes: OK');
