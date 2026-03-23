#!/usr/bin/env node
/**
 * Offline reliability checks (plan result coercion, tier mirrors).
 * Run: npm run qa:reliability
 */

import { normalizePlanResultShape, coercePlanJobResult } from '../src/utils/planBuilderJobResult.js';
import { PLAN_BUILDER_MONTHLY_BY_TIER } from '../api/_utils/planBuilderLimits.js';

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

  assert(PLAN_BUILDER_MONTHLY_BY_TIER.pro === 20 && PLAN_BUILDER_MONTHLY_BY_TIER.essentials === 20, 'plan builder caps');

  console.log('✓ Plan builder job result coercion');
  console.log('✓ Plan builder server tier caps (20/mo essentials & pro family)');
  console.log('\nAll reliability checks passed.');
}

try {
  run();
} catch (e) {
  console.error('\nRELIABILITY QA FAILED:', e.message);
  process.exit(1);
}
