/**
 * Minimal Anthropic Messages API check (direct API, same key as api/ai/claude.js).
 * Fails fast with clear output.
 *
 *   node scripts/dev-test-claude.mjs
 */
import 'dotenv/config';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

const apiKey = typeof process.env.ANTHROPIC_API_KEY === 'string' ? process.env.ANTHROPIC_API_KEY.trim() : '';
if (!apiKey) {
  console.error('[dev-test-claude] FAIL: Missing ANTHROPIC_API_KEY in .env');
  process.exit(1);
}

const model =
  (typeof process.env.CLAUDE_TEST_MODEL === 'string' && process.env.CLAUDE_TEST_MODEL.trim())
  || DEFAULT_MODEL;

const body = {
  model,
  max_tokens: 64,
  messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
};

console.log('[dev-test-claude] → Anthropic', { model });

const res = await fetch(ANTHROPIC_API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let snippet = text.slice(0, 500);
try {
  const json = JSON.parse(text);
  snippet = json?.content?.[0]?.text ?? JSON.stringify(json).slice(0, 500);
} catch { /* keep raw */ }

console.log('[dev-test-claude] ← status', res.status, snippet ? `body: ${snippet}` : '');

if (!res.ok) {
  console.error('[dev-test-claude] FAIL: upstream error (check key, model access, billing)');
  process.exit(1);
}

console.log('[dev-test-claude] PASS');
