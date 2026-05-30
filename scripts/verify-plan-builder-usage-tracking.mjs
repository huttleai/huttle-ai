/**
 * Guardrail: AI Plan Builder uses the direct Supabase job path in production.
 * That path must reserve both the per-period run counter and credit rows before
 * n8n is triggered, otherwise monthly Plan Builder caps are bypassed.
 *
 * Run: node scripts/verify-plan-builder-usage-tracking.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const planBuilderSource = readFileSync(resolve(root, 'src/pages/AIPlanBuilder.jsx'), 'utf8');
const usageHookSource = readFileSync(resolve(root, 'src/hooks/useAIUsage.js'), 'utf8');

const directJobIndex = planBuilderSource.indexOf('createJobDirectly({');
const usageTrackIndex = planBuilderSource.indexOf('const usageResult = await planUsage.trackFeatureUsage({');
const usageGateIndex = planBuilderSource.indexOf('if (!usageResult.allowed)');
const webhookIndex = planBuilderSource.indexOf('triggerN8nWebhook(jobId,');

assert(directJobIndex !== -1, 'AIPlanBuilder direct job creation was not found');
assert(usageTrackIndex !== -1, 'AIPlanBuilder must capture trackFeatureUsage result');
assert(usageGateIndex > usageTrackIndex, 'AIPlanBuilder must stop when usage tracking rejects');
assert(webhookIndex > usageGateIndex, 'AIPlanBuilder must reserve usage before triggering n8n');

const planBuilderUsageCall = planBuilderSource.slice(
  usageTrackIndex,
  planBuilderSource.indexOf('});', usageTrackIndex) + 3
);

assert(
  !planBuilderUsageCall.includes('incrementFeatureCounter: false'),
  'Plan Builder direct path must not suppress run-counter tracking'
);

assert(
  usageHookSource.includes('const trackedFeature = await trackUsage(user.id, featureName'),
  'useAIUsage must write the feature run-counter row for capped features'
);
assert(
  usageHookSource.includes('if (!trackedFeature)'),
  'useAIUsage must fail closed when the feature run-counter row is not recorded'
);

console.log('verify-plan-builder-usage-tracking: OK');
