import { readFileSync } from 'node:fs';

function assertContains(filePath, pattern, description) {
  const source = readFileSync(filePath, 'utf8');
  if (!pattern.test(source)) {
    throw new Error(`${filePath}: missing guardrail: ${description}`);
  }
}

function assertNotContains(filePath, pattern, description) {
  const source = readFileSync(filePath, 'utf8');
  if (pattern.test(source)) {
    throw new Error(`${filePath}: forbidden pattern found: ${description}`);
  }
}

assertContains(
  'api/submit-cancellation-feedback.js',
  /import\s+\{\s*authenticateBillingRequest\s*\}\s+from\s+['"]\.\/_utils\/billing\.js['"]/,
  'cancellation feedback imports shared bearer authentication'
);
assertContains(
  'api/submit-cancellation-feedback.js',
  /authenticateBillingRequest\(req,\s*supabase\)/,
  'cancellation feedback authenticates the request'
);
assertContains(
  'api/submit-cancellation-feedback.js',
  /user_id\s*&&\s*user_id\s*!==\s*authResult\.user\.id/,
  'cancellation feedback rejects body/auth user mismatches'
);
assertContains(
  'api/submit-cancellation-feedback.js',
  /\.eq\(['"]user_id['"],\s*authenticatedUserId\)/,
  'cancellation feedback duplicate check is bound to authenticated user'
);
assertContains(
  'api/submit-cancellation-feedback.js',
  /user_id:\s*authenticatedUserId/,
  'cancellation feedback insert is bound to authenticated user'
);

assertContains(
  'api/emails/send-usage-alert-trigger.js',
  /import\s+\{\s*authenticateBillingRequest\s*\}\s+from\s+['"]\.\.\/_utils\/billing\.js['"]/,
  'usage alert trigger imports shared bearer authentication'
);
assertContains(
  'api/emails/send-usage-alert-trigger.js',
  /authenticateBillingRequest\(req,\s*supabase\)/,
  'usage alert trigger authenticates the request'
);
assertContains(
  'api/emails/send-usage-alert-trigger.js',
  /requestedUserId\s*&&\s*requestedUserId\s*!==\s*authResult\.user\.id/,
  'usage alert trigger rejects body/auth user mismatches'
);
assertContains(
  'api/emails/send-usage-alert-trigger.js',
  /const\s+userId\s*=\s*authResult\.user\.id/,
  'usage alert trigger binds service-role operations to authenticated user'
);
assertNotContains(
  'api/emails/send-usage-alert-trigger.js',
  /return\s+res\.status\(200\)\.json\(\{[^}]*\bemail\b/s,
  'usage alert trigger must not leak recipient email in response'
);

assertContains(
  'src/components/CancelSubscriptionModal.jsx',
  /Authorization:\s*`Bearer \$\{session\.access_token\}`/,
  'cancellation feedback caller forwards Supabase access token'
);
assertContains(
  'src/hooks/useAIUsage.js',
  /Authorization:\s*`Bearer \$\{session\.access_token\}`/,
  'usage alert caller forwards Supabase access token'
);

console.log('Sensitive endpoint auth guardrails passed.');
