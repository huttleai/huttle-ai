// Temporary audit helper: signs in as QA user and tests the Claude proxy.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'qa-audit-2026@huttleai.com',
  password: 'HuttleQA!2026#audit',
});
if (error) { console.log('login error:', error.message); process.exit(1); }

const res = await fetch('http://127.0.0.1:3001/api/ai/claude', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.session.access_token}`,
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Reply with the single word OK' }],
    max_tokens: 10,
  }),
});
console.log('status:', res.status);
const body = await res.text();
console.log(body.slice(0, 800));
