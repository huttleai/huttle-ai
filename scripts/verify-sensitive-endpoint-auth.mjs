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

const usageEndpoint = read('api/emails/send-usage-alert-trigger.js');
assert(
  usageEndpoint.includes("import { authenticateBillingRequest } from '../_utils/billing.js';"),
  'usage alert trigger must import authenticateBillingRequest'
);
assert(
  usageEndpoint.indexOf('authenticateBillingRequest(req, supabase)') <
    usageEndpoint.indexOf('await sendUsageAlert100Email'),
  'usage alert trigger must authenticate before sending email'
);
assert(
  usageEndpoint.includes('userId !== authResult.user.id'),
  'usage alert trigger must reject userId mismatches'
);
assert(
  !usageEndpoint.includes('json({ sent: true, email'),
  'usage alert trigger must not return recipient email addresses'
);

const feedbackEndpoint = read('api/submit-cancellation-feedback.js');
assert(
  feedbackEndpoint.includes("import { authenticateBillingRequest } from './_utils/billing.js';"),
  'cancellation feedback endpoint must import authenticateBillingRequest'
);
assert(
  feedbackEndpoint.indexOf('authenticateBillingRequest(req, supabase)') <
    feedbackEndpoint.indexOf(".from('cancellation_feedback')"),
  'cancellation feedback endpoint must authenticate before reading or writing feedback rows'
);
assert(
  feedbackEndpoint.includes('user_id && user_id !== authResult.user.id'),
  'cancellation feedback endpoint must reject user_id mismatches'
);
assert(
  feedbackEndpoint.includes('user_id: userId'),
  'cancellation feedback insert must bind user_id to the authenticated user'
);

const usageHook = read('src/hooks/useAIUsage.js');
assert(
  usageHook.includes('Authorization: `Bearer ${session.access_token}`'),
  'useAIUsage must send an Authorization bearer token to the usage alert endpoint'
);

const cancellationModal = read('src/components/CancelSubscriptionModal.jsx');
assert(
  cancellationModal.includes('Authorization: `Bearer ${session.access_token}`'),
  'CancelSubscriptionModal must send an Authorization bearer token to the feedback endpoint'
);

console.log('Sensitive endpoint auth checks passed.');
