import { readFileSync } from 'node:fs';

const endpointSource = readFileSync('api/submit-cancellation-feedback.js', 'utf8');
const modalSource = readFileSync('src/components/CancelSubscriptionModal.jsx', 'utf8');
const feedbackInsertIndex = endpointSource.indexOf("from('cancellation_feedback').insert({");
const feedbackInsertSource = feedbackInsertIndex >= 0
  ? endpointSource.slice(feedbackInsertIndex, endpointSource.indexOf('});', feedbackInsertIndex))
  : '';

const assertions = [
  {
    ok: endpointSource.includes("import { authenticateBillingRequest } from './_utils/billing.js';"),
    message: 'Endpoint imports shared billing authentication helper',
  },
  {
    ok: endpointSource.includes('const authResult = await authenticateBillingRequest(req, supabase);'),
    message: 'Endpoint authenticates the bearer token before reading body user_id',
  },
  {
    ok: endpointSource.includes('requestedUserId && requestedUserId !== authenticatedUserId'),
    message: 'Endpoint rejects mismatched client-supplied user_id values',
  },
  {
    ok: endpointSource.includes(".eq('user_id', authenticatedUserId)") &&
      !endpointSource.includes(".eq('user_id', user_id)"),
    message: 'Endpoint duplicate check is bound to authenticated user id',
  },
  {
    ok: endpointSource.includes('user_id: authenticatedUserId') &&
      !feedbackInsertSource.includes('user_id,'),
    message: 'Endpoint inserts feedback for authenticated user id only',
  },
  {
    ok: modalSource.includes("import { supabase } from '../config/supabase';"),
    message: 'Modal can read the Supabase session for feedback auth',
  },
  {
    ok: modalSource.includes("Authorization: `Bearer ${session.access_token}`"),
    message: 'Modal forwards bearer auth to cancellation feedback endpoint',
  },
];

const failures = assertions.filter(({ ok }) => !ok);

if (failures.length > 0) {
  console.error('Cancellation feedback auth verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure.message}`);
  }
  process.exit(1);
}

console.log('Cancellation feedback auth verification passed.');
