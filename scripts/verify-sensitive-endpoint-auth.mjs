/**
 * Static guard for service-role endpoints that are called from the browser.
 * Run: node scripts/verify-sensitive-endpoint-auth.mjs
 */

import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const usageAlertEndpoint = read('api/emails/send-usage-alert-trigger.js');
const usageAlertCaller = read('src/hooks/useAIUsage.js');
const cancellationFeedbackEndpoint = read('api/submit-cancellation-feedback.js');
const cancellationFeedbackCaller = read('src/components/CancelSubscriptionModal.jsx');

assert(
  usageAlertEndpoint.includes("import { authenticateBillingRequest } from '../_utils/billing.js';"),
  'usage alert trigger must import authenticateBillingRequest',
);
assert(
  usageAlertEndpoint.includes('const authResult = await authenticateBillingRequest(req, supabase);'),
  'usage alert trigger must authenticate bearer token',
);
assert(
  usageAlertEndpoint.includes('userId && userId !== authResult.user.id'),
  'usage alert trigger must reject body userId mismatches',
);
assert(
  usageAlertEndpoint.includes('const authenticatedUserId = authResult.user.id;'),
  'usage alert trigger must derive user id from authResult.user.id',
);
assert(
  !/return\s+res\.status\(200\)\.json\(\{[^}]*\bemail\b/s.test(usageAlertEndpoint),
  'usage alert trigger must not return recipient email',
);
assert(
  usageAlertCaller.includes('Authorization: `Bearer ${session.access_token}`'),
  'usage alert caller must send bearer token',
);

assert(
  cancellationFeedbackEndpoint.includes("import { authenticateBillingRequest } from './_utils/billing.js';"),
  'cancellation feedback endpoint must import authenticateBillingRequest',
);
assert(
  cancellationFeedbackEndpoint.includes('const authResult = await authenticateBillingRequest(req, supabase);'),
  'cancellation feedback endpoint must authenticate bearer token',
);
assert(
  cancellationFeedbackEndpoint.includes('user_id && user_id !== authResult.user.id'),
  'cancellation feedback endpoint must reject body user_id mismatches',
);
assert(
  cancellationFeedbackEndpoint.includes('const authenticatedUserId = authResult.user.id;'),
  'cancellation feedback endpoint must derive user id from authResult.user.id',
);
assert(
  cancellationFeedbackEndpoint.includes('user_id: authenticatedUserId'),
  'cancellation feedback insert must use authenticated user id',
);
assert(
  cancellationFeedbackCaller.includes('Authorization: `Bearer ${session.access_token}`'),
  'cancellation feedback caller must send bearer token',
);

console.log('verify-sensitive-endpoint-auth: OK');
