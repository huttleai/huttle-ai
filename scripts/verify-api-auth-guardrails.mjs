#!/usr/bin/env node
/**
 * Offline API auth checks for service-role endpoints that accept user IDs.
 * Run: npm run test:api-auth-guardrails
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function callHandler(handler, body) {
  const req = {
    method: 'POST',
    headers: {},
    body,
  };
  const res = createMockResponse();

  await handler(req, res);
  return res;
}

const [{ default: usageAlertHandler }, { default: cancellationFeedbackHandler }] = await Promise.all([
  import('../api/emails/send-usage-alert-trigger.js'),
  import('../api/submit-cancellation-feedback.js'),
]);

const usageAlertResponse = await callHandler(usageAlertHandler, { userId: 'victim-user-id' });
assert(usageAlertResponse.statusCode === 401, 'usage alert trigger must reject missing auth');

const cancellationFeedbackResponse = await callHandler(cancellationFeedbackHandler, {
  user_id: 'victim-user-id',
  reason: 'too_expensive',
});
assert(cancellationFeedbackResponse.statusCode === 401, 'cancellation feedback must reject missing auth');

const usageAlertSource = await readFile(
  resolve(repoRoot, 'api/emails/send-usage-alert-trigger.js'),
  'utf8'
);
assert(
  !usageAlertSource.includes('json({ sent: true, email'),
  'usage alert trigger must not expose recipient email in the API response'
);

console.log('verify-api-auth-guardrails: OK');
