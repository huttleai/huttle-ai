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

function assertNotIncludes(content, snippet, message) {
  if (content.includes(snippet)) {
    throw new Error(message);
  }
}

const cancellationFeedback = read('api/submit-cancellation-feedback.js');
assertIncludes(
  cancellationFeedback,
  "import { authenticateBillingRequest } from './_utils/billing.js';",
  'submit-cancellation-feedback must import authenticateBillingRequest.'
);
assertIncludes(
  cancellationFeedback,
  'const authResult = await authenticateBillingRequest(req, supabase);',
  'submit-cancellation-feedback must authenticate the bearer token.'
);
assertIncludes(
  cancellationFeedback,
  'if (user_id && user_id !== authResult.user.id)',
  'submit-cancellation-feedback must reject mismatched body user_id values.'
);
assertIncludes(
  cancellationFeedback,
  'const userId = authResult.user.id;',
  'submit-cancellation-feedback must derive userId from the authenticated user.'
);
assertNotIncludes(
  cancellationFeedback,
  ".eq('user_id', user_id)",
  'submit-cancellation-feedback must not query using the body user_id.'
);

const usageAlertTrigger = read('api/emails/send-usage-alert-trigger.js');
assertIncludes(
  usageAlertTrigger,
  "import { authenticateBillingRequest } from '../_utils/billing.js';",
  'send-usage-alert-trigger must import authenticateBillingRequest.'
);
assertIncludes(
  usageAlertTrigger,
  'const authResult = await authenticateBillingRequest(req, supabase);',
  'send-usage-alert-trigger must authenticate the bearer token.'
);
assertIncludes(
  usageAlertTrigger,
  'if (requestedUserId && requestedUserId !== authResult.user.id)',
  'send-usage-alert-trigger must reject mismatched body userId values.'
);
assertIncludes(
  usageAlertTrigger,
  'const userId = authResult.user.id;',
  'send-usage-alert-trigger must derive userId from the authenticated user.'
);
assertNotIncludes(
  usageAlertTrigger,
  'email, planName',
  'send-usage-alert-trigger must not return the recipient email address.'
);

const useAIUsage = read('src/hooks/useAIUsage.js');
assertIncludes(
  useAIUsage,
  'Authorization: `Bearer ${session.access_token}`',
  'useAIUsage must forward the Supabase access token to the usage-alert trigger.'
);
assertIncludes(
  useAIUsage,
  'currentOverall + overallCredits >= overallLimit',
  'useAIUsage must trigger the alert when credits exactly reach the pool limit.'
);

const cancellationModal = read('src/components/CancelSubscriptionModal.jsx');
assertIncludes(
  cancellationModal,
  'Authorization: `Bearer ${session.access_token}`',
  'CancelSubscriptionModal must forward the Supabase access token with feedback.'
);

console.log('Sensitive endpoint auth guardrails passed.');
