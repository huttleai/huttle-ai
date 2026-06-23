import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  }
}

function assertIncludes(source, expected, message) {
  assert(source.includes(expected), message);
}

const cancellationFeedback = read('api/submit-cancellation-feedback.js');
assertIncludes(
  cancellationFeedback,
  "import { authenticateBillingRequest } from './_utils/billing.js';",
  'cancellation feedback endpoint must import authenticateBillingRequest'
);
assertIncludes(
  cancellationFeedback,
  'await authenticateBillingRequest(req, supabase)',
  'cancellation feedback endpoint must authenticate bearer token'
);
assertIncludes(
  cancellationFeedback,
  'requestedUserId && requestedUserId !== authResult.user.id',
  'cancellation feedback endpoint must reject body/auth user mismatches'
);
assertIncludes(
  cancellationFeedback,
  'const userId = authResult.user.id',
  'cancellation feedback endpoint must bind writes to authenticated user'
);
assertIncludes(
  cancellationFeedback,
  '.eq(\'user_id\', userId)',
  'cancellation feedback duplicate check must use authenticated user'
);
assertIncludes(
  cancellationFeedback,
  'user_id: userId',
  'cancellation feedback insert must use authenticated user'
);

const usageAlert = read('api/emails/send-usage-alert-trigger.js');
assertIncludes(
  usageAlert,
  "import { authenticateBillingRequest } from '../_utils/billing.js';",
  'usage alert endpoint must import authenticateBillingRequest'
);
assertIncludes(
  usageAlert,
  'await authenticateBillingRequest(req, supabase)',
  'usage alert endpoint must authenticate bearer token'
);
assertIncludes(
  usageAlert,
  'requestedUserId && requestedUserId !== authResult.user.id',
  'usage alert endpoint must reject body/auth user mismatches'
);
assertIncludes(
  usageAlert,
  'const userId = authResult.user.id',
  'usage alert endpoint must bind reads/writes to authenticated user'
);
assertIncludes(
  usageAlert,
  'const email = authResult.user.email',
  'usage alert endpoint must use authenticated user email'
);
assert(
  !/auth\.admin\.getUserById\(userId\)/.test(usageAlert),
  'usage alert endpoint must not look up arbitrary body user IDs via service role'
);
assert(
  !/json\(\{[^}]*email/.test(usageAlert),
  'usage alert endpoint must not return recipient email'
);

const stripeApi = read('src/services/stripeAPI.js');
assertIncludes(
  stripeApi,
  'export async function getAuthHeaders()',
  'client billing helper must expose authenticated headers'
);
assertIncludes(
  stripeApi,
  "fetch('/api/submit-cancellation-feedback'",
  'client billing helper must own cancellation feedback submission'
);

const cancelModal = read('src/components/CancelSubscriptionModal.jsx');
assertIncludes(
  cancelModal,
  "import { submitCancellationFeedback } from '../services/stripeAPI';",
  'cancel modal must use authenticated feedback helper'
);
assert(
  !cancelModal.includes("fetch('/api/submit-cancellation-feedback'"),
  'cancel modal must not post unauthenticated feedback directly'
);

const useAIUsage = read('src/hooks/useAIUsage.js');
assertIncludes(
  useAIUsage,
  'supabase.auth.getSession()',
  'usage hook must read Supabase session before firing usage alert'
);
assertIncludes(
  useAIUsage,
  'Authorization: `Bearer ${session.access_token}`',
  'usage hook must send bearer token to usage alert endpoint'
);

if (!process.exitCode) {
  console.log('Sensitive endpoint auth guard passed.');
}
