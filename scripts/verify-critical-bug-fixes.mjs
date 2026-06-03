import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-role-key';

function createMockResponse() {
  const response = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
  };
  return response;
}

async function importHandler(relativePath) {
  const moduleUrl = pathToFileURL(new URL(`../${relativePath}`, import.meta.url).pathname).href;
  const module = await import(moduleUrl);
  return module.default;
}

async function assertUnauthorized(handlerPath, body) {
  const handler = await importHandler(handlerPath);
  const res = createMockResponse();
  await handler(
    {
      method: 'POST',
      headers: {},
      body,
    },
    res
  );

  assert.equal(res.statusCode, 401, `${handlerPath} should reject unauthenticated requests`);
  assert.equal(res.body?.error, 'Authentication required');
}

await assertUnauthorized('api/emails/send-usage-alert-trigger.js', {
  userId: '00000000-0000-0000-0000-000000000001',
});

await assertUnauthorized('api/submit-cancellation-feedback.js', {
  user_id: '00000000-0000-0000-0000-000000000002',
  reason: 'too_expensive',
});

const [
  usageAlertTriggerSource,
  cancellationModalSource,
  useAIUsageSource,
  planBuilderSource,
  stripeApiSource,
] = await Promise.all([
  readFile(new URL('../api/emails/send-usage-alert-trigger.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CancelSubscriptionModal.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/hooks/useAIUsage.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/AIPlanBuilder.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/stripeAPI.js', import.meta.url), 'utf8'),
]);

assert.match(
  usageAlertTriggerSource,
  /return res\.status\(200\)\.json\(\{ sent: true, planName, creditResetDate, daysUntilReset \}\)/,
  'usage-alert trigger response should not expose victim email addresses'
);
assert.match(
  usageAlertTriggerSource,
  /if \(emailResult\?\.error\)/,
  'usage-alert trigger should check Resend SDK error responses before marking sent'
);
assert.match(
  cancellationModalSource,
  /headers\.Authorization = `Bearer \$\{session\.access_token\}`/,
  'cancellation feedback caller should forward the Supabase bearer token'
);
assert.match(
  useAIUsageSource,
  /Authorization: `Bearer \$\{session\.access_token\}`/,
  'usage alert caller should forward the Supabase bearer token'
);
assert.doesNotMatch(
  planBuilderSource,
  /incrementFeatureCounter:\s*false/,
  'Plan Builder active path must not skip its run-counter row'
);
assert.match(
  planBuilderSource,
  /const usageResult = await planUsage\.trackFeatureUsage\(/,
  'Plan Builder should inspect usage reservation results'
);
assert.match(
  stripeApiSource,
  /requiresAuth: true/,
  'unauthenticated checkout attempts should route to signup instead of a dead checkout tab'
);

console.log('Critical bug fix guardrails passed');
