import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function assertIncludes(content, expected, label) {
  if (!content.includes(expected)) {
    throw new Error(`${label} is missing expected guard: ${expected}`);
  }
}

function assertNotIncludes(content, unexpected, label) {
  if (content.includes(unexpected)) {
    throw new Error(`${label} still contains unsafe pattern: ${unexpected}`);
  }
}

const cancellationFeedback = read('api/submit-cancellation-feedback.js');
assertIncludes(cancellationFeedback, "import { authenticateBillingRequest } from './_utils/billing.js';", 'cancellation feedback auth');
assertIncludes(cancellationFeedback, 'const authResult = await authenticateBillingRequest(req, supabase);', 'cancellation feedback auth');
assertIncludes(cancellationFeedback, 'const authenticatedUserId = authResult.user.id;', 'cancellation feedback user binding');
assertIncludes(cancellationFeedback, 'user_id: authenticatedUserId,', 'cancellation feedback insert binding');
assertIncludes(cancellationFeedback, "return res.status(403).json({ error: 'You can only submit your own cancellation feedback' });", 'cancellation feedback mismatch rejection');

const usageAlert = read('api/emails/send-usage-alert-trigger.js');
assertIncludes(usageAlert, "import { authenticateBillingRequest } from '../_utils/billing.js';", 'usage alert auth');
assertIncludes(usageAlert, 'const authResult = await authenticateBillingRequest(req, supabase);', 'usage alert auth');
assertIncludes(usageAlert, 'const authenticatedUserId = authResult.user.id;', 'usage alert user binding');
assertIncludes(usageAlert, 'user_id: authenticatedUserId,', 'usage alert activity binding');
assertIncludes(usageAlert, "return res.status(403).json({ error: 'You can only trigger your own usage alert' });", 'usage alert mismatch rejection');
assertNotIncludes(usageAlert, 'json({ sent: true, email', 'usage alert response');
assertNotIncludes(usageAlert, 'error: err.message', 'usage alert error response');

const usageHook = read('src/hooks/useAIUsage.js');
assertIncludes(usageHook, 'const { data: { session } = {} } = await supabase.auth.getSession();', 'usage hook session lookup');
assertIncludes(usageHook, 'Authorization: `Bearer ${accessToken}`', 'usage hook bearer forwarding');

const cancelModal = read('src/components/CancelSubscriptionModal.jsx');
assertIncludes(cancelModal, "import { supabase } from '../config/supabase';", 'cancel modal session import');
assertIncludes(cancelModal, 'const { data: { session } = {} } = await supabase.auth.getSession();', 'cancel modal session lookup');
assertIncludes(cancelModal, 'Authorization: `Bearer ${accessToken}`', 'cancel modal bearer forwarding');

const stripeWebhook = read('api/stripe-webhook.js');
assertIncludes(stripeWebhook, 'throw new Error(`Checkout user lookup failed: ${userLookupError.message}`);', 'checkout lookup retry');
assertIncludes(stripeWebhook, "throw new Error('Checkout session could not be linked to a Supabase user');", 'checkout user resolution retry');
assertIncludes(stripeWebhook, 'throw subErr;', 'checkout subscription retry');
assertIncludes(stripeWebhook, 'throw new Error(`Subscription profile lookup failed: ${profileError.message}`);', 'subscription profile retry');
assertIncludes(stripeWebhook, 'throw new Error(`Subscription status sync failed: ${statusSyncError.message}`);', 'subscription status retry');
assertIncludes(stripeWebhook, "return res.status(500).json({ error: 'Internal processing error - Stripe should retry this event' });", 'webhook retry response');

console.log('Critical correctness guards verified.');
