import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function assertContains(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label} is missing: ${expected}`);
  }
}

function assertNotContains(source, unexpected, label) {
  if (source.includes(unexpected)) {
    throw new Error(`${label} must not contain: ${unexpected}`);
  }
}

const usageAlertEndpoint = read('api/emails/send-usage-alert-trigger.js');
assertContains(usageAlertEndpoint, 'parseBearerToken', 'usage alert endpoint');
assertContains(usageAlertEndpoint, 'supabase.auth.getUser(token)', 'usage alert endpoint');
assertContains(
  usageAlertEndpoint,
  'requestedUserId && requestedUserId !== user.id',
  'usage alert endpoint'
);
assertContains(usageAlertEndpoint, ".eq('user_id', user.id)", 'usage alert endpoint');
assertContains(usageAlertEndpoint, 'user_id: user.id', 'usage alert endpoint');
assertContains(
  usageAlertEndpoint,
  'return res.status(200).json({ sent: true, planName, creditResetDate, daysUntilReset });',
  'usage alert endpoint'
);
assertNotContains(
  usageAlertEndpoint,
  'return res.status(200).json({ sent: true, email',
  'usage alert endpoint response'
);

const cancellationFeedbackEndpoint = read('api/submit-cancellation-feedback.js');
assertContains(cancellationFeedbackEndpoint, 'parseBearerToken', 'cancellation feedback endpoint');
assertContains(cancellationFeedbackEndpoint, 'supabase.auth.getUser(token)', 'cancellation feedback endpoint');
assertContains(
  cancellationFeedbackEndpoint,
  'requestedUserId && requestedUserId !== user.id',
  'cancellation feedback endpoint'
);
assertContains(cancellationFeedbackEndpoint, ".eq('user_id', user.id)", 'cancellation feedback endpoint');
assertContains(cancellationFeedbackEndpoint, 'user_id: user.id', 'cancellation feedback endpoint');

const usageHook = read('src/hooks/useAIUsage.js');
assertContains(usageHook, "Authorization: `Bearer ${session.access_token}`", 'usage alert caller');

const cancelModal = read('src/components/CancelSubscriptionModal.jsx');
assertContains(cancelModal, "Authorization: `Bearer ${session.access_token}`", 'cancellation feedback caller');

console.log('Sensitive endpoint auth guards passed.');
