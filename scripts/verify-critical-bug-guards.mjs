import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const rootUrl = new URL('../', import.meta.url);

function assertIncludes(source, needle, message) {
  assert.ok(source.includes(needle), message);
}

function assertNotIncludes(source, needle, message) {
  assert.ok(!source.includes(needle), message);
}

function createMockResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function verifyUsageAlertRequiresAuth() {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

  const moduleUrl = new URL('api/emails/send-usage-alert-trigger.js', rootUrl);
  const { default: handler } = await import(`${pathToFileURL(moduleUrl.pathname).href}?guard=${Date.now()}`);
  const res = createMockResponse();

  await handler(
    {
      method: 'POST',
      headers: {},
      body: { userId: '00000000-0000-4000-8000-000000000001' },
    },
    res
  );

  assert.equal(res.statusCode, 401, 'usage-alert trigger must reject unauthenticated POSTs before user lookup');
  assert.equal(res.body?.error, 'Authentication required');
}

async function verifyStaticGuards() {
  const [usageAlert, usageHook, webhook, changePlan] = await Promise.all([
    readFile(new URL('api/emails/send-usage-alert-trigger.js', rootUrl), 'utf8'),
    readFile(new URL('src/hooks/useAIUsage.js', rootUrl), 'utf8'),
    readFile(new URL('api/stripe-webhook.js', rootUrl), 'utf8'),
    readFile(new URL('api/change-subscription-plan.js', rootUrl), 'utf8'),
  ]);

  assertIncludes(
    usageAlert,
    "import { authenticateBillingRequest } from '../_utils/billing.js';",
    'usage-alert endpoint must import shared bearer auth'
  );
  assertIncludes(
    usageAlert,
    'requestedUserId && requestedUserId !== authResult.user.id',
    'usage-alert endpoint must reject cross-user sends'
  );
  assertNotIncludes(
    usageAlert,
    'sent: true, email',
    'usage-alert endpoint must not return the target email address'
  );
  assertIncludes(
    usageHook,
    'Authorization: `Bearer ${accessToken}`',
    'usage-alert frontend caller must forward the Supabase bearer token'
  );

  assertIncludes(
    webhook,
    'return res.status(500).json({ error: ',
    'Stripe webhook must return 500 from the top-level catch so Stripe retries failed critical syncs'
  );
  assertIncludes(
    webhook,
    'throw subErr;',
    'checkout subscription sync failures must bubble out instead of being marked processed'
  );
  assertIncludes(
    webhook,
    "throw new Error('Could not resolve Supabase user for checkout session');",
    'checkout user resolution failures must not be acknowledged as processed'
  );
  assertIncludes(
    webhook,
    'cancelAtPeriodEnd = Boolean(stripeSub.cancel_at_period_end);',
    'invoice.paid must preserve the live Stripe cancel_at_period_end flag'
  );
  const invoicePaidBlock = webhook.match(/case 'invoice\.paid': \{[\s\S]*?case 'invoice\.payment_succeeded':/)?.[0] ?? '';
  assert.ok(invoicePaidBlock, 'guard could not locate invoice.paid block');
  assertNotIncludes(
    invoicePaidBlock,
    'cancel_at_period_end: false',
    'invoice.paid must not blindly clear scheduled cancellations'
  );

  assertIncludes(
    changePlan,
    'status: normaliseSubscriptionStatus(updatedSubscription.status)',
    'plan changes must normalize Stripe status before writing to Supabase'
  );
  assertIncludes(
    changePlan,
    'if (planSyncError)',
    'plan changes must fail visibly when Supabase sync fails after Stripe update'
  );
}

await verifyUsageAlertRequiresAuth();
await verifyStaticGuards();

console.log('Critical bug guards passed');
