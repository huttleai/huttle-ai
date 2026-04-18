import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPublicSessionDetails } from '../_utils/stripe-session-details.js';

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
