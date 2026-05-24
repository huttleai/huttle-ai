/**
 * Static regression guards for high-severity enforcement paths.
 * Run: node scripts/verify-critical-correctness-guards.mjs
 */

import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const aiPlanBuilder = read('src/pages/AIPlanBuilder.jsx');
assert(
  !aiPlanBuilder.includes('incrementFeatureCounter: false'),
  'AI Plan Builder must not suppress the per-period run counter'
);
assert(
  aiPlanBuilder.includes('const usageResult = await planUsage.trackFeatureUsage') &&
    aiPlanBuilder.includes('!usageResult?.allowed'),
  'AI Plan Builder must stop before n8n when usage tracking rejects the run'
);

const planBuilderProxy = read('api/plan-builder-proxy.js');
assert(
  planBuilderProxy.includes("import { PLAN_BUILDER_14DAY_ALLOWED_TIERS }"),
  'Plan Builder proxy must import server-side 14-day tier allowlist'
);
assert(
  planBuilderProxy.includes(".eq('user_id', user.id)") &&
    planBuilderProxy.includes(".eq('type', 'plan_builder')"),
  'Plan Builder proxy must bind job processing to the authenticated user'
);
assert(
  planBuilderProxy.includes("requestedTimePeriod === '14'") &&
    planBuilderProxy.includes('!PLAN_BUILDER_14DAY_ALLOWED_TIERS.includes(userTier)'),
  'Plan Builder proxy must reject unauthorized 14-day requests server-side'
);

const usageAlertTrigger = read('api/emails/send-usage-alert-trigger.js');
assert(
  usageAlertTrigger.includes('parseBearerToken') &&
    usageAlertTrigger.includes('supabase.auth.getUser(token)') &&
    usageAlertTrigger.includes('requestedUserId !== user.id'),
  'Usage alert trigger must authenticate and bind requested userId'
);

const cancellationFeedback = read('api/submit-cancellation-feedback.js');
assert(
  cancellationFeedback.includes('parseBearerToken') &&
    cancellationFeedback.includes('supabase.auth.getUser(token)') &&
    cancellationFeedback.includes('requestedUserId !== user.id'),
  'Cancellation feedback must authenticate and bind requested userId'
);

const cancelModal = read('src/components/CancelSubscriptionModal.jsx');
assert(
  cancelModal.includes('supabase.auth.getSession()') &&
    cancelModal.includes('Authorization: `Bearer ${session.access_token}`'),
  'Cancellation feedback client must send the Supabase bearer token'
);

const useAIUsage = read('src/hooks/useAIUsage.js');
assert(
  useAIUsage.includes('supabase.auth.getSession()') &&
    useAIUsage.includes('Authorization: `Bearer ${session.access_token}`'),
  'Usage alert client must send the Supabase bearer token'
);

console.log('verify-critical-correctness-guards: OK');
