/**
 * Dev check: service-role endpoints that act on user-owned records must bind
 * the request to the authenticated Supabase user before using body user IDs.
 * Run: node scripts/verify-sensitive-endpoint-auth.mjs
 */
import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const sensitiveEndpoints = [
  {
    path: 'api/submit-cancellation-feedback.js',
    ownerBinding: /user_id\s*&&\s*user_id\s*!==\s*authResult\.user\.id/,
    canonicalUser: /const\s+userId\s*=\s*authResult\.user\.id/,
  },
  {
    path: 'api/emails/send-usage-alert-trigger.js',
    ownerBinding: /requestedUserId\s*&&\s*requestedUserId\s*!==\s*authResult\.user\.id/,
    canonicalUser: /const\s+userId\s*=\s*authResult\.user\.id/,
  },
];

for (const endpoint of sensitiveEndpoints) {
  const source = read(endpoint.path);
  assert(
    source.includes('authenticateBillingRequest'),
    `${endpoint.path} must authenticate bearer tokens`,
  );
  assert(
    endpoint.ownerBinding.test(source),
    `${endpoint.path} must reject body user IDs that differ from the authenticated user`,
  );
  assert(
    endpoint.canonicalUser.test(source),
    `${endpoint.path} must derive the effective user ID from authResult.user.id`,
  );
}

const cancellationModal = read('src/components/CancelSubscriptionModal.jsx');
assert(
  cancellationModal.includes('supabase.auth.getSession()') &&
    cancellationModal.includes('Authorization: `Bearer ${session.access_token}`'),
  'CancelSubscriptionModal must send the Supabase bearer token with feedback submissions',
);

const usageHook = read('src/hooks/useAIUsage.js');
assert(
  usageHook.includes('supabase.auth.getSession()') &&
    usageHook.includes('Authorization: `Bearer ${session.access_token}`'),
  'useAIUsage must send the Supabase bearer token with usage alert triggers',
);

console.log('verify-sensitive-endpoint-auth: OK');
