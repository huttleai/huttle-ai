// Temporary audit helper: dumps QA user's rows across feature tables.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const uid = '7d786099-a637-46bb-83e7-b6c65539e2ac';

const tables = process.argv.slice(2).length ? process.argv.slice(2) : ['users', 'user_preferences', 'jobs', 'content_library', 'user_activity'];
for (const t of tables) {
  const col = t === 'users' ? 'id' : 'user_id';
  const { data, error } = await supabase.from(t).select('*').eq(col, uid).order('created_at', { ascending: false }).limit(5);
  console.log(`\n== ${t} ==`);
  if (error) console.log('ERROR', error.message);
  else console.log(JSON.stringify(data, null, 1).slice(0, 3000));
}
