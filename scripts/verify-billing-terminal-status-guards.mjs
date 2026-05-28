import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertIncludes(content, snippet, message) {
  if (!content.includes(snippet)) {
    throw new Error(message);
  }
}

const subscriptionStatusApi = read('api/subscription-status.js');
assertIncludes(
  subscriptionStatusApi,
  "const TERMINAL_STRIPE_STATUSES = new Set(['canceled', 'cancelled', 'unpaid', 'incomplete_expired']);",
  'subscription-status API must define terminal Stripe statuses.'
);
assertIncludes(
  subscriptionStatusApi,
  'if (stripeSubscription && TERMINAL_STRIPE_STATUSES.has(subStatus))',
  'subscription-status API must treat terminal Stripe statuses as authoritative.'
);
assertIncludes(
  subscriptionStatusApi,
  'plan: null',
  'subscription-status API must not promote a paid plan for terminal Stripe statuses.'
);

const subscriptionContext = read('src/context/SubscriptionContext.jsx');
assertIncludes(
  subscriptionContext,
  "const TERMINAL_STRIPE_STATUSES = new Set(['canceled', 'cancelled', 'unpaid', 'incomplete_expired']);",
  'SubscriptionContext must define terminal Stripe statuses.'
);
assertIncludes(
  subscriptionContext,
  'const hasTerminalStripeStatus = Boolean(stripeStatus && TERMINAL_STRIPE_STATUSES.has(stripeStatus));',
  'SubscriptionContext must detect terminal Stripe statuses.'
);
assertIncludes(
  subscriptionContext,
  'hasTerminalStripeStatus\n        ? stripeStatus',
  'SubscriptionContext must prefer terminal Stripe status over stale database status.'
);
assertIncludes(
  subscriptionContext,
  'hasTerminalStripeStatus\n        ? TIERS.FREE',
  'SubscriptionContext must downgrade terminal Stripe statuses to the free tier.'
);

console.log('Billing terminal status guardrails passed.');
