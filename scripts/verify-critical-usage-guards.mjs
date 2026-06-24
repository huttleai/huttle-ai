import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const usageAlertTrigger = read('api/emails/send-usage-alert-trigger.js');
assert.match(usageAlertTrigger, /parseBearerToken/);
assert.match(usageAlertTrigger, /supabase\.auth\.getUser\(token\)/);
assert.match(usageAlertTrigger, /requestedUserId && requestedUserId !== user\.id/);
assert.doesNotMatch(usageAlertTrigger, /json\(\{ sent: true, email,/);

const useAiUsage = read('src/hooks/useAIUsage.js');
assert.match(useAiUsage, /Authorization: `Bearer \$\{session\.access_token\}`/);
assert.match(useAiUsage, /if \(!trackedRun\) \{/);
assert.match(useAiUsage, /if \(!trackedCredit\) \{/);

const aiPlanBuilder = read('src/pages/AIPlanBuilder.jsx');
assert.doesNotMatch(aiPlanBuilder, /incrementFeatureCounter:\s*false/);
assert.match(aiPlanBuilder, /job_id: jobId/);
assert.match(aiPlanBuilder, /if \(!usageResult\.allowed\) \{/);

const planBuilderProxy = read('api/plan-builder-proxy.js');
assert.match(planBuilderProxy, /PLAN_BUILDER_14DAY_ALLOWED_TIERS/);
assert.match(planBuilderProxy, /\.eq\('user_id', user\.id\)/);
assert.match(planBuilderProxy, /\.contains\('metadata', \{ job_id \}\)/);
assert.match(planBuilderProxy, /jobCreditReservations/);
assert.match(planBuilderProxy, /timePeriod: planPeriod/);

console.log('Critical usage guard checks passed.');
