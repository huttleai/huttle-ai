/**
 * Minimal Perplexity chat completions check (direct API, same key as api/ai/perplexity.js).
 * Fails fast with clear output.
 *
 *   node scripts/dev-test-sonar.mjs
 */
import 'dotenv/config';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const DEFAULT_MODEL = 'sonar';

const apiKey =
  (typeof process.env.PERPLEXITY_API_KEY === 'string' && process.env.PERPLEXITY_API_KEY.trim())
  || (typeof process.env.VITE_PERPLEXITY_API_KEY === 'string' && process.env.VITE_PERPLEXITY_API_KEY.trim())
  || '';

if (!apiKey) {
  console.error('[dev-test-sonar] FAIL: Missing PERPLEXITY_API_KEY (or VITE_PERPLEXITY_API_KEY) in .env');
  process.exit(1);
}

const model =
  (typeof process.env.PERPLEXITY_TEST_MODEL === 'string' && process.env.PERPLEXITY_TEST_MODEL.trim())
  || DEFAULT_MODEL;

const body = {
  model,
  temperature: 0.2,
  max_tokens: 64,
  messages: [{ role: 'user', content: 'Reply with one word only: OK' }],
};

console.log('[dev-test-sonar] → Perplexity', { model });

const res = await fetch(PERPLEXITY_API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let snippet = text.slice(0, 500);
try {
  const json = JSON.parse(text);
  snippet = json?.choices?.[0]?.message?.content ?? JSON.stringify(json).slice(0, 500);
} catch { /* keep raw */ }

console.log('[dev-test-sonar] ← status', res.status, snippet ? `body: ${snippet}` : '');

if (!res.ok) {
  console.error('[dev-test-sonar] FAIL: upstream error (check key, model id, quota)');
  process.exit(1);
}

console.log('[dev-test-sonar] PASS');
