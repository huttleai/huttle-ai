import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const usageAlertTrigger = read('api/emails/send-usage-alert-trigger.js');
assert(
  usageAlertTrigger.includes('authenticateBillingRequest'),
  'usage alert trigger must authenticate the bearer token'
);
assert(
  usageAlertTrigger.includes('requestedUserId && requestedUserId !== authResult.user.id'),
  'usage alert trigger must reject mismatched body userIds'
);
assert(
  !usageAlertTrigger.includes('sent: true, email') && !usageAlertTrigger.includes('email, planName'),
  'usage alert trigger must not return a user email field'
);

const useAIUsage = read('src/hooks/useAIUsage.js');
assert(
  useAIUsage.includes('send-usage-alert-trigger') && useAIUsage.includes('headers.Authorization'),
  'usage alert client call must forward the Supabase bearer token'
);

const cancellationFeedback = read('api/submit-cancellation-feedback.js');
assert(
  cancellationFeedback.includes('authenticateBillingRequest'),
  'cancellation feedback endpoint must authenticate the bearer token'
);
assert(
  cancellationFeedback.includes('requestedUserId && requestedUserId !== authResult.user.id'),
  'cancellation feedback endpoint must reject mismatched body userIds'
);
assert(
  cancellationFeedback.includes('const user_id = authResult.user.id'),
  'cancellation feedback endpoint must bind writes to the authenticated user'
);

const cancelModal = read('src/components/CancelSubscriptionModal.jsx');
assert(
  cancelModal.includes('submit-cancellation-feedback') && cancelModal.includes('headers.Authorization'),
  'cancellation feedback client call must forward the Supabase bearer token'
);

const stripeSessionDetails = read('api/stripe-session-details.js');
assert(
  !stripeSessionDetails.includes('customer_email'),
  'checkout session details must not expose customer_email'
);

const subscriptionStatus = read('api/subscription-status.js');
assert(
  !subscriptionStatus.includes("subStatus === 'unpaid'") &&
    !subscriptionStatus.includes("subStatus === 'incomplete_expired'"),
  'subscription-status must not fall back to Supabase for explicit Stripe terminal statuses'
);

const subscriptionContext = read('src/context/SubscriptionContext.jsx');
assert(
  subscriptionContext.includes('TERMINAL_STRIPE_STATUSES') &&
    subscriptionContext.includes('hasTerminalStripeStatus') &&
    /hasTerminalStripeStatus\s*\?\s*stripeStatus/.test(subscriptionContext),
  'subscription context must prefer explicit Stripe terminal statuses over stale DB rows'
);

const aiPlanBuilder = read('src/pages/AIPlanBuilder.jsx');
const planUsageCall = /planUsage\.trackFeatureUsage\(\{([\s\S]*?)\}\);/.exec(aiPlanBuilder);
assert(planUsageCall, 'AI Plan Builder must track usage before triggering generation');
assert(
  !planUsageCall[1].includes('incrementFeatureCounter: false'),
  'AI Plan Builder direct job path must not suppress the planBuilder run-counter row'
);
assert(
  aiPlanBuilder.includes('if (!usageResult.allowed)'),
  'AI Plan Builder must stop if the final usage re-check rejects the run'
);

console.info('Critical bug guard checks passed');
