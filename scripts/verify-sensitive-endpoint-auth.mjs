import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

function assertIncludes(source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(message);
  }
}

function assertNotIncludes(source, expected, message) {
  if (source.includes(expected)) {
    throw new Error(message);
  }
}

const usageTrigger = read('api/emails/send-usage-alert-trigger.js');
assertIncludes(
  usageTrigger,
  "import { authenticateBillingRequest } from '../_utils/billing.js';",
  'Usage alert trigger must import shared bearer auth'
);
assertIncludes(
  usageTrigger,
  'const authResult = await authenticateBillingRequest(req, supabase);',
  'Usage alert trigger must authenticate the request'
);
assertIncludes(
  usageTrigger,
  'const userId = authResult.user.id;',
  'Usage alert trigger must bind work to the authenticated user'
);
assertIncludes(
  usageTrigger,
  'requestedUserId && requestedUserId !== userId',
  'Usage alert trigger must reject body/auth user mismatches'
);
assertNotIncludes(
  usageTrigger,
  'json({ sent: true, email',
  'Usage alert trigger must not return recipient email'
);

const cancellationFeedback = read('api/submit-cancellation-feedback.js');
assertIncludes(
  cancellationFeedback,
  "import { authenticateBillingRequest } from './_utils/billing.js';",
  'Cancellation feedback must import shared bearer auth'
);
assertIncludes(
  cancellationFeedback,
  'const authResult = await authenticateBillingRequest(req, supabase);',
  'Cancellation feedback must authenticate the request'
);
assertIncludes(
  cancellationFeedback,
  'const authenticatedUserId = authResult.user.id;',
  'Cancellation feedback must bind writes to the authenticated user'
);
assertIncludes(
  cancellationFeedback,
  'user_id && user_id !== authenticatedUserId',
  'Cancellation feedback must reject body/auth user mismatches'
);
assertIncludes(
  cancellationFeedback,
  ".eq('user_id', authenticatedUserId)",
  'Cancellation feedback duplicate checks must be scoped to the authenticated user'
);
assertIncludes(
  cancellationFeedback,
  'user_id: authenticatedUserId',
  'Cancellation feedback inserts must use the authenticated user id'
);

const useAiUsage = read('src/hooks/useAIUsage.js');
assertIncludes(
  useAiUsage,
  'Authorization: `Bearer ${session.access_token}`',
  'Usage alert caller must forward the Supabase access token'
);

const cancellationModal = read('src/components/CancelSubscriptionModal.jsx');
assertIncludes(
  cancellationModal,
  'Authorization: `Bearer ${session.access_token}`',
  'Cancellation feedback caller must forward the Supabase access token'
);

const sessionDetails = read('api/stripe-session-details.js');
assertNotIncludes(
  sessionDetails,
  'customer_email',
  'Stripe session details must not return purchaser email'
);

console.log('Sensitive endpoint auth guardrails passed.');
