import assert from 'node:assert/strict';
import test from 'node:test';

import stripeSessionDetailsHandler from '../stripe-session-details.js';
import {
  buildPublicSessionDetails,
  checkoutSessionBelongsToUser,
} from '../_utils/stripe-session-details.js';

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

test('buildPublicSessionDetails returns only non-sensitive checkout fields', () => {
  const result = buildPublicSessionDetails({
    amount_total: 9900,
    currency: 'usd',
    metadata: { tier: 'Pro' },
    customer_email: 'private@example.com',
    customer_details: { email: 'private@example.com' },
  });

  assert.deepEqual(result, {
    amount_total: 9900,
    currency: 'usd',
    tier_name: 'Pro',
  });
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'customer_email'), false);
});

test('buildPublicSessionDetails applies safe defaults', () => {
  const result = buildPublicSessionDetails({});

  assert.deepEqual(result, {
    amount_total: 0,
    currency: 'usd',
    tier_name: null,
  });
});

test('checkoutSessionBelongsToUser matches client_reference_id', () => {
  assert.equal(
    checkoutSessionBelongsToUser(
      { client_reference_id: 'user-1', metadata: {} },
      { userId: 'user-1', stripeCustomerId: null }
    ),
    true
  );
});

test('checkoutSessionBelongsToUser matches metadata.supabase_user_id', () => {
  assert.equal(
    checkoutSessionBelongsToUser(
      { metadata: { supabase_user_id: 'user-1' } },
      { userId: 'user-1', stripeCustomerId: 'cus_other' }
    ),
    true
  );
});

test('checkoutSessionBelongsToUser matches stored Stripe customer id', () => {
  assert.equal(
    checkoutSessionBelongsToUser(
      { customer: 'cus_abc', metadata: {} },
      { userId: 'user-1', stripeCustomerId: 'cus_abc' }
    ),
    true
  );
});

test('checkoutSessionBelongsToUser rejects another user identity binding', () => {
  assert.equal(
    checkoutSessionBelongsToUser(
      { client_reference_id: 'user-2', customer: 'cus_abc', metadata: {} },
      { userId: 'user-1', stripeCustomerId: 'cus_abc' }
    ),
    false
  );
});

test('checkoutSessionBelongsToUser rejects unowned sessions with no binding', () => {
  assert.equal(
    checkoutSessionBelongsToUser(
      { customer: 'cus_other', metadata: {} },
      { userId: 'user-1', stripeCustomerId: null }
    ),
    false
  );
});

test('GET /api/stripe-session-details without Authorization returns 401', async () => {
  const req = {
    method: 'GET',
    headers: {},
    query: { session_id: 'cs_test_anyone' },
  };
  const res = createMockRes();
  await stripeSessionDetailsHandler(req, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body?.error, 'Authentication required');
  assert.equal(res.body?.customer_email, undefined);
  assert.equal(res.body?.amount_total, undefined);
});

test('GET /api/stripe-session-details with a non-bearer token returns 401', async () => {
  const req = {
    method: 'GET',
    headers: { authorization: 'Basic abc' },
    query: { session_id: 'cs_test_anyone' },
  };
  const res = createMockRes();
  await stripeSessionDetailsHandler(req, res);
  assert.equal(res.statusCode, 401);
});
