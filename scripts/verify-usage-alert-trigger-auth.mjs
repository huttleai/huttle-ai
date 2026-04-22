/**
 * Regression guard: usage-alert trigger must be authenticated and user-bound.
 * Run: node scripts/verify-usage-alert-trigger-auth.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const endpointPath = resolve('api/emails/send-usage-alert-trigger.js');
const hookPath = resolve('src/hooks/useAIUsage.js');

const endpointSource = readFileSync(endpointPath, 'utf8');
const hookSource = readFileSync(hookPath, 'utf8');

assert(
  endpointSource.includes("parseBearerToken(req.headers.authorization)"),
  'endpoint must parse bearer token from Authorization header'
);
assert(
  endpointSource.includes("supabase.auth.getUser(accessToken)"),
  'endpoint must validate Supabase access token'
);
assert(
  endpointSource.includes("requestedUserId && requestedUserId !== user.id"),
  'endpoint must reject mismatched userId hints'
);
assert(
  endpointSource.includes('const userId = user.id;'),
  'endpoint must bind operations to authenticated user id'
);
assert(
  hookSource.includes('Authorization: `Bearer ${accessToken}`'),
  'client usage hook must include bearer token when triggering endpoint'
);

console.log('verify-usage-alert-trigger-auth: OK');
