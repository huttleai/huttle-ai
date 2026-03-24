/**
 * Minimal xAI Grok check (direct API, same env vars as api/ai/grok.js).
 * Fails fast with clear output.
 *
 *   node scripts/dev-test-grok.mjs
 */
import 'dotenv/config';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const DEFAULT_GROK_MODEL = 'grok-4-1-fast-non-reasoning';

function resolveModel() {
  const a = typeof process.env.GROK_CHAT_MODEL === 'string' ? process.env.GROK_CHAT_MODEL.trim() : '';
  const b = typeof process.env.GROK_MODEL === 'string' ? process.env.GROK_MODEL.trim() : '';
  return a || b || DEFAULT_GROK_MODEL;
}

const apiKey = typeof process.env.GROK_API_KEY === 'string' ? process.env.GROK_API_KEY.trim() : '';
if (!apiKey) {
  console.error('[dev-test-grok] FAIL: Missing GROK_API_KEY in .env');
  process.exit(1);
}

const model = resolveModel();
const body = {
  model,
  temperature: 0.3,
  max_completion_tokens: 64,
  messages: [
    { role: 'user', content: 'Reply with exactly: OK' },
  ],
};

console.log('[dev-test-grok] → xAI', { model });

const res = await fetch(GROK_API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let snippet = text.slice(0, 400);
try {
  const json = JSON.parse(text);
  snippet = json?.choices?.[0]?.message?.content ?? JSON.stringify(json).slice(0, 400);
} catch { /* keep raw */ }

console.log('[dev-test-grok] ← status', res.status, snippet ? `body: ${snippet}` : '');

if (!res.ok) {
  console.error('[dev-test-grok] FAIL: upstream error (check key, model id, quota)');
  process.exit(1);
}

console.log('[dev-test-grok] PASS');
