/**
 * Dev smoke test: same upstream shape as api/ai/grok.js (not the authenticated app proxy).
 * Verifies xAI accepts model + payload so Full Post Builder’s Grok path won’t get GROK_UPSTREAM_INVALID.
 *
 * Usage (from repo root):
 *   node scripts/dev-grok-fullpost-smoke.mjs
 *
 * Requires GROK_API_KEY in .env or environment. Model comes from src/config/grokConfig.js.
 */
import 'dotenv/config';
import { getGrokParams } from '../src/config/grokConfig.js';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

const apiKey = typeof process.env.GROK_API_KEY === 'string' ? process.env.GROK_API_KEY.trim() : '';
if (!apiKey) {
  console.error('Missing GROK_API_KEY');
  process.exit(1);
}

const { model, reasoning_effort } = getGrokParams('fullPostBuilder');
const body = {
  model,
  reasoning_effort,
  temperature: 0.7,
  max_tokens: 512,
  messages: [
    {
      role: 'system',
      content: 'You reply only with a JSON array of 3 short marketing hook strings, no other text.',
    },
    {
      role: 'user',
      content:
        'Respond with a JSON array of 3 short hooks about benefits of microneedling for skincare.',
    },
  ],
};

const res = await fetch(GROK_API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let snippet = text;
try {
  const json = JSON.parse(text);
  snippet = json?.choices?.[0]?.message?.content ?? JSON.stringify(json).slice(0, 400);
} catch {
  snippet = text.slice(0, 500);
}

console.log('model:', model);
console.log('status:', res.status);
console.log('content/snippet:', snippet);

if (!res.ok) {
  process.exit(1);
}
