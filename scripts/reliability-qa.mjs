#!/usr/bin/env node
/**
 * Offline reliability checks (plan result coercion, tier mirrors).
 * Run: npm run qa:reliability
 */

import { readFileSync } from 'node:fs';
import { normalizePlanResultShape, coercePlanJobResult } from '../src/utils/planBuilderJobResult.js';
import {
  PLAN_BUILDER_7DAY_MONTHLY_BY_TIER,
  PLAN_BUILDER_14DAY_MONTHLY_BY_TIER,
  PLAN_BUILDER_MONTHLY_BY_TIER,
} from '../api/_utils/planBuilderLimits.js';
import { FEATURE_RUN_CAPS } from '../src/config/creditConfig.js';

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

  assert(
    PLAN_BUILDER_7DAY_MONTHLY_BY_TIER.essentials === FEATURE_RUN_CAPS.planBuilder7Day.essentials &&
      PLAN_BUILDER_14DAY_MONTHLY_BY_TIER.essentials === FEATURE_RUN_CAPS.planBuilder14Day.essentials &&
      PLAN_BUILDER_7DAY_MONTHLY_BY_TIER.pro === FEATURE_RUN_CAPS.planBuilder7Day.pro &&
      PLAN_BUILDER_14DAY_MONTHLY_BY_TIER.pro === FEATURE_RUN_CAPS.planBuilder14Day.pro,
    'plan builder server/client caps must match'
  );
  assert(
    PLAN_BUILDER_MONTHLY_BY_TIER.essentials === 3 && PLAN_BUILDER_MONTHLY_BY_TIER.pro === 15,
    'plan builder combined caps'
  );

  const planBuilderSource = readFileSync(new URL('../src/pages/AIPlanBuilder.jsx', import.meta.url), 'utf8');
  assert(
    planBuilderSource.includes('const usageResult = await planUsage.trackFeatureUsage({') &&
      planBuilderSource.includes('jobId,') &&
      !planBuilderSource.includes('incrementFeatureCounter: false'),
    'AI Plan Builder direct job path must write the monthly run-counter row'
  );

  console.log('✓ Plan builder job result coercion');
  console.log('✓ Plan builder server/client tier caps');
  console.log('✓ Plan builder direct job usage tracking');
  console.log('\nAll reliability checks passed.');
}

try {
  run();
} catch (e) {
  console.error('\nRELIABILITY QA FAILED:', e.message);
  process.exit(1);
}
