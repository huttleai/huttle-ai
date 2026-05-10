/**
 * Static guard for user-scoped service-role endpoints.
 * Run: node scripts/verify-sensitive-endpoint-auth.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const usageEndpoint = read('api/emails/send-usage-alert-trigger.js');
const feedbackEndpoint = read('api/submit-cancellation-feedback.js');
const usageHook = read('src/hooks/useAIUsage.js');
const cancelModal = read('src/components/CancelSubscriptionModal.jsx');

assert(
  usageEndpoint.includes("import { authenticateBillingRequest } from '../_utils/billing.js';"),
  'usage alert endpoint must import authenticateBillingRequest',
);
assert(
  usageEndpoint.includes('const authResult = await authenticateBillingRequest(req, supabase);'),
  'usage alert endpoint must authenticate the bearer token',
);
assert(
  usageEndpoint.includes('const userId = authResult.user.id;'),
  'usage alert endpoint must bind operations to authenticated user id',
);
assert(
  usageEndpoint.includes('requestedUserId && requestedUserId !== userId'),
  'usage alert endpoint must reject body userId mismatches',
);
assert(
  !usageEndpoint.includes('auth.admin.getUserById(userId)'),
  'usage alert endpoint must not use admin lookup for caller-supplied user id',
);
assert(
  !usageEndpoint.includes('sent: true, email'),
  'usage alert endpoint must not return recipient email',
);

assert(
  feedbackEndpoint.includes("import { authenticateBillingRequest } from './_utils/billing.js';"),
  'cancellation feedback endpoint must import authenticateBillingRequest',
);
assert(
  feedbackEndpoint.includes('const authResult = await authenticateBillingRequest(req, supabase);'),
  'cancellation feedback endpoint must authenticate the bearer token',
);
assert(
  feedbackEndpoint.includes('const authenticatedUserId = authResult.user.id;'),
  'cancellation feedback endpoint must bind operations to authenticated user id',
);
assert(
  feedbackEndpoint.includes('user_id && user_id !== authenticatedUserId'),
  'cancellation feedback endpoint must reject body user_id mismatches',
);
assert(
  feedbackEndpoint.includes(".eq('user_id', authenticatedUserId)"),
  'cancellation feedback duplicate check must use authenticated user id',
);
assert(
  feedbackEndpoint.includes('user_id: authenticatedUserId'),
  'cancellation feedback insert must use authenticated user id',
);

assert(
  usageHook.includes('supabase.auth.getSession()') &&
    usageHook.includes('Authorization: `Bearer ${session.access_token}`') &&
    usageHook.includes("fetch('/api/emails/send-usage-alert-trigger'"),
  'useAIUsage must forward the Supabase access token to usage alert trigger',
);
assert(
  cancelModal.includes('supabase.auth.getSession()') &&
    cancelModal.includes('Authorization: `Bearer ${session.access_token}`') &&
    cancelModal.includes("fetch('/api/submit-cancellation-feedback'"),
  'CancelSubscriptionModal must forward the Supabase access token to feedback API',
);

console.log('verify-sensitive-endpoint-auth: OK');
