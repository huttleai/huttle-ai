import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  setCorsHeaders,
  handlePreflight,
  isOriginAllowed,
  identifyTrustedNoOriginCaller,
  TRUSTED_NO_ORIGIN_CALLERS,
} from '../_utils/cors.js';
import grokHandler from '../ai/grok.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function createMockRes() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: undefined,
    ended: false,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test('isOriginAllowed rejects missing Origin (no blanket no-origin allow)', () => {
  assert.equal(isOriginAllowed({ headers: {} }), false);
});

test('isOriginAllowed rejects an attacker origin', () => {
  assert.equal(isOriginAllowed({ headers: { origin: 'https://evil.example' } }), false);
});

test('isOriginAllowed allows the production app origin', () => {
  assert.equal(isOriginAllowed({ headers: { origin: 'https://huttleai.com' } }), true);
});

test('setCorsHeaders does not echo a disallowed origin or *', () => {
  const res = createMockRes();
  const allowed = setCorsHeaders({ headers: { origin: 'https://evil.example' } }, res);
  assert.equal(allowed, false);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});

test('setCorsHeaders reflects an allowlisted origin', () => {
  const res = createMockRes();
  const allowed = setCorsHeaders({ headers: { origin: 'https://www.huttleai.com' } }, res);
  assert.equal(allowed, true);
  assert.equal(res.headers['access-control-allow-origin'], 'https://www.huttleai.com');
  assert.match(res.headers['access-control-allow-headers'], /x-grok-debug/i);
});

test('setCorsHeaders does not set * for no-origin requests', () => {
  const res = createMockRes();
  const allowed = setCorsHeaders({ headers: {} }, res);
  assert.equal(allowed, false);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});

test('identifyTrustedNoOriginCaller names Stripe webhooks and Vercel cron only', () => {
  assert.equal(identifyTrustedNoOriginCaller({ headers: {} }), null);
  assert.equal(
    identifyTrustedNoOriginCaller({ headers: { 'stripe-signature': 't=1,v1=abc' } }),
    TRUSTED_NO_ORIGIN_CALLERS.STRIPE_WEBHOOK
  );
  assert.equal(
    identifyTrustedNoOriginCaller({ headers: { 'x-vercel-cron': '1' } }),
    TRUSTED_NO_ORIGIN_CALLERS.VERCEL_CRON
  );
  assert.equal(
    identifyTrustedNoOriginCaller({
      headers: { origin: 'https://huttleai.com', 'stripe-signature': 't=1,v1=abc' },
    }),
    null
  );
});

test('grok preflight from an attacker origin is not * and is not reflected', async () => {
  const req = { method: 'OPTIONS', headers: { origin: 'https://evil.example' } };
  const res = createMockRes();
  await grokHandler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.ended, true);
  assert.notEqual(res.headers['access-control-allow-origin'], '*');
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});

test('grok preflight from huttleai.com reflects the allowlisted origin', async () => {
  const req = { method: 'OPTIONS', headers: { origin: 'https://huttleai.com' } };
  const res = createMockRes();
  await grokHandler(req, res);
  assert.equal(res.headers['access-control-allow-origin'], 'https://huttleai.com');
  assert.match(String(res.headers['access-control-allow-headers'] || ''), /x-grok-debug/i);
});

test('grok.js source no longer hardcodes Access-Control-Allow-Origin *', () => {
  const grokSrc = readFileSync(join(root, 'api/ai/grok.js'), 'utf8');
  assert.doesNotMatch(grokSrc, /Access-Control-Allow-Origin['",\s]*\*/);
  assert.match(grokSrc, /setCorsHeaders\(req, res\)/);
  assert.match(grokSrc, /handlePreflight\(req, res\)/);
});
