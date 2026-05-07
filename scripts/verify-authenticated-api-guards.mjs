import assert from 'node:assert/strict';

const AUTH_USER_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000002';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-for-auth-guard-test';

function createResponse() {
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
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };

  return response;
}

async function exerciseHandler(handler, { body, authorization }) {
  const req = {
    method: 'POST',
    headers: authorization ? { authorization } : {},
    body,
  };
  const res = createResponse();

  await handler(req, res);

  return res;
}

globalThis.fetch = async (url) => {
  const requestUrl = String(url);

  if (requestUrl.includes('/auth/v1/user')) {
    return new Response(JSON.stringify({
      id: AUTH_USER_ID,
      email: 'user@example.com',
      aud: 'authenticated',
      role: 'authenticated',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  throw new Error(`Unexpected network call in auth guard verification: ${requestUrl}`);
};

const { default: usageAlertHandler } = await import('../api/emails/send-usage-alert-trigger.js');
const { default: cancellationFeedbackHandler } = await import('../api/submit-cancellation-feedback.js');

const unauthenticatedUsageAlert = await exerciseHandler(usageAlertHandler, {
  body: { userId: AUTH_USER_ID },
});
assert.equal(unauthenticatedUsageAlert.statusCode, 401);

const crossUserUsageAlert = await exerciseHandler(usageAlertHandler, {
  authorization: 'Bearer valid-token',
  body: { userId: OTHER_USER_ID },
});
assert.equal(crossUserUsageAlert.statusCode, 403);
assert.ok(!('email' in (crossUserUsageAlert.body ?? {})));

const unauthenticatedFeedback = await exerciseHandler(cancellationFeedbackHandler, {
  body: { user_id: AUTH_USER_ID, reason: 'too_expensive' },
});
assert.equal(unauthenticatedFeedback.statusCode, 401);

const crossUserFeedback = await exerciseHandler(cancellationFeedbackHandler, {
  authorization: 'Bearer valid-token',
  body: { user_id: OTHER_USER_ID, reason: 'too_expensive' },
});
assert.equal(crossUserFeedback.statusCode, 403);

console.info('Authenticated API guard verification passed');
