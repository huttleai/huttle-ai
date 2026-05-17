import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const cancellationApi = read('api/submit-cancellation-feedback.js');
assert.match(
  cancellationApi,
  /import \{ authenticateBillingRequest \} from '\.\/_utils\/billing\.js';/,
  'cancellation feedback endpoint must import authenticateBillingRequest'
);
assert.match(
  cancellationApi,
  /const authResult = await authenticateBillingRequest\(req, supabase\);/,
  'cancellation feedback endpoint must authenticate the bearer token'
);
assert.match(
  cancellationApi,
  /requestedUserId && requestedUserId !== authResult\.user\.id/,
  'cancellation feedback endpoint must reject body user_id mismatches'
);
assert.match(
  cancellationApi,
  /\.eq\('user_id', userId\)/,
  'cancellation feedback duplicate check must be bound to authenticated user'
);
assert.match(
  cancellationApi,
  /user_id: userId/,
  'cancellation feedback insert must be bound to authenticated user'
);
assert.doesNotMatch(
  cancellationApi,
  /Missing required fields: user_id/,
  'cancellation feedback endpoint must not require or trust body user_id'
);

const cancellationModal = read('src/components/CancelSubscriptionModal.jsx');
assert.match(
  cancellationModal,
  /import \{ supabase \} from '\.\.\/config\/supabase';/,
  'cancellation modal must access the Supabase session'
);
assert.match(
  cancellationModal,
  /Authorization: `Bearer \$\{session\.access_token\}`/,
  'cancellation modal must forward bearer auth to feedback endpoint'
);

const usageAlertApi = read('api/emails/send-usage-alert-trigger.js');
assert.match(
  usageAlertApi,
  /import \{ authenticateBillingRequest \} from '\.\.\/_utils\/billing\.js';/,
  'usage alert endpoint must import authenticateBillingRequest'
);
assert.match(
  usageAlertApi,
  /const authResult = await authenticateBillingRequest\(req, supabase\);/,
  'usage alert endpoint must authenticate the bearer token'
);
assert.match(
  usageAlertApi,
  /requestedUserId && requestedUserId !== authResult\.user\.id/,
  'usage alert endpoint must reject body userId mismatches'
);
assert.match(
  usageAlertApi,
  /const userId = authResult\.user\.id;/,
  'usage alert endpoint must bind service-role reads and writes to authenticated user'
);
assert.doesNotMatch(
  usageAlertApi,
  /auth\.admin\.getUserById\(userId\)/,
  'usage alert endpoint must not look up arbitrary body-selected auth users'
);
assert.doesNotMatch(
  usageAlertApi,
  /json\(\{ sent: true, email,/,
  'usage alert endpoint must not return recipient email in the response'
);

const usageHook = read('src/hooks/useAIUsage.js');
assert.match(
  usageHook,
  /Authorization: `Bearer \$\{session\.access_token\}`/,
  'usage hook must forward bearer auth to usage alert endpoint'
);

console.log('Sensitive endpoint auth guardrails verified.');
