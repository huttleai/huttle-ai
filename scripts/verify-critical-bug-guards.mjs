import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

const usageAlertTrigger = read('api/emails/send-usage-alert-trigger.js');
const usageHook = read('src/hooks/useAIUsage.js');
const cancellationFeedback = read('api/submit-cancellation-feedback.js');
const cancelModal = read('src/components/CancelSubscriptionModal.jsx');
const subscriptionStatus = read('api/subscription-status.js');
const subscriptionContext = read('src/context/SubscriptionContext.jsx');
const stripeWebhook = read('api/stripe-webhook.js');

assertIncludes(
  usageAlertTrigger,
  "import { authenticateBillingRequest } from '../_utils/billing.js';",
  'usage alert trigger must use shared billing auth'
);
assert(
  usageAlertTrigger.indexOf('authenticateBillingRequest(req, supabase)') <
    usageAlertTrigger.indexOf('const { userId: requestedUserId }'),
  'usage alert trigger must authenticate before trusting body userId'
);
assertIncludes(
  usageAlertTrigger,
  'requestedUserId && requestedUserId !== authResult.user.id',
  'usage alert trigger must reject mismatched body userId'
);
assertIncludes(
  usageAlertTrigger,
  'const userId = authResult.user.id;',
  'usage alert trigger must bind service-role reads and writes to authenticated user'
);
assert(
  !usageAlertTrigger.includes('json({ sent: true, email'),
  'usage alert trigger must not return recipient email or billing metadata'
);

assertIncludes(
  usageHook,
  'supabase.auth.getSession()',
  'useAIUsage must fetch the Supabase session before calling usage alert trigger'
);
assertIncludes(
  usageHook,
  'Authorization: `Bearer ${session.access_token}`',
  'useAIUsage must forward bearer auth to usage alert trigger'
);

assertIncludes(
  cancellationFeedback,
  "import { authenticateBillingRequest } from './_utils/billing.js';",
  'cancellation feedback endpoint must use shared billing auth'
);
assertIncludes(
  cancellationFeedback,
  'user_id && user_id !== authResult.user.id',
  'cancellation feedback endpoint must reject mismatched body user_id'
);
assertIncludes(
  cancellationFeedback,
  'const authenticatedUserId = authResult.user.id;',
  'cancellation feedback endpoint must bind writes to authenticated user'
);
assertIncludes(
  cancellationFeedback,
  ".eq('user_id', authenticatedUserId)",
  'cancellation feedback duplicate check must use authenticated user'
);
assertIncludes(
  cancellationFeedback,
  'user_id: authenticatedUserId',
  'cancellation feedback insert must use authenticated user'
);
assertIncludes(
  cancelModal,
  'Authorization: `Bearer ${session.access_token}`',
  'cancellation modal must forward bearer auth to feedback endpoint'
);

assertIncludes(
  subscriptionStatus,
  'const NO_ACCESS_STRIPE_STATUSES = new Set',
  'subscription status API must define authoritative no-access Stripe statuses'
);
assert(
  subscriptionStatus.indexOf('NO_ACCESS_STRIPE_STATUSES.has(subStatus)') <
    subscriptionStatus.indexOf('if (!stripeSubscription)'),
  'subscription status API must handle live no-access Stripe statuses before DB fallback'
);
assertIncludes(
  subscriptionStatus,
  'plan: null',
  'subscription status API must not return a paid plan for live no-access Stripe statuses'
);
assertIncludes(
  subscriptionContext,
  'const NO_ACCESS_STRIPE_STATUSES = new Set',
  'subscription context must define authoritative no-access Stripe statuses'
);
assertIncludes(
  subscriptionContext,
  'const hasNoAccessStripeStatus = NO_ACCESS_STRIPE_STATUSES.has(stripeStatus);',
  'subscription context must detect live no-access Stripe statuses'
);
assertIncludes(
  subscriptionContext,
  'hasNoAccessStripeStatus ? null',
  'subscription context must not keep a paid tier when Stripe says no access'
);

const invoicePaidBlock = stripeWebhook.slice(
  stripeWebhook.indexOf("case 'invoice.paid'"),
  stripeWebhook.indexOf("case 'invoice.payment_succeeded'")
);
assertIncludes(
  invoicePaidBlock,
  'cancelAtPeriodEnd = Boolean(stripeSub.cancel_at_period_end);',
  'invoice.paid must sync cancel_at_period_end from Stripe'
);
assert(
  !invoicePaidBlock.includes('cancel_at_period_end: false'),
  'invoice.paid must not blindly clear scheduled cancellation state'
);
assertIncludes(
  stripeWebhook,
  "throw new Error('Could not resolve Supabase user for completed checkout session');",
  'checkout completion must fail for retry when no Supabase user can be resolved'
);
assertIncludes(
  stripeWebhook,
  'throw subErr;',
  'checkout completion must fail for retry when subscription sync fails'
);
assertIncludes(
  stripeWebhook,
  "return res.status(500).json({ error: 'Webhook processing failed' });",
  'unhandled webhook processing errors must return 500 so Stripe retries'
);

console.log('Critical bug guard checks passed.');
