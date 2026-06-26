import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function assertIncludes(content, needle, message) {
  if (!content.includes(needle)) {
    throw new Error(message);
  }
}

function assertNotIncludes(content, needle, message) {
  if (content.includes(needle)) {
    throw new Error(message);
  }
}

const usageAlert = read('api/emails/send-usage-alert-trigger.js');
assertIncludes(
  usageAlert,
  'parseBearerToken(req.headers.authorization)',
  'usage-alert trigger must require a bearer token'
);
assertIncludes(
  usageAlert,
  'supabase.auth.getUser(token)',
  'usage-alert trigger must bind user_id from the bearer token'
);
assertNotIncludes(
  usageAlert,
  'json({ sent: true, email',
  'usage-alert trigger must not return the recipient email'
);

const cancellationFeedback = read('api/submit-cancellation-feedback.js');
assertIncludes(
  cancellationFeedback,
  'parseBearerToken(req.headers.authorization)',
  'cancellation feedback must require a bearer token'
);
assertIncludes(
  cancellationFeedback,
  'supabase.auth.getUser(token)',
  'cancellation feedback must bind user_id from the bearer token'
);
assertNotIncludes(
  cancellationFeedback,
  '.eq(\'user_id\', user_id)',
  'cancellation feedback must not trust body user_id for duplicate checks'
);

const cancelModal = read('src/components/CancelSubscriptionModal.jsx');
assertIncludes(
  cancelModal,
  'headers.Authorization = `Bearer ${session.access_token}`',
  'cancellation feedback caller must forward the Supabase bearer token'
);

const useAIUsage = read('src/hooks/useAIUsage.js');
assertIncludes(
  useAIUsage,
  'headers.Authorization = `Bearer ${session.access_token}`',
  'usage-alert caller must forward the Supabase bearer token'
);
assertIncludes(
  useAIUsage,
  "return { allowed: false, reason: 'track_failed'",
  'usage tracking write failures must fail closed'
);

const stripeSessionDetails = read('api/stripe-session-details.js');
assertNotIncludes(
  stripeSessionDetails,
  'customer_email',
  'stripe session details must not expose customer email'
);

const planBuilder = read('src/pages/AIPlanBuilder.jsx');
assertNotIncludes(
  planBuilder,
  'incrementFeatureCounter: false',
  'Plan Builder live path must not disable run-counter tracking'
);
assertIncludes(
  planBuilder,
  'const usageResult = await planUsage.trackFeatureUsage',
  'Plan Builder must inspect usage tracking result before firing n8n'
);
assertIncludes(
  planBuilder,
  'if (!usageResult?.allowed)',
  'Plan Builder must stop when usage tracking is rejected'
);

console.info('critical bug guards passed');
