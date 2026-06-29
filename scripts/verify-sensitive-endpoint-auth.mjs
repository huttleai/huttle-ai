import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const cancellationFeedbackApi = read('api/submit-cancellation-feedback.js');
assert.match(
  cancellationFeedbackApi,
  /authenticateBillingRequest/,
  'Cancellation feedback endpoint must authenticate bearer tokens.'
);
assert.match(
  cancellationFeedbackApi,
  /user_id\s*&&\s*user_id\s*!==\s*authResult\.user\.id/,
  'Cancellation feedback endpoint must reject body user_id mismatches.'
);
assert.match(
  cancellationFeedbackApi,
  /\.eq\('user_id', authenticatedUserId\)/,
  'Cancellation feedback dedupe must be scoped to the authenticated user.'
);
assert.match(
  cancellationFeedbackApi,
  /user_id:\s*authenticatedUserId/,
  'Cancellation feedback writes must use the authenticated user.'
);

const usageAlertApi = read('api/emails/send-usage-alert-trigger.js');
assert.match(
  usageAlertApi,
  /authenticateBillingRequest/,
  'Usage alert trigger endpoint must authenticate bearer tokens.'
);
assert.match(
  usageAlertApi,
  /requestedUserId\s*&&\s*requestedUserId\s*!==\s*userId/,
  'Usage alert trigger endpoint must reject body userId mismatches.'
);
assert.doesNotMatch(
  usageAlertApi,
  /json\(\{\s*sent:\s*true,\s*email/,
  'Usage alert trigger response must not leak user email addresses.'
);

const cancellationModal = read('src/components/CancelSubscriptionModal.jsx');
assert.match(
  cancellationModal,
  /Authorization:\s*`Bearer \$\{session\.access_token\}`/,
  'Cancellation feedback client call must forward the Supabase bearer token.'
);

const usageHook = read('src/hooks/useAIUsage.js');
assert.match(
  usageHook,
  /headers\.Authorization = `Bearer \$\{session\.access_token\}`/,
  'Usage alert client call must forward the Supabase bearer token.'
);

console.info('Sensitive endpoint auth guards passed.');
