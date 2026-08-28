#!/usr/bin/env node
/**
 * Offline reliability checks (plan result coercion, tier mirrors).
 * Run: npm run qa:reliability
 */

import { normalizePlanResultShape, coercePlanJobResult } from '../src/utils/planBuilderJobResult.js';
import { PLAN_BUILDER_MONTHLY_BY_TIER } from '../api/_utils/planBuilderLimits.js';
import {
  GENERATING_ACCESS_STATUSES,
  READ_ONLY_STATUSES,
  isGeneratingAccessStatus,
  isReadOnlyStatus,
  isPaymentRetryStatus,
} from '../src/config/subscriptionAccess.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function run() {
  console.log('Reliability harness — offline checks\n');

  const nestedString = JSON.stringify({
    output: {
      plan: {
        platforms: ['Instagram', 'TikTok'],
        content_mix: { educational: 50, entertaining: 30, promotional: 20 },
        schedule: [{ day: 1, posts: [{ topic: 'Launch teaser', platform: 'Instagram' }] }],
      },
    },
  });

  const coerced = coercePlanJobResult(nestedString);
  assert(coerced && Array.isArray(coerced.schedule), 'coercePlanJobResult should unwrap nested JSON');
  const validated = normalizePlanResultShape(nestedString);
  assert(validated.isValid && validated.plan?.schedule?.length === 1, 'normalizePlanResultShape should accept snake_case mix + schedule');

  assert(PLAN_BUILDER_MONTHLY_BY_TIER.pro === 20, 'plan builder caps');
  assert(PLAN_BUILDER_MONTHLY_BY_TIER.essentials === 3, 'plan builder essentials cap');

  assert(
    GENERATING_ACCESS_STATUSES.join(',') === 'active,trialing,past_due',
    'generating access continues through Smart Retry past_due only'
  );
  assert(
    !GENERATING_ACCESS_STATUSES.includes('unpaid'),
    'unpaid must not keep generating access'
  );
  assert(
    READ_ONLY_STATUSES.includes('unpaid') &&
      READ_ONLY_STATUSES.includes('canceled') &&
      READ_ONLY_STATUSES.includes('cancelled') &&
      READ_ONLY_STATUSES.includes('expired'),
    'unpaid uses the same read-only lapse UI as canceled/expired'
  );
  assert(
    GENERATING_ACCESS_STATUSES.every((status) => !READ_ONLY_STATUSES.includes(status)),
    'generating and read-only status lists must not overlap'
  );
  assert(isGeneratingAccessStatus('past_due'), 'past_due keeps generating during Smart Retry');
  assert(!isGeneratingAccessStatus('unpaid'), 'unpaid cuts generating access');
  assert(!isGeneratingAccessStatus('canceled'), 'canceled cuts generating access');
  assert(isReadOnlyStatus('unpaid'), 'unpaid is read-only');
  assert(!isReadOnlyStatus('past_due'), 'past_due is not read-only');
  assert(isPaymentRetryStatus('past_due') && isPaymentRetryStatus('unpaid'), 'payment retry covers past_due and unpaid');

  console.log('✓ Plan builder job result coercion');
  console.log('✓ Plan builder server tier caps (20/mo paying Pro, 3/mo paying Essentials)');
  console.log('✓ Dunning: generating through past_due; unpaid/canceled are read-only');
  console.log('\nAll reliability checks passed.');
}

try {
  run();
} catch (e) {
  console.error('\nRELIABILITY QA FAILED:', e.message);
  process.exit(1);
}
