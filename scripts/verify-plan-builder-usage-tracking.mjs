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
const proxySource = readFileSync(resolve(root, 'api/plan-builder-proxy.js'), 'utf8');
const serviceSource = readFileSync(resolve(root, 'src/services/planBuilderAPI.js'), 'utf8');
const usageHookSource = readFileSync(resolve(root, 'src/hooks/useAIUsage.js'), 'utf8');

const directJobIndex = planBuilderSource.indexOf('createJobDirectly({');
const webhookIndex = planBuilderSource.indexOf('triggerN8nWebhook(jobId,');
const refreshIndex = planBuilderSource.indexOf('await planUsage.refreshUsage();');

assert(directJobIndex !== -1, 'AIPlanBuilder direct job creation was not found');
assert(webhookIndex > directJobIndex, 'AIPlanBuilder must trigger n8n only after job creation');
assert(
  !planBuilderSource.includes('planUsage.trackFeatureUsage({'),
  'Plan Builder usage reservation must happen in the authenticated proxy'
);
assert(refreshIndex > webhookIndex, 'AIPlanBuilder should refresh usage after proxy reservation');

assert(
  proxySource.includes("select('id, user_id, type')") &&
    proxySource.includes('job.user_id !== user.id'),
  'Plan Builder proxy must verify job ownership before n8n'
);
assert(
  proxySource.includes('getActiveSubscription(user.id)') &&
    proxySource.includes('PLAN_BUILDER_14DAY_ALLOWED_TIERS'),
  'Plan Builder proxy must enforce subscription and 14-day tier access'
);
assert(
  proxySource.includes('hasPlanBuilderReservation') &&
    proxySource.includes('reservePlanBuilderUsage') &&
    proxySource.includes("feature: 'aiGenerations'"),
  'Plan Builder proxy must reserve run counter and credit rows before n8n'
);
assert(
  proxySource.indexOf('await reservePlanBuilderUsage({') <
    proxySource.indexOf('const response = await fetch(N8N_WEBHOOK_URL'),
  'Plan Builder proxy must reserve usage before forwarding to n8n'
);
assert(
  serviceSource.includes('terminal: true') && planBuilderSource.includes('if (webhookTerminal)'),
  'Plan Builder client must treat proxy quota/auth rejections as terminal'
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
