import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const planBuilderPage = read('src/pages/AIPlanBuilder.jsx');
const planBuilderProxy = read('api/plan-builder-proxy.js');
const planBuilderService = read('src/services/planBuilderAPI.js');
const usageAlertEndpoint = read('api/emails/send-usage-alert-trigger.js');
const usageHook = read('src/hooks/useAIUsage.js');

const createJobIndex = planBuilderPage.indexOf('createJobDirectly({');
const triggerProxyIndex = planBuilderPage.indexOf('triggerN8nWebhook(jobId,');
const reserveUsageIndex = planBuilderProxy.indexOf('await reservePlanBuilderUsage({');
const triggerN8nIndex = planBuilderProxy.indexOf('const response = await fetch(N8N_WEBHOOK_URL');

assert(createJobIndex >= 0, 'The live Plan Builder page must create a queued job.');
assert(
  triggerProxyIndex > createJobIndex,
  'The live Plan Builder page must call the authenticated proxy after job creation.'
);
assert.doesNotMatch(
  planBuilderPage,
  /planUsage\.trackFeatureUsage\(\{/,
  'The Plan Builder page must not perform client authoritative metering.'
);
assert.match(
  planBuilderPage,
  /await planUsage\.refreshUsage\(\)/,
  'The Plan Builder page must refresh server recorded usage.'
);

assert.match(
  planBuilderProxy,
  /\.select\('id, user_id, type, status, input'\)/,
  'The proxy must load the job ownership, type, status, and input.'
);
assert.match(
  planBuilderProxy,
  /\.eq\('user_id', user\.id\)/,
  'The proxy must scope the job to the authenticated user.'
);
assert.match(
  planBuilderProxy,
  /\.eq\('type', 'plan_builder'\)[\s\S]*?\.eq\('status', 'queued'\)/,
  'The proxy claim must only transition a queued Plan Builder job.'
);
assert.match(
  planBuilderProxy,
  /\.update\(\{ status: 'running', started_at: now \}\)/,
  'The proxy must atomically claim the queued job before reservation.'
);
assert.match(
  planBuilderProxy,
  /reservation_index: 'run'/,
  'The reservation must include a deterministic run index.'
);
assert.match(
  planBuilderProxy,
  /reservation_index: `credit:\$\{creditIndex\}`/,
  'Every credit reservation must include a deterministic credit index.'
);
assert.match(
  planBuilderProxy,
  /supabase\.from\('user_activity'\)\.insert\(rows\)/,
  'The run and credit reservations must use one atomic bulk insert.'
);
assert(
  reserveUsageIndex >= 0 && triggerN8nIndex > reserveUsageIndex,
  'The proxy must reserve usage before triggering n8n.'
);
assert.match(
  planBuilderProxy,
  /job\.status === 'running'[\s\S]*?alreadyStarted: true/,
  'A retry for an accepted running job must not replay n8n.'
);

assert.match(
  planBuilderService,
  /terminal: isTerminal/,
  'The Plan Builder client must distinguish terminal proxy rejections.'
);

assert.match(
  usageAlertEndpoint,
  /authenticateBillingRequest\(req, supabase\)/,
  'The usage alert endpoint must authenticate the bearer token.'
);
assert.match(
  usageAlertEndpoint,
  /const userId = authResult\.user\.id/,
  'The usage alert endpoint must derive userId from the authenticated user.'
);
assert.doesNotMatch(
  usageAlertEndpoint,
  /req\.body/,
  'The usage alert endpoint must ignore all client supplied identity fields.'
);
assert.doesNotMatch(
  usageAlertEndpoint,
  /json\(\{\s*sent:\s*true,\s*email/,
  'The usage alert response must not expose email or other PII.'
);
assert.match(
  usageHook,
  /Authorization: `Bearer \$\{session\.access_token\}`/,
  'The usage alert caller must send the authenticated bearer token.'
);
assert.doesNotMatch(
  usageHook,
  /JSON\.stringify\(\{ userId: user\.id \}\)/,
  'The usage alert caller must not send a client controlled userId.'
);

console.info('Plan Builder metering and usage alert guards passed.');
