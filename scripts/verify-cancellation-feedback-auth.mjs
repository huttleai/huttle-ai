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

const endpoint = read('api/submit-cancellation-feedback.js');

assert(
  endpoint.includes("import { authenticateBillingRequest } from './_utils/billing.js';"),
  'submit-cancellation-feedback must import authenticateBillingRequest'
);
assert(
  endpoint.indexOf('authenticateBillingRequest(req, supabase)') <
    endpoint.indexOf(".from('cancellation_feedback')"),
  'submit-cancellation-feedback must authenticate before reading or writing feedback rows'
);
assert(
  endpoint.includes('const userId = authResult.user.id;'),
  'submit-cancellation-feedback must derive user_id from the authenticated token, not the request body'
);
assert(
  endpoint.includes('user_id: userId'),
  'submit-cancellation-feedback insert must bind user_id to the authenticated user'
);

const modal = read('src/components/CancelSubscriptionModal.jsx');
assert(
  modal.includes('getAuthReadyHeaders'),
  'CancelSubscriptionModal must attach an Authorization bearer token to the feedback request'
);
assert(
  !modal.includes('user_id: userId'),
  'CancelSubscriptionModal must not send a client-supplied user_id to the feedback endpoint'
);

console.log('verify-cancellation-feedback-auth: all checks passed');
