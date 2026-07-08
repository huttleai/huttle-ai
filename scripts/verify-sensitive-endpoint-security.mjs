import fs from 'node:fs';
import path from 'node:path';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const usageAlertApi = read('api/emails/send-usage-alert-trigger.js');
assert(
  usageAlertApi.includes('authenticateBillingRequest(req, supabase)'),
  'usage alert trigger must authenticate the caller',
);
assert(
  usageAlertApi.includes('requestedUserId !== authResult.user.id'),
  'usage alert trigger must reject cross-user requests',
);
assert(
  !usageAlertApi.includes('json({ sent: true, email'),
  'usage alert trigger response must not expose recipient email',
);

const usageAlertCaller = read('src/hooks/useAIUsage.js');
assert(
  usageAlertCaller.includes('supabase.auth.getSession()') &&
    usageAlertCaller.includes('Authorization: `Bearer ${session.access_token}`'),
  'usage alert caller must send the Supabase access token',
);

const cancellationFeedbackApi = read('api/submit-cancellation-feedback.js');
assert(
  cancellationFeedbackApi.includes('authenticateBillingRequest(req, supabase)'),
  'cancellation feedback endpoint must authenticate the caller',
);
assert(
  cancellationFeedbackApi.includes('requestedUserId !== authResult.user.id'),
  'cancellation feedback endpoint must reject cross-user requests',
);
assert(
  cancellationFeedbackApi.includes('const user_id = authResult.user.id'),
  'cancellation feedback endpoint must bind inserts to the authenticated user',
);

const cancellationFeedbackCaller = read('src/components/CancelSubscriptionModal.jsx');
assert(
  cancellationFeedbackCaller.includes('supabase.auth.getSession()') &&
    cancellationFeedbackCaller.includes('Authorization: `Bearer ${session.access_token}`'),
  'cancellation feedback caller must send the Supabase access token',
);

const stripeSessionDetails = read('api/stripe-session-details.js');
assert(
  !stripeSessionDetails.includes('customer_email') &&
    !stripeSessionDetails.includes('customerEmail'),
  'public Stripe session details response must not expose customer email',
);

console.log('verify-sensitive-endpoint-security: OK');
