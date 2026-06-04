import assert from 'node:assert/strict';

import { assessPlanBuilderProxyAccess } from '../api/plan-builder-proxy.js';

const userId = 'user-1';
const ownJob = { id: 'job-1', user_id: userId, type: 'plan_builder' };

const cases = [
  {
    name: 'rejects cross-user job trigger',
    input: {
      userId,
      job: { ...ownJob, user_id: 'user-2' },
      subscription: { tier: 'pro', status: 'active' },
      period: 7,
      usageCount: 0,
    },
    expected: { allowed: false, statusCode: 403 },
  },
  {
    name: 'rejects users without active paid subscription',
    input: {
      userId,
      job: ownJob,
      subscription: null,
      period: 7,
      usageCount: 0,
    },
    expected: { allowed: false, statusCode: 403 },
  },
  {
    name: 'rejects essentials 14-day plan trigger',
    input: {
      userId,
      job: ownJob,
      subscription: { tier: 'essentials', status: 'active' },
      period: 14,
      usageCount: 0,
    },
    expected: { allowed: false, statusCode: 403, error: 'tier_restricted' },
  },
  {
    name: 'rejects when monthly run cap is reached',
    input: {
      userId,
      job: ownJob,
      subscription: { tier: 'essentials', status: 'active' },
      period: 7,
      usageCount: 3,
    },
    expected: { allowed: false, statusCode: 429, limit: 3 },
  },
  {
    name: 'allows owned active pro 14-day job under cap',
    input: {
      userId,
      job: ownJob,
      subscription: { tier: 'pro', status: 'active' },
      period: 14,
      usageCount: 4,
    },
    expected: { allowed: true, featureKey: 'planBuilder14Day', cap: 5 },
  },
];

for (const testCase of cases) {
  const result = assessPlanBuilderProxyAccess(testCase.input);

  for (const [key, value] of Object.entries(testCase.expected)) {
    assert.equal(
      result[key],
      value,
      `${testCase.name}: expected ${key}=${value}, got ${result[key]}`
    );
  }
}

console.info(`Verified ${cases.length} Plan Builder proxy access scenarios.`);
