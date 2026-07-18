// Temporary audit helper: probes public tables via service role (keys never printed).
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tables = [
  'users', 'subscriptions', 'profiles', 'user_preferences', 'jobs',
  'content_library', 'post_kits', 'post_kit_slots', 'daily_dashboard_cache',
  'niche_content_cache', 'cancellation_feedback', 'dm_leads',
  'brand_voice_profiles', 'user_activity', 'notifications', 'waitlist',
];

for (const t of tables) {
  const { data, error, count } = await supabase.from(t).select('*', { count: 'exact', head: false }).limit(1);
  if (error) {
    console.log(`${t}: ERROR ${error.code || ''} ${error.message}`);
  } else {
    const cols = data?.[0] ? Object.keys(data[0]).join(', ') : '(no rows)';
    console.log(`${t}: ok, count=${count}, cols=${cols}`);
  }
}
