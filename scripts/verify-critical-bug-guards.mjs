import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function readWorkspaceFile(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const usageAlertEndpoint = readWorkspaceFile('api/emails/send-usage-alert-trigger.js');
assert.match(usageAlertEndpoint, /parseBearerToken/);
assert.match(usageAlertEndpoint, /supabase\.auth\.getUser\(token\)/);
assert.match(usageAlertEndpoint, /requestedUserId !== user\.id/);
assert.doesNotMatch(usageAlertEndpoint, /auth\.admin\.getUserById/);
assert.doesNotMatch(usageAlertEndpoint, /json\(\{\s*sent:\s*true,\s*email/);

const usageHook = readWorkspaceFile('src/hooks/useAIUsage.js');
assert.match(usageHook, /send-usage-alert-trigger/);
assert.match(usageHook, /Authorization:\s*`Bearer \$\{session\.access_token\}`/);

const cancellationFeedbackEndpoint = readWorkspaceFile('api/submit-cancellation-feedback.js');
assert.match(cancellationFeedbackEndpoint, /authenticateBillingRequest/);
assert.match(cancellationFeedbackEndpoint, /requestedUserId && requestedUserId !== authResult\.user\.id/);
assert.match(cancellationFeedbackEndpoint, /const userId = authResult\.user\.id/);
assert.doesNotMatch(cancellationFeedbackEndpoint, /Missing required fields: user_id/);

const cancellationModal = readWorkspaceFile('src/components/CancelSubscriptionModal.jsx');
assert.match(cancellationModal, /Authorization:\s*`Bearer \$\{session\.access_token\}`/);

const planBuilder = readWorkspaceFile('src/pages/AIPlanBuilder.jsx');
const usageIndex = planBuilder.indexOf('const usage = await planUsage.trackFeatureUsage');
const usageGuardIndex = planBuilder.indexOf('if (!usage.allowed)', usageIndex);
const webhookIndex = planBuilder.indexOf('triggerN8nWebhook', usageGuardIndex);
assert.ok(usageIndex > -1, 'Plan Builder must track usage before n8n trigger');
assert.ok(usageGuardIndex > usageIndex, 'Plan Builder must check the usage result');
assert.ok(webhookIndex > usageGuardIndex, 'Plan Builder usage guard must run before n8n trigger');
assert.doesNotMatch(
  planBuilder.slice(usageIndex, usageGuardIndex),
  /incrementFeatureCounter:\s*false/,
  'Plan Builder direct path must increment the monthly run counter'
);

const trialReminderUtils = readWorkspaceFile('api/_utils/trialReminderUtils.js');
const trialReminderMigration = readWorkspaceFile(
  'supabase/migrations/20260622110000_allow_trial_3_day_reminders.sql'
);
assert.match(trialReminderUtils, /trial_3_days/);
assert.match(trialReminderMigration, /trial_3_days/);
assert.doesNotMatch(trialReminderMigration, /trial_2_days/);

process.stdout.write('Critical bug guard checks passed\n');
