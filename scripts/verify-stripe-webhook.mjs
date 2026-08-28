/**
 * Stripe webhook reliability checks: raw body, atomic claim, HTTP 500 on failure.
 * Run: node scripts/verify-stripe-webhook.mjs
 */

import { Readable } from 'node:stream';
import Stripe from 'stripe';
import {
  getRawBody,
  claimWebhookEvent,
  releaseWebhookEvent,
  throwIfError,
  verifyAndDispatch,
} from '../api/_utils/stripeWebhook.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function createClaimSupabase({ insertData = null, insertError = null, deleted = [] } = {}) {
  return {
    deleted,
    from(table) {
      assert(table === 'stripe_webhook_events', `unexpected table ${table}`);
      const chain = {
        select() { return chain; },
        eq() { return chain; },
        async maybeSingle() {
          return { data: insertData, error: insertError };
        },
        upsert() { return chain; },
        delete() {
          return {
            async eq(_col, eventId) {
              deleted.push(eventId);
              return { error: null };
            },
          };
        },
      };
      return chain;
    },
  };
}

let passed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`ok  ${name}`);
    })
    .catch((err) => {
      console.error(`fail  ${name}`);
      throw err;
    });
}

const stripe = new Stripe('sk_test_webhook_verify');
const endpointSecret = 'whsec_test_webhook_verify';

function signedEvent({ id = 'evt_test_1', type = 'ping', extra = {} } = {}) {
  const payload = JSON.stringify({
    id,
    object: 'event',
    type,
    data: { object: extra },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: endpointSecret,
  });
  return { payload, signature, id, type };
}

await test('getRawBody reads a Buffer body', async () => {
  const buf = Buffer.from('{"ok":true}');
  const result = await getRawBody({ body: buf });
  assert(Buffer.isBuffer(result) && result.equals(buf), 'expected same buffer');
});

await test('getRawBody reads a string body', async () => {
  const result = await getRawBody({ body: '{"ok":true}' });
  assert(result.toString() === '{"ok":true}', 'expected string bytes');
});

await test('getRawBody reads a Node stream via data/end', async () => {
  const stream = Readable.from([Buffer.from('abc'), Buffer.from('def')]);
  const result = await getRawBody(stream);
  assert(result.toString() === 'abcdef', `got ${result.toString()}`);
});

await test('getRawBody refuses a parsed JSON object', async () => {
  let threw = false;
  try {
    await getRawBody({ body: { id: 'evt_1' } });
  } catch (err) {
    threw = /parsed as JSON/.test(err.message);
  }
  assert(threw, 'parsed objects must not be stringified for Stripe signatures');
});

await test('throwIfError no-ops on null and throws on error objects', () => {
  throwIfError(null, 'nope');
  let threw = false;
  try {
    throwIfError({ message: 'db down' }, 'sync failed');
  } catch (err) {
    threw = err.message === 'sync failed: db down';
  }
  assert(threw, 'expected throwIfError to include the supabase message');
});

await test('claimWebhookEvent treats insert as claimed', async () => {
  const supabase = createClaimSupabase({ insertData: { event_id: 'evt_1' } });
  const result = await claimWebhookEvent(supabase, 'evt_1', 'ping');
  assert(result.claimed === true && result.duplicate === false, 'expected claim win');
});

await test('claimWebhookEvent treats empty upsert as duplicate (conflict no-op)', async () => {
  const supabase = createClaimSupabase({ insertData: null });
  const result = await claimWebhookEvent(supabase, 'evt_1', 'ping');
  assert(result.claimed === false && result.duplicate === true, 'expected duplicate');
});

await test('verifyAndDispatch returns 400 on bad signature', async () => {
  const supabase = createClaimSupabase({ insertData: { event_id: 'evt_x' } });
  const result = await verifyAndDispatch({
    rawBody: Buffer.from('{}'),
    signature: 't=1,v1=deadbeef',
    stripe,
    endpointSecret,
    supabase,
    dispatch: async () => {},
  });
  assert(result.status === 400, `expected 400, got ${result.status}`);
  assert(/Webhook Error/.test(result.body.error), 'expected signature error');
});

await test('verifyAndDispatch returns 200 duplicate when claim loses the race', async () => {
  const { payload, signature } = signedEvent({ id: 'evt_dup' });
  const supabase = createClaimSupabase({ insertData: null });
  let dispatched = false;
  const result = await verifyAndDispatch({
    rawBody: payload,
    signature,
    stripe,
    endpointSecret,
    supabase,
    dispatch: async () => { dispatched = true; },
  });
  assert(result.status === 200 && result.body.duplicate === true, 'expected duplicate 200');
  assert(!dispatched, 'duplicate must not dispatch');
});

await test('verifyAndDispatch returns 500 and releases the claim when dispatch throws', async () => {
  const { payload, signature, id } = signedEvent({
    id: 'evt_fail',
    type: 'checkout.session.completed',
  });
  const supabase = createClaimSupabase({ insertData: { event_id: id } });
  const result = await verifyAndDispatch({
    rawBody: payload,
    signature,
    stripe,
    endpointSecret,
    supabase,
    dispatch: async () => {
      throw new Error('subscription sync failed');
    },
  });
  assert(result.status === 500, `expected 500, got ${result.status}`);
  assert(result.body.error === 'Webhook processing failed', 'expected processing failed body');
  assert(supabase.deleted.includes(id), 'failed processing must release the claim so Stripe can retry');
});

await test('verifyAndDispatch returns 200 after successful dispatch and keeps the claim', async () => {
  const { payload, signature, id } = signedEvent({ id: 'evt_ok', type: 'ping' });
  const supabase = createClaimSupabase({ insertData: { event_id: id } });
  const result = await verifyAndDispatch({
    rawBody: payload,
    signature,
    stripe,
    endpointSecret,
    supabase,
    dispatch: async () => {},
  });
  assert(result.status === 200 && result.body.received === true, 'expected 200 received');
  assert(supabase.deleted.length === 0, 'successful processing must keep the claim');
});

await test('POST Web Handler returns a JSON Response without Next.js bodyParser config', async () => {
  const { POST, default: nodeHandler } = await import('../api/stripe-webhook.js');
  const { payload, signature } = signedEvent();
  const request = new Request('http://localhost/api/stripe-webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': signature,
      'content-type': 'application/json',
    },
    body: payload,
  });
  const response = await POST(request);
  assert(response instanceof Response, 'expected Fetch API Response from POST export');
  assert(response.status === 500, `without Stripe/Supabase env, expected 500, got ${response.status}`);
  const body = await response.json();
  assert(body.error, 'expected an error payload');
  assert(typeof nodeHandler === 'function', 'Node (req, res) default export must remain for local fallback');
});

console.log(`verify-stripe-webhook: ${passed} checks OK`);
