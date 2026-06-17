import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function assertContains(file, needle, message) {
  const source = read(file);
  if (!source.includes(needle)) {
    throw new Error(`${message} (${file})`);
  }
}

function assertNotContains(file, needle, message) {
  const source = read(file);
  if (source.includes(needle)) {
    throw new Error(`${message} (${file})`);
  }
}

function sliceBetween(file, startNeedle, endNeedle) {
  const source = read(file);
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  if (start === -1 || end === -1) {
    throw new Error(`Unable to locate expected code section (${file})`);
  }
  return source.slice(start, end);
}

assertContains(
  'api/emails/send-usage-alert-trigger.js',
  'authenticateBillingRequest',
  'Usage alert trigger must authenticate the caller'
);
assertContains(
  'api/emails/send-usage-alert-trigger.js',
  'requestedUserId && requestedUserId !== auth.user.id',
  'Usage alert trigger must reject body/session user mismatches'
);
assertContains(
  'src/hooks/useAIUsage.js',
  'Authorization: `Bearer ${session.access_token}`',
  'Usage alert client call must forward the Supabase access token'
);

assertNotContains(
  'api/_utils/billing.js',
  'return !metaUserId || metaUserId === userId',
  'Billing context must not adopt Stripe customers by email without metadata binding'
);

assertContains(
  'api/stripe-webhook.js',
  ".eq('stripe_subscription_id', subscription.id)",
  'Deleted subscription webhook must fall back to stripe_subscription_id'
);
assertContains(
  'api/stripe-webhook.js',
  'return res.status(500).json({ error: \'Webhook processing failed\' })',
  'Stripe webhook must fail with 5xx on critical processing errors'
);
if (sliceBetween(
  'api/stripe-webhook.js',
  "case 'invoice.paid'",
  "case 'invoice.payment_succeeded'"
).includes('cancel_at_period_end: false')) {
  throw new Error('invoice.paid must not blindly clear scheduled cancellation state (api/stripe-webhook.js)');
}

assertContains(
  'api/plan-builder-proxy.js',
  'resolvePlanBuilderCap',
  'Plan Builder proxy must enforce server-side period caps'
);
assertContains(
  'api/plan-builder-proxy.js',
  'job.user_id !== user.id',
  'Plan Builder proxy must verify job ownership'
);
assertContains(
  'api/plan-builder-proxy.js',
  "feature: 'aiGenerations'",
  'Plan Builder proxy must reserve shared credit pool rows'
);
assertContains(
  'api/plan-builder-proxy.js',
  'releasePlanBuilderUsage',
  'Plan Builder proxy must release usage reservations when n8n rejects handoff'
);
assertNotContains(
  'src/pages/AIPlanBuilder.jsx',
  'incrementFeatureCounter: false',
  'AI Plan Builder UI must not disable the run counter on the active launch path'
);

console.log('Critical bug guards passed');
