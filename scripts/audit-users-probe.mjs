// Temporary audit helper: lists users + subscription tiers (keys never printed).
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: users, error: uErr } = await supabase
  .from('users')
  .select('id, email, full_name, subscription_tier, onboarding_completed, created_at');
if (uErr) { console.log('users error', uErr.message); process.exit(1); }

const { data: subs } = await supabase
  .from('subscriptions')
  .select('user_id, tier, status, current_period_end, cancel_at_period_end');

for (const u of users) {
  const s = subs?.find((x) => x.user_id === u.id);
  console.log(`${u.email} | ${u.full_name} | users.tier=${u.subscription_tier} | sub=${s ? `${s.tier}/${s.status} end=${s.current_period_end}` : 'none'} | onboarded=${u.onboarding_completed}`);
}
