import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const apiSource = readFileSync(new URL('../api/emails/send-usage-alert-trigger.js', import.meta.url), 'utf8');
const hookSource = readFileSync(new URL('../src/hooks/useAIUsage.js', import.meta.url), 'utf8');

assert(
  apiSource.includes("parseBearerToken(req.headers.authorization)"),
  'usage alert trigger must require a bearer token'
);
assert(
  apiSource.includes('supabase.auth.getUser(token)'),
  'usage alert trigger must validate the bearer token with Supabase'
);
assert(
  apiSource.includes('requestedUserId && requestedUserId !== user.id'),
  'usage alert trigger must reject cross-user body/user mismatches'
);
assert(
  apiSource.includes('const userId = user.id;'),
  'usage alert trigger must derive the target user from the authenticated user'
);
assert(
  !apiSource.includes('auth.admin.getUserById(userId)'),
  'usage alert trigger must not trust a caller-supplied userId for auth admin lookup'
);
assert(
  !apiSource.includes('return res.status(200).json({ sent: true, email'),
  'usage alert trigger response must not leak the recipient email'
);
assert(
  hookSource.includes('supabase.auth.getSession()') &&
    hookSource.includes('Authorization: `Bearer ${accessToken}`'),
  'usage alert client call must include the Supabase access token'
);

console.log('verify-usage-alert-trigger-security: OK');
