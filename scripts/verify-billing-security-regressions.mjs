import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label}: missing "${expected}"`);
  }
}

function assertNotIncludes(source, unexpected, label) {
  if (source.includes(unexpected)) {
    throw new Error(`${label}: found forbidden "${unexpected}"`);
  }
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`${label}: pattern not found (${pattern})`);
  }
}

const usageTrigger = read('api/emails/send-usage-alert-trigger.js');
assertIncludes(usageTrigger, "import { authenticateBillingRequest } from '../_utils/billing.js';", 'usage trigger auth import');
assertIncludes(usageTrigger, 'const authResult = await authenticateBillingRequest(req, supabase);', 'usage trigger auth check');
assertIncludes(usageTrigger, 'const authenticatedUserId = authResult.user.id;', 'usage trigger authenticated user binding');
assertIncludes(usageTrigger, 'userId && userId !== authenticatedUserId', 'usage trigger mismatch rejection');
assertMatches(usageTrigger, /\.eq\('user_id', authenticatedUserId\)/, 'usage trigger scoped reads');
assertMatches(usageTrigger, /user_id:\s*authenticatedUserId/, 'usage trigger scoped insert');
assertNotIncludes(usageTrigger, 'auth.admin.getUserById(userId)', 'usage trigger body user admin lookup');
assertNotIncludes(usageTrigger, 'json({ sent: true, email', 'usage trigger response email leak');

const usageHook = read('src/hooks/useAIUsage.js');
assertIncludes(usageHook, 'Authorization: `Bearer ${session.access_token}`', 'usage hook forwards auth');

const feedbackEndpoint = read('api/submit-cancellation-feedback.js');
assertIncludes(feedbackEndpoint, "import { authenticateBillingRequest } from './_utils/billing.js';", 'feedback auth import');
assertIncludes(feedbackEndpoint, 'const authResult = await authenticateBillingRequest(req, supabase);', 'feedback auth check');
assertIncludes(feedbackEndpoint, 'const authenticatedUserId = authResult.user.id;', 'feedback authenticated user binding');
assertIncludes(feedbackEndpoint, 'user_id && user_id !== authenticatedUserId', 'feedback mismatch rejection');
assertMatches(feedbackEndpoint, /\.eq\('user_id', authenticatedUserId\)/, 'feedback duplicate check binding');
assertMatches(feedbackEndpoint, /user_id:\s*authenticatedUserId/, 'feedback insert binding');

const feedbackCaller = read('src/components/CancelSubscriptionModal.jsx');
assertIncludes(feedbackCaller, 'Authorization: `Bearer ${session.access_token}`', 'feedback caller forwards auth');

const subscriptionStatus = read('api/subscription-status.js');
assertNotIncludes(subscriptionStatus, "subStatus === 'incomplete_expired'", 'terminal Stripe status must not fall back to DB');
assertNotIncludes(subscriptionStatus, "subStatus === 'unpaid'", 'unpaid Stripe status must not fall back to DB');

const subscriptionContext = read('src/context/SubscriptionContext.jsx');
assertIncludes(subscriptionContext, 'const hasAuthoritativeStripeResult = Boolean(stripeResult.success);', 'context Stripe authority marker');
assertIncludes(subscriptionContext, "? (stripeSubscription?.status || stripeResult.status || 'inactive')", 'context prefers Stripe/API status');
assertNotIncludes(
  subscriptionContext,
  "const nextStatus = databaseSubscription?.status || stripeSubscription?.status || stripeResult.status || 'inactive';",
  'context stale database status precedence'
);

console.log('Billing security regression checks passed.');
