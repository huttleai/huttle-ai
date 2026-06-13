import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const statusApi = readFileSync('api/subscription-status.js', 'utf8');
const subscriptionContext = readFileSync('src/context/SubscriptionContext.jsx', 'utf8');

assert(
  !/subStatus\s*===\s*['"](?:unpaid|incomplete_expired)['"]/.test(statusApi),
  'subscription-status must not fall back to Supabase when Stripe returns unpaid or incomplete_expired'
);

assert(
  statusApi.includes('if (!stripeSubscription) {'),
  'subscription-status should only use the Supabase fallback when no Stripe subscription is available'
);

assert(
  subscriptionContext.includes(
    "const nextStatus = stripeSubscription?.status || databaseSubscription?.status || stripeResult.status || 'inactive';"
  ),
  'SubscriptionContext must prefer the API/Stripe status over the active database fallback'
);

assert(
  subscriptionContext.includes('status: stripeSubscription.status || databaseSubscription?.status,'),
  'SubscriptionContext public subscription object must preserve the authoritative API/Stripe status'
);

console.log('Subscription terminal status precedence checks passed.');
