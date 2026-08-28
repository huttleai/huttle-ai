// Temporary audit helper: creates an isolated QA test user + pro subscription.
// Delete this user after the audit (see scripts/audit-cleanup-test-user.mjs).
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const email = 'qa-audit-2026@huttleai.com';
const password = 'HuttleQA!2026#audit';

const { data: created, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: 'QA Audit' },
});
if (error) { console.log('createUser error:', error.message); process.exit(1); }
const uid = created.user.id;
console.log('created auth user', uid);

const { error: uErr } = await supabase.from('users').upsert({
  id: uid,
  email,
  full_name: 'QA Audit',
  subscription_tier: 'pro',
  onboarding_completed: true,
}, { onConflict: 'id' });
console.log('users row:', uErr ? uErr.message : 'ok');

const { error: sErr } = await supabase.from('subscriptions').upsert({
  user_id: uid,
  tier: 'pro',
  status: 'active',
  current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
}, { onConflict: 'user_id' });
console.log('subscriptions row:', sErr ? sErr.message : 'ok');
