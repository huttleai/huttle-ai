/**
 * Stripe webhook request helpers: raw body, atomic idempotency, and verify/dispatch.
 *
 * Vercel Node.js (req, res) helpers buffer the body, then restore it via req.read /
 * req.on('data'). Next.js `export const config = { api: { bodyParser: false } }` is a
 * no-op in this Vite app. Prefer the Web Handler (`export async function POST(request)`)
 * and `request.text()` so signature verification sees the exact bytes Stripe signed.
 */

/**
 * Read the exact request bytes Stripe signed. Never JSON.stringify a parsed object.
 *
 * @param {import('http').IncomingMessage | { body?: unknown, rawBody?: unknown, on?: Function, read?: Function }} req
 * @returns {Promise<Buffer>}
 */
export async function getRawBody(req) {
  if (!req) {
    throw new Error('Unable to read raw webhook body for signature verification');
  }

  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (typeof req.rawBody === 'string') return Buffer.from(req.rawBody);

  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);

  if (req.body && typeof req.body === 'object') {
    throw new Error(
      'Webhook body was parsed as JSON before signature verification. Need the raw bytes Stripe signed.'
    );
  }

  const chunks = [];
  const pushChunk = (chunk) => {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  };

  if (typeof req.read === 'function') {
    let chunk = req.read();
    while (chunk !== null) {
      pushChunk(chunk);
      chunk = req.read();
    }
    if (chunks.length > 0) return Buffer.concat(chunks);
    if (req.readableEnded) return Buffer.concat(chunks);
  }

  if (typeof req.on === 'function') {
    return await new Promise((resolve, reject) => {
      req.on('data', pushChunk);
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  if (req && typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req) {
      pushChunk(chunk);
    }
    return Buffer.concat(chunks);
  }

  throw new Error('Unable to read raw webhook body for signature verification');
}

/**
 * Atomically claim a Stripe event ID. Unique on event_id; conflict is a no-op.
 * The winner proceeds; everyone else treats it as a duplicate.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} eventId
 * @param {string} eventType
 * @returns {Promise<{ claimed: boolean, duplicate: boolean, error?: object }>}
 */
export async function claimWebhookEvent(supabase, eventId, eventType) {
  if (!eventId || !supabase) {
    return { claimed: false, duplicate: false, error: { message: 'Missing event id or database client' } };
  }

  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .upsert(
      {
        event_id: eventId,
        event_type: eventType || 'unknown',
        processed_at: new Date().toISOString(),
      },
      {
        onConflict: 'event_id',
        ignoreDuplicates: true,
      }
    )
    .select('event_id')
    .maybeSingle();

  if (error) {
    return { claimed: false, duplicate: false, error };
  }

  if (!data?.event_id) {
    return { claimed: false, duplicate: true };
  }

  return { claimed: true, duplicate: false };
}

/**
 * Drop a claimed event so Stripe can retry after a genuine processing failure.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} eventId
 */
export async function releaseWebhookEvent(supabase, eventId) {
  if (!eventId || !supabase) return { error: null };

  const { error } = await supabase
    .from('stripe_webhook_events')
    .delete()
    .eq('event_id', eventId);

  return { error };
}

/**
 * Throw when a Supabase call returned an error object (supabase-js does not throw by default).
 *
 * @param {object | null | undefined} error
 * @param {string} message
 */
export function throwIfError(error, message) {
  if (!error) return;
  throw new Error(`${message}: ${error.message || String(error)}`);
}

/**
 * Verify signature, claim the event atomically, dispatch, and map failures to HTTP codes.
 * Side-effect-only work belongs in dispatch; this returns 500 only when dispatch throws.
 *
 * @param {{
 *   rawBody: Buffer | string,
 *   signature: string | string[] | undefined,
 *   stripe: import('stripe').default,
 *   endpointSecret: string,
 *   supabase: import('@supabase/supabase-js').SupabaseClient,
 *   dispatch: (event: import('stripe').Stripe.Event) => Promise<void>,
 * }} options
 */
export async function verifyAndDispatch({
  rawBody,
  signature,
  stripe,
  endpointSecret,
  supabase,
  dispatch,
}) {
  const signatureHeader = Array.isArray(signature) ? signature[0] : signature;
  if (!signatureHeader) {
    return { status: 400, body: { error: 'Webhook Error: Missing stripe-signature header' } };
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signatureHeader, endpointSecret);
  } catch (err) {
    return { status: 400, body: { error: `Webhook Error: ${err.message}` } };
  }

  const claim = await claimWebhookEvent(supabase, event.id, event.type);
  if (claim.duplicate) {
    return { status: 200, body: { received: true, duplicate: true }, event };
  }
  if (!claim.claimed) {
    return {
      status: 500,
      body: { error: 'Failed to claim event for processing' },
      event,
      cause: claim.error || new Error('Failed to claim event for processing'),
    };
  }

  try {
    await dispatch(event);
    return { status: 200, body: { received: true }, event };
  } catch (error) {
    const release = await releaseWebhookEvent(supabase, event.id);
    return {
      status: 500,
      body: { error: 'Webhook processing failed' },
      event,
      cause: error,
      releaseError: release?.error || null,
    };
  }
}

/**
 * Turn a Web Request or Node (req, res) pair into a JSON HTTP response.
 *
 * @param {{ status: number, body: object }} result
 * @param {import('http').ServerResponse | { status: Function, json: Function } | null} nodeRes
 * @returns {Response | unknown}
 */
export function sendWebhookResult(result, nodeRes) {
  if (nodeRes && typeof nodeRes.status === 'function' && typeof nodeRes.json === 'function') {
    return nodeRes.status(result.status).json(result.body);
  }
  return Response.json(result.body, { status: result.status });
}
