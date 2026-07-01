import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, '..');

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), 'utf8');
}

function assertContains(filePath, needle, description) {
  const source = read(filePath);
  if (!source.includes(needle)) {
    throw new Error(`${description} missing in ${filePath}`);
  }
}

function assertNotContains(filePath, needle, description) {
  const source = read(filePath);
  if (source.includes(needle)) {
    throw new Error(`${description} still present in ${filePath}`);
  }
}

[
  'api/submit-cancellation-feedback.js',
  'api/emails/send-usage-alert-trigger.js',
  'api/stripe-session-details.js',
].forEach((filePath) => {
  assertContains(filePath, 'authenticateBillingRequest', 'Bearer-token authentication');
  assertContains(filePath, 'authResult.user.id', 'Authenticated user binding');
});

assertContains(
  'api/submit-cancellation-feedback.js',
  'requestedUserId && requestedUserId !== userId',
  'Cancellation feedback user mismatch guard'
);
assertContains(
  'api/emails/send-usage-alert-trigger.js',
  'requestedUserId && requestedUserId !== userId',
  'Usage alert user mismatch guard'
);
assertContains(
  'api/stripe-session-details.js',
  'sessionUserId !== authResult.user.id',
  'Checkout session ownership guard'
);
assertNotContains(
  'api/stripe-session-details.js',
  'customer_email',
  'Checkout session customer email response'
);
assertNotContains(
  'api/emails/send-usage-alert-trigger.js',
  'sent: true, email',
  'Usage alert email disclosure response'
);

[
  'src/components/CancelSubscriptionModal.jsx',
  'src/hooks/useAIUsage.js',
  'src/pages/PaymentSuccess.jsx',
].forEach((filePath) => {
  assertContains(filePath, 'supabase.auth.getSession()', 'Supabase session lookup');
  assertContains(filePath, 'Authorization: `Bearer ${session.access_token}`', 'Bearer token forwarding');
});

console.log('Sensitive endpoint auth guards passed');
