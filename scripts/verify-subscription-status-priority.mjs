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

const statusEndpoint = read('api/subscription-status.js');
assert(
  !statusEndpoint.includes("subStatus === 'incomplete_expired'") &&
    !statusEndpoint.includes("subStatus === 'unpaid'"),
  'subscription-status.js must not special-case unpaid/incomplete_expired into the no-Stripe-data fallback branch -- ' +
  'a live Stripe subscription (any status) must always flow through buildSubscriptionPayload'
);
assert(
  statusEndpoint.includes('if (!stripeSubscription) {'),
  'subscription-status.js must only fall back to the Supabase record when Stripe returned no subscription at all'
);

const contextFile = read('src/context/SubscriptionContext.jsx');
assert(
  !contextFile.includes("databaseSubscription?.status || stripeSubscription?.status || stripeResult.status || 'inactive'"),
  'SubscriptionContext.jsx must not let a cached/webhook-lagged DB status win over a successful live Stripe result'
);
assert(
  contextFile.includes('const nextStatus = stripeResult.success'),
  'SubscriptionContext.jsx must branch on stripeResult.success before choosing between live Stripe status and the DB status'
);

console.log('verify-subscription-status-priority: all checks passed');
