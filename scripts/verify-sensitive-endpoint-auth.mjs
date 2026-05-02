import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = process.cwd();

function read(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

function assertContains(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

function assertNotContains(source, needle, message) {
  if (source.includes(needle)) {
    throw new Error(message);
  }
}

const usageTrigger = read('api/emails/send-usage-alert-trigger.js');
assertContains(
  usageTrigger,
  "import { authenticateBillingRequest } from '../_utils/billing.js';",
  'usage-alert trigger must import authenticateBillingRequest'
);
assertContains(
  usageTrigger,
  'const authResult = await authenticateBillingRequest(req, supabase);',
  'usage-alert trigger must authenticate requests'
);
assertContains(
  usageTrigger,
  'const userId = authResult.user.id;',
  'usage-alert trigger must bind userId to the authenticated user'
);
assertContains(
  usageTrigger,
  'authResult.user.email',
  'usage-alert trigger must resolve email from the authenticated user'
);
assertNotContains(
  usageTrigger,
  'auth.admin.getUserById',
  'usage-alert trigger must not perform admin lookup by client supplied userId'
);
assertContains(
  usageTrigger,
  'requestedUserId && requestedUserId !== userId',
  'usage-alert trigger must reject mismatched body userId values'
);
assertNotContains(
  usageTrigger,
  'return res.status(200).json({ sent: true, email',
  'usage-alert trigger must not return recipient email'
);

const usageHook = read('src/hooks/useAIUsage.js');
assertContains(
  usageHook,
  'Authorization: `Bearer ${accessToken}`',
  'useAIUsage must forward the Supabase access token'
);

const cancellationFeedback = read('api/submit-cancellation-feedback.js');
assertContains(
  cancellationFeedback,
  "import { authenticateBillingRequest } from './_utils/billing.js';",
  'cancellation feedback endpoint must import authenticateBillingRequest'
);
assertContains(
  cancellationFeedback,
  'const authResult = await authenticateBillingRequest(req, supabase);',
  'cancellation feedback endpoint must authenticate requests'
);
assertContains(
  cancellationFeedback,
  'const userId = authResult.user.id;',
  'cancellation feedback endpoint must bind userId to the authenticated user'
);
assertContains(
  cancellationFeedback,
  'requestedUserId && requestedUserId !== userId',
  'cancellation feedback endpoint must reject mismatched body user_id values'
);
assertNotContains(
  cancellationFeedback,
  'user_id,',
  'cancellation feedback endpoint must not trust raw body user_id in inserts'
);
assertContains(
  cancellationFeedback,
  'user_id: userId',
  'cancellation feedback endpoint must insert the authenticated user id'
);

const cancellationModal = read('src/components/CancelSubscriptionModal.jsx');
assertContains(
  cancellationModal,
  "import { supabase } from '../config/supabase';",
  'CancelSubscriptionModal must import supabase to read the session'
);
assertContains(
  cancellationModal,
  'Authorization: `Bearer ${session.access_token}`',
  'CancelSubscriptionModal must forward the Supabase access token'
);

const sessionDetails = read('api/stripe-session-details.js');
assertNotContains(
  sessionDetails,
  'customer_email',
  'stripe-session-details must not expose customer_email'
);
assertNotContains(
  sessionDetails,
  'customer_details?.email',
  'stripe-session-details must not read customer_details email'
);

console.log('Sensitive endpoint auth guardrails passed.');
