import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertCanGenerate,
  resolveRouteBillingFeature,
  recordGenerationUsage,
  ROUTE_BILLING_FEATURES,
} from '../api/_utils/usageGate.js';
import grokHandler from '../api/ai/grok.js';
import claudeHandler from '../api/ai/claude.js';
import n8nHandler from '../api/ai/n8n-generator.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

function createQuery({ maybeSingle = { data: null, error: null }, count = 0 } = {}) {
  const query = {
    select: () => query,
    eq: () => query,
    or: () => query,
    gte: () => query,
    order: () => query,
    limit: () => query,
    maybeSingle: async () => maybeSingle,
    then(resolve, reject) {
      return Promise.resolve({ count, error: null }).then(resolve, reject);
    },
  };
  return query;
}

function createMockSupabase({
  tier = 'essentials',
  status = 'active',
  creditCount = 200,
  insertError = null,
} = {}) {
  const inserted = [];
  return {
    inserted,
    from(table) {
      if (table === 'subscriptions') {
        return createQuery({
          maybeSingle: { data: { tier, status, trial_end: null }, error: null },
        });
      }
      if (table === 'user_activity') {
        const query = createQuery({ count: creditCount });
        query.insert = async (rows) => {
          if (insertError) return { error: insertError };
          inserted.push(rows);
          return { error: null };
        };
        return query;
      }
      return createQuery();
    },
  };
}

function captureHandler(handler, body) {
  let statusCode = 0;
  let payload = null;
  const req = {
    method: 'POST',
    headers: {},
    url: '/api/ai/grok',
    body,
  };
  const res = {
    setHeader() {},
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
    send(data) {
      payload = data;
      return this;
    },
    end() {},
  };
  return handler(req, res).then(() => ({ statusCode, payload }));
}

const grokSrc = read('api/ai/grok.js');
const claudeSrc = read('api/ai/claude.js');
const perplexitySrc = read('api/ai/perplexity.js');
const perplexityClientSrc = read('src/services/perplexityAPI.js');
const n8nSrc = read('api/ai/n8n-generator.js');
const grokClientSrc = read('src/services/grokAPI.js');
const usageGateSrc = read('api/_utils/usageGate.js');

assert.doesNotMatch(usageGateSrc, /skipPool/, 'usageGate must not skip the pool based on a flag');
assert.doesNotMatch(grokSrc, /skipPool/, 'grok proxy must not skip the credit pool');
assert.doesNotMatch(claudeSrc, /skipPool/, 'claude proxy must not skip the credit pool');
assert.doesNotMatch(perplexitySrc, /skipPool/, 'perplexity proxy must not skip the credit pool');
assert.doesNotMatch(n8nSrc, /skipPool/, 'n8n-generator must not skip the credit pool');

assert.doesNotMatch(
  grokSrc,
  /rawBody\.grokFeatureKey|req\.body\?\.grokFeatureKey/,
  'grok billing must not read grokFeatureKey from the client body'
);
assert.doesNotMatch(
  claudeSrc,
  /req\.body\?\.billingFeature/,
  'claude billing must not read billingFeature from the client body'
);
assert.doesNotMatch(
  perplexitySrc,
  /req\.body\?\.billingFeature/,
  'perplexity billing must not read billingFeature from the client body'
);
assert.doesNotMatch(
  perplexityClientSrc,
  /billingFeature/,
  'perplexity client must not send a client-chosen billingFeature'
);
assert.match(
  grokClientSrc,
  /bumpAiUsageDisplayCache/,
  'grokAPI display cache must sync from server billing, not act as the ledger'
);
assert.match(
  grokSrc,
  /recordGenerationUsage/,
  'grok proxy must write usage rows on success'
);
assert.match(
  claudeSrc,
  /recordGenerationUsage/,
  'claude proxy must write usage rows on success'
);
assert.match(
  perplexitySrc,
  /recordGenerationUsage/,
  'perplexity proxy must write usage rows on success'
);
assert.match(
  n8nSrc,
  /recordGenerationUsage/,
  'n8n-generator must write usage rows on success'
);

