/**
 * Verify Ignite Engine server-side credit/tier gate matches other gated features.
 * Run: node scripts/verify-ignite-engine-gate.mjs
 */

import { readFileSync } from 'node:fs';
import {
  FEATURE_CREDIT_COSTS,
  FEATURE_RUN_CAPS,
  getCreditPool,
  getFeatureCreditCost,
  getFeatureRunCap,
} from '../src/config/creditConfig.js';
import {
  assertCanGenerate,
  buildFeatureUsageReservationRows,
  reserveFeatureUsage,
} from '../api/_utils/usageGate.js';
import { stripIgniteProviderSecrets } from '../api/ignite-engine-proxy.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function createMockSupabase({
  subscription = null,
  subscriptionError = null,
  featureCounts = {},
  creditCount = 0,
  insertError = null,
} = {}) {
  const inserted = [];
  return {
    inserted,
    from(table) {
      if (table === 'subscriptions') {
        const query = {
          select() {
            return query;
          },
          eq() {
            return query;
          },
          order() {
            return query;
          },
          limit() {
            return query;
          },
          maybeSingle: async () => ({ data: subscription, error: subscriptionError }),
        };
        return query;
      }

      if (table === 'user_activity') {
        const state = { feature: null };
        const query = {
          select() {
            return query;
          },
          eq(column, value) {
            if (column === 'feature') state.feature = value;
            return query;
          },
          or() {
            return query;
          },
          gte() {
            return query;
          },
          insert(rows) {
            inserted.push(...rows);
            return Promise.resolve({ error: insertError });
          },
          then(resolve, reject) {
            const count =
              state.feature === 'aiGenerations'
                ? creditCount
                : (featureCounts[state.feature] ?? 0);
            return Promise.resolve({ count, error: null }).then(resolve, reject);
          },
        };
        return query;
      }

      throw new Error(`unexpected table ${table}`);
    },
  };
}

const IGNITE = 'igniteEngine';

assert(getFeatureCreditCost(IGNITE) === 3, 'Ignite costs 3 credits');
assert(FEATURE_CREDIT_COSTS.igniteEngine === 3, 'creditConfig cost is 3');
assert(FEATURE_RUN_CAPS.igniteEngine.essentials === 5, 'Essentials run cap is 5');
assert(FEATURE_RUN_CAPS.igniteEngine.pro === 40, 'Pro run cap is 40');
assert(getCreditPool('pro') === 600, 'Pro pool is 600');
assert(getFeatureRunCap(IGNITE, 'essentials', true) === 3, 'Essentials trial run cap is 3');

const rows = buildFeatureUsageReservationRows({
  userId: 'user-1',
  featureKey: IGNITE,
  reservationSource: 'ignite-engine-proxy',
  reservationKey: 'req-1',
  metadata: { platform: 'TikTok' },
});
assert(rows.length === 4, `expected 1 run + 3 credits, got ${rows.length}`);
assert(rows[0].feature === IGNITE && rows[0].metadata.type === 'run_counter', 'run-counter row');
assert(
  rows.slice(1).every((row, creditIndex) => (
    row.feature === 'aiGenerations'
    && row.metadata.sourceFeature === IGNITE
    && row.metadata.creditIndex === creditIndex
    && row.metadata.overallCredits === 3
  )),
  'three aiGenerations credit rows'
);

const stripped = stripIgniteProviderSecrets({
  topic: 'hooks',
  platform: 'TikTok',
  grokApiKey: 'xai-should-never-leave',
  GROK_API_KEY: 'also-secret',
  grok_api_key: 'also-secret',
});
assert(stripped.topic === 'hooks', 'keeps real payload fields');
assert(
  stripped.grokApiKey === undefined
    && stripped.GROK_API_KEY === undefined
    && stripped.grok_api_key === undefined,
  'strips provider secrets from the n8n payload'
);

const allowed = await assertCanGenerate(createMockSupabase({
  subscription: { tier: 'pro', status: 'active' },
  featureCounts: { igniteEngine: 0 },
  creditCount: 10,
}), { userId: 'user-1', featureKey: IGNITE });
assert(allowed.ok === true, 'Pro with remaining credits and runs is allowed');

