/**
 * HTTP-level checks for the access-control fixes.
 * Spins a tiny Node server that wraps the Vercel handlers directly
 * (no Express CORS overlay) so status codes and ACAO headers are the
 * handlers' own.
 */
import http from 'node:http';
import { once } from 'node:events';
import assert from 'node:assert/strict';

import stripeSessionDetailsHandler from '../api/stripe-session-details.js';
import cancellationFeedbackHandler from '../api/submit-cancellation-feedback.js';
import grokHandler from '../api/ai/grok.js';

function wrap(handler) {
  return async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    let body = {};
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = {};
      }
    }
    const url = new URL(req.url, 'http://127.0.0.1');
    const vercelReq = {
      method: req.method,
      headers: req.headers,
      query: Object.fromEntries(url.searchParams),
      body,
      url: req.url,
    };
    const vercelRes = {
      setHeader(name, value) {
        res.setHeader(name, value);
        return this;
      },
      status(code) {
        res.statusCode = code;
        return this;
      },
      json(data) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return this;
      },
      end() {
        res.end();
        return this;
      },
    };
    await handler(vercelReq, vercelRes);
    if (!res.writableEnded) res.end();
  };
}

const routes = {
  '/api/stripe-session-details': stripeSessionDetailsHandler,
  '/api/submit-cancellation-feedback': cancellationFeedbackHandler,
  '/api/ai/grok': grokHandler,
};

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  const handler = routes[path];
  if (!handler) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }
  await wrap(handler)(req, res);
});

server.listen(0, '127.0.0.1');
await once(server, 'listening');
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

async function call(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    status: response.status,
    json,
    acao: response.headers.get('access-control-allow-origin'),
  };
}

const results = [];

const stripeUnauth = await call('/api/stripe-session-details?session_id=cs_test_anyone');
assert.equal(stripeUnauth.status, 401);
assert.equal(stripeUnauth.json?.error, 'Authentication required');
assert.equal(stripeUnauth.json?.customer_email, undefined);
assert.equal(stripeUnauth.json?.amount_total, undefined);
results.push(`GET /api/stripe-session-details without auth -> ${stripeUnauth.status} ${JSON.stringify(stripeUnauth.json)}`);

const feedbackUnauth = await call('/api/submit-cancellation-feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'too_expensive',
    user_id: '00000000-0000-0000-0000-000000000001',
  }),
});
assert.equal(feedbackUnauth.status, 401);
results.push(`POST /api/submit-cancellation-feedback without auth (spoofed user_id) -> ${feedbackUnauth.status} ${JSON.stringify(feedbackUnauth.json)}`);

const grokEvil = await call('/api/ai/grok', {
  method: 'OPTIONS',
  headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' },
});
assert.notEqual(grokEvil.acao, '*');
assert.equal(grokEvil.acao, null);
results.push(`OPTIONS /api/ai/grok Origin=https://evil.example -> ${grokEvil.status} ACAO=${grokEvil.acao}`);

const grokAllowed = await call('/api/ai/grok', {
  method: 'OPTIONS',
  headers: { Origin: 'https://huttleai.com', 'Access-Control-Request-Method': 'POST' },
});
assert.equal(grokAllowed.acao, 'https://huttleai.com');
results.push(`OPTIONS /api/ai/grok Origin=https://huttleai.com -> ${grokAllowed.status} ACAO=${grokAllowed.acao}`);

const grokPost = await call('/api/ai/grok', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
});
assert.ok(grokPost.status === 401 || grokPost.status === 503);
assert.ok(!grokPost.json?.content);
results.push(`POST /api/ai/grok without auth Origin=evil -> ${grokPost.status} ACAO=${grokPost.acao}`);

server.close();
await once(server, 'close');

console.log(results.join('\n'));
console.log('verify-access-control-http: all checks passed');
