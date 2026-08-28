import assert from 'node:assert/strict';
import test from 'node:test';

import cancellationFeedbackHandler from '../submit-cancellation-feedback.js';
import {
  authenticateBillingRequest,
  getMismatchedBodyUserIdError,
} from '../_utils/billing.js';

function createMockRes() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    },
  };
}

test('getMismatchedBodyUserIdError ignores omitted user_id', () => {
  assert.equal(getMismatchedBodyUserIdError({ reason: 'other' }, 'user-1'), null);
});

test('getMismatchedBodyUserIdError allows matching user_id', () => {
  assert.equal(getMismatchedBodyUserIdError({ user_id: 'user-1' }, 'user-1'), null);
});

test('getMismatchedBodyUserIdError rejects a spoofed user_id', () => {
  const result = getMismatchedBodyUserIdError({ user_id: 'victim' }, 'user-1');
  assert.equal(result.statusCode, 403);
  assert.match(result.error, /does not match/);
});

test('getMismatchedBodyUserIdError rejects a spoofed camelCase userId', () => {
  const result = getMismatchedBodyUserIdError({ userId: 'victim' }, 'user-1');
  assert.equal(result.statusCode, 403);
});

test('POST /api/submit-cancellation-feedback without Authorization returns 401', async () => {
  const req = {
    method: 'POST',
    headers: {},
    body: { reason: 'too_expensive', user_id: 'victim-uuid' },
  };
  const res = createMockRes();
  await cancellationFeedbackHandler(req, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body?.error, 'Authentication required');
});

test('POST /api/submit-cancellation-feedback with empty Authorization returns 401', async () => {
  const req = {
    method: 'POST',
    headers: { authorization: '' },
    body: { user_id: '00000000-0000-0000-0000-000000000001', reason: 'other' },
  };
  const res = createMockRes();
  await cancellationFeedbackHandler(req, res);
  assert.equal(res.statusCode, 401);
});

test('spoofed body user_id is 403 after a successful token auth', async () => {
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'caller-1' } }, error: null }),
    },
  };
  const auth = await authenticateBillingRequest(
    { headers: { authorization: 'Bearer valid-token' } },
    supabase
  );
  assert.equal(auth.user.id, 'caller-1');
  const mismatch = getMismatchedBodyUserIdError(
    { user_id: 'victim-uuid', reason: 'too_expensive' },
    auth.user.id
  );
  assert.equal(mismatch.statusCode, 403);
  assert.match(mismatch.error, /does not match/);
});