assert.equal(resolveRouteBillingFeature('grok', { body: {} }), 'aiProxyCall');
assert.equal(
  resolveRouteBillingFeature('grok', { body: { grokFeatureKey: 'dashboardWidget' } }),
  'aiProxyCall'
);
assert.equal(
  resolveRouteBillingFeature('claude', { body: { billingFeature: 'fullPostBuilderRuns' } }),
  'aiProxyCall'
);
assert.equal(
  resolveRouteBillingFeature('perplexity', { body: { billingFeature: 'nicheIntel' }, url: '/api/ai/perplexity' }),
  'trendPulse'
);
assert.equal(
  resolveRouteBillingFeature('perplexity', { url: '/api/ai/perplexity-deep-dive' }),
  'nicheIntel'
);
assert.equal(resolveRouteBillingFeature('n8n-generator'), 'contentRemix');
assert.equal(ROUTE_BILLING_FEATURES['content-remix'], 'contentRemix');

const missingKey = await assertCanGenerate(createMockSupabase(), { userId: 'user-1' });
assert.equal(missingKey.ok, false);
assert.equal(missingKey.statusCode, 400);
assert.equal(missingKey.error, 'feature_required');

const omittedClientKey = resolveRouteBillingFeature('grok', { body: { messages: [] } });
const exhausted = createMockSupabase({ creditCount: 200, tier: 'essentials', status: 'active' });
const bypassGate = await assertCanGenerate(exhausted, {
  userId: 'user-1',
  featureKey: omittedClientKey,
});
assert.equal(bypassGate.ok, false);
assert.equal(bypassGate.statusCode, 429);
assert.equal(bypassGate.error, 'pool_exhausted');

const writer = createMockSupabase({ creditCount: 10 });
const recorded = await recordGenerationUsage(writer, {
  userId: 'user-1',
  featureKey: 'aiProxyCall',
  subscription: { tier: 'essentials', status: 'active' },
  metadata: { route: 'grok' },
});
assert.equal(recorded.ok, true);
assert.equal(recorded.creditsLogged, 1);
assert.equal(writer.inserted.length, 1);
assert.equal(writer.inserted[0][0].feature, 'aiGenerations');
assert.equal(writer.inserted[0][0].metadata.sourceFeature, 'aiProxyCall');

const remixRecord = createMockSupabase({ creditCount: 10 });
const remixUsage = await recordGenerationUsage(remixRecord, {
  userId: 'user-1',
  featureKey: 'contentRemix',
  subscription: { tier: 'essentials', status: 'active' },
});
assert.equal(remixUsage.creditsLogged, 2);
assert.equal(remixRecord.inserted[0].length, 3);
assert.equal(remixRecord.inserted[0][0].feature, 'contentRemix');

const omittedKeyBody = {
  messages: [{ role: 'user', content: 'Generate a caption about coffee' }],
};
const grokBypass = await captureHandler(grokHandler, omittedKeyBody);
assert.notEqual(grokBypass.statusCode, 200, 'omitting grokFeatureKey must not generate for free');
assert.ok(
  grokBypass.statusCode === 401
    || grokBypass.statusCode === 400
    || grokBypass.statusCode === 403
    || grokBypass.statusCode === 429
    || grokBypass.statusCode === 503,
  `grok omitted-key status should reject, got ${grokBypass.statusCode}`
);
assert.ok(!grokBypass.payload?.content, 'grok omitted-key response must not include generated content');

const claudeBypass = await captureHandler(claudeHandler, { messages: [{ role: 'user', content: 'hi' }] });
assert.notEqual(claudeBypass.statusCode, 200, 'omitting billingFeature on claude must not generate for free');
assert.ok(!claudeBypass.payload?.content);

const n8nBypass = await captureHandler(n8nHandler, { topic: 'coffee', contentType: 'caption', platform: 'Instagram' });
assert.notEqual(n8nBypass.statusCode, 200, 'n8n-generator must not generate with the pool skipped');

console.info('AI proxy credit-bypass guards passed.');
