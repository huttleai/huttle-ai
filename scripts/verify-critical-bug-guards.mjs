import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function assertIncludes(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

function assertNotIncludes(source, needle, message) {
  if (source.includes(needle)) {
    throw new Error(message);
  }
}

const usageAlert = read('api/emails/send-usage-alert-trigger.js');
assertIncludes(
  usageAlert,
  "import { authenticateBillingRequest } from '../_utils/billing.js';",
  'usage alert trigger must import shared bearer auth'
);
assertIncludes(
  usageAlert,
  'const authResult = await authenticateBillingRequest(req, supabase);',
  'usage alert trigger must authenticate the caller'
);
assertIncludes(
  usageAlert,
  'if (userId !== authenticatedUserId)',
  'usage alert trigger must reject cross-user requests'
);
assertNotIncludes(
  usageAlert,
  'sent: true, email',
  'usage alert trigger must not return target email addresses'
);

const usageHook = read('src/hooks/useAIUsage.js');
assertIncludes(
  usageHook,
  'await supabase.auth.getSession()',
  'useAIUsage must fetch the active session before triggering usage alert email'
);
assertIncludes(
  usageHook,
  'Authorization: `Bearer ${session.access_token}`',
  'useAIUsage must forward a bearer token to the usage alert trigger'
);

const planBuilderProxy = read('api/plan-builder-proxy.js');
assertIncludes(
  planBuilderProxy,
  "from('jobs')",
  'Plan Builder proxy must validate job ownership'
);
assertIncludes(
  planBuilderProxy,
  ".eq('user_id', user.id)",
  'Plan Builder proxy must bind job and subscription checks to the authenticated user'
);
assertIncludes(
  planBuilderProxy,
  'resolvePlanBuilderCap(timePeriod, userTier)',
  'Plan Builder proxy must enforce per-period run caps server-side'
);
assertIncludes(
  planBuilderProxy,
  "feature: 'aiGenerations'",
  'Plan Builder proxy must reserve shared AI credits server-side'
);
assertIncludes(
  planBuilderProxy,
  'cleanupPlanBuilderReservation({ userId: user.id, jobId: job_id, requestId })',
  'Plan Builder proxy must clean up usage reservations when n8n handoff fails'
);

const aiPlanBuilder = read('src/pages/AIPlanBuilder.jsx');
assertNotIncludes(
  aiPlanBuilder,
  'incrementFeatureCounter: false',
  'AIPlanBuilder must not bypass Plan Builder run-counter writes on the active path'
);
assertNotIncludes(
  aiPlanBuilder,
  'downstream failure (webhook, n8n crash, timeout) remains',
  'AIPlanBuilder must not intentionally keep no-refund downstream failure behavior'
);

console.log('Critical bug guard checks passed.');
