import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const endpointPath = resolve('api/emails/send-usage-alert-trigger.js');
const hookPath = resolve('src/hooks/useAIUsage.js');

const endpointSource = readFileSync(endpointPath, 'utf8');
const hookSource = readFileSync(hookPath, 'utf8');

const checks = [
  {
    ok: endpointSource.includes("import { parseBearerToken } from '../_utils/billing.js';"),
    message: 'usage alert endpoint must parse a bearer token',
  },
  {
    ok: endpointSource.includes("return res.status(401).json({ error: 'Authentication required' });"),
    message: 'usage alert endpoint must reject unauthenticated requests',
  },
  {
    ok: endpointSource.includes('await supabase.auth.getUser(token)'),
    message: 'usage alert endpoint must validate the token with Supabase auth',
  },
  {
    ok: endpointSource.includes('requestedUserId && requestedUserId !== user.id'),
    message: 'usage alert endpoint must reject userId/body mismatches',
  },
  {
    ok: endpointSource.includes('const userId = user.id;'),
    message: 'usage alert endpoint must derive userId from the authenticated user',
  },
  {
    ok: !endpointSource.includes('auth.admin.getUserById(userId)'),
    message: 'usage alert endpoint must not fetch arbitrary users by body userId',
  },
  {
    ok: !endpointSource.includes('json({ sent: true, email'),
    message: 'usage alert endpoint response must not disclose recipient email',
  },
  {
    ok: hookSource.includes('supabase.auth.getSession()') &&
      hookSource.includes('headers.Authorization = `Bearer ${session.access_token}`'),
    message: 'useAIUsage must send the current access token to the usage alert endpoint',
  },
];

const failures = checks.filter((check) => !check.ok);

if (failures.length > 0) {
  console.error('Usage alert trigger security verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure.message}`);
  }
  process.exit(1);
}

console.log('Usage alert trigger security verification passed.');