const runCap = await assertCanGenerate(createMockSupabase({
  subscription: { tier: 'pro', status: 'active' },
  featureCounts: { igniteEngine: 40 },
  creditCount: 10,
}), { userId: 'user-1', featureKey: IGNITE });
assert(runCap.ok === false && runCap.error === 'run_cap' && runCap.statusCode === 429, 'Pro run cap blocks');

const pool = await assertCanGenerate(createMockSupabase({
  subscription: { tier: 'pro', status: 'active' },
  featureCounts: { igniteEngine: 0 },
  creditCount: 598,
}), { userId: 'user-1', featureKey: IGNITE });
assert(pool.ok === false && pool.error === 'pool_exhausted' && pool.statusCode === 429, '3-credit cost blocks at 598/600');

const essentialsCap = await assertCanGenerate(createMockSupabase({
  subscription: { tier: 'essentials', status: 'active' },
  featureCounts: { igniteEngine: 5 },
  creditCount: 0,
}), { userId: 'user-1', featureKey: IGNITE });
assert(essentialsCap.ok === false && essentialsCap.error === 'run_cap', 'Essentials 5-run cap blocks');

const noSub = await assertCanGenerate(createMockSupabase({
  subscription: null,
}), { userId: 'user-1', featureKey: IGNITE });
assert(noSub.ok === false && noSub.error === 'subscription_required', 'missing subscription is blocked');

const readOnly = await assertCanGenerate(createMockSupabase({
  subscription: { tier: 'pro', status: 'canceled' },
}), { userId: 'user-1', featureKey: IGNITE });
assert(readOnly.ok === false && readOnly.error === 'read_only', 'canceled status is read-only');

const remixFits = await assertCanGenerate(createMockSupabase({
  subscription: { tier: 'pro', status: 'active' },
  featureCounts: { contentRemix: 0 },
  creditCount: 598,
}), { userId: 'user-1', featureKey: 'contentRemix' });
assert(remixFits.ok === true, 'Content Remix (2 credits) still fits when 2 credits remain');

const remixSameGate = await assertCanGenerate(createMockSupabase({
  subscription: { tier: 'pro', status: 'active' },
  featureCounts: { contentRemix: 0 },
  creditCount: 599,
}), { userId: 'user-1', featureKey: 'contentRemix' });
assert(
  remixSameGate.ok === false && remixSameGate.error === 'pool_exhausted',
  'Content Remix uses the same pool-exhausted gate as Ignite'
);

const mock = createMockSupabase({
  subscription: { tier: 'pro', status: 'active' },
});
const reserved = await reserveFeatureUsage(mock, {
  userId: 'user-1',
  featureKey: IGNITE,
  reservationSource: 'ignite-engine-proxy',
  reservationKey: 'req-2',
});
assert(reserved.creditCost === 3 && reserved.rowsWritten === 4, 'reserve writes 4 rows');
assert(mock.inserted.length === 4, 'mock captured reservation insert');
assert(
  mock.inserted.filter((row) => row.feature === 'aiGenerations').length === 3,
  'reservation deducts 3 pool credits'
);

const proxySrc = readFileSync(new URL('../api/ignite-engine-proxy.js', import.meta.url), 'utf8');
assert(!/n8nPayload\.grokApiKey\s*=/.test(proxySrc), 'proxy must not assign grokApiKey onto the n8n payload');
assert(!/process\.env\.GROK_API_KEY/.test(proxySrc), 'proxy must not read GROK_API_KEY');
assert(/assertCanGenerate\(/.test(proxySrc), 'proxy must call assertCanGenerate');
assert(/reserveFeatureUsage\(/.test(proxySrc), 'proxy must reserve credits before n8n');
const reserveIdx = proxySrc.indexOf('await reserveFeatureUsage');
const fetchIdx = proxySrc.indexOf('await fetch(N8N_WEBHOOK_URL');
assert(reserveIdx !== -1 && fetchIdx !== -1 && reserveIdx < fetchIdx, 'reservation happens before the n8n fetch');

console.log('verify-ignite-engine-gate: OK');
