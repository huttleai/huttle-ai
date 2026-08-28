import assert from 'node:assert/strict';
import test from 'node:test';

import {
  maybeSendUsageThresholdEmails,
  resolveUsageAlertThreshold,
} from '../emails/usageThresholdAlerts.js';
import { EMAIL_ACTIVITY_FEATURES } from '../emails/templateIds.js';
import { recordGenerationUsage } from '../_utils/usageGate.js';

test('resolveUsageAlertThreshold fires 80 at and above 80 percent, 100 at the pool cap', () => {
  assert.equal(resolveUsageAlertThreshold(159, 200), null);
  assert.equal(resolveUsageAlertThreshold(160, 200), 80);
  assert.equal(resolveUsageAlertThreshold(199, 200), 80);
  assert.equal(resolveUsageAlertThreshold(200, 200), 100);
  assert.equal(resolveUsageAlertThreshold(201, 200), 100);
  assert.equal(resolveUsageAlertThreshold(480, 600), 80);
  assert.equal(resolveUsageAlertThreshold(0, 200), null);
  assert.equal(resolveUsageAlertThreshold(100, 0), null);
});

function createThresholdSupabase({
  creditCount = 0,
  alertCounts = {},
  subscription = { tier: 'essentials', status: 'active' },
  email = 'qa@example.com',
  firstName = 'Alex',
} = {}) {
  const inserted = [];
  return {
    inserted,
    from(table) {
      const state = { feature: null };
      const query = {
        select() { return query; },
        eq(column, value) {
          if (column === 'feature') state.feature = value;
          return query;
        },
        or() { return query; },
        gte() { return query; },
        order() { return query; },
        limit() { return query; },
        maybeSingle: async () => {
          if (table === 'subscriptions') {
            return { data: subscription, error: null };
          }
          if (table === 'user_profile') {
            return { data: { first_name: firstName }, error: null };
          }
          if (table === 'users') {
            return { data: { email, full_name: firstName }, error: null };
          }
          return { data: null, error: null };
        },
        insert: async (rows) => {
          const list = Array.isArray(rows) ? rows : [rows];
          inserted.push(...list);
          return { error: null };
        },
        then(resolve, reject) {
          if (table !== 'user_activity') {
            return Promise.resolve({ count: 0, error: null }).then(resolve, reject);
          }
          const count = state.feature === 'aiGenerations'
            ? creditCount
            : (alertCounts[state.feature] ?? 0);
          return Promise.resolve({ count, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

test('maybeSendUsageThresholdEmails sends the 80 percent alert once when usage crosses 80%', async () => {
  const sent = [];
  const supabase = createThresholdSupabase({ creditCount: 160 });
  const result = await maybeSendUsageThresholdEmails(
    supabase,
    { userId: 'user-1', subscription: { tier: 'essentials', status: 'active' } },
    {
      send80: async (payload) => { sent.push({ threshold: 80, payload }); },
      send100: async (payload) => { sent.push({ threshold: 100, payload }); },
    },
  );

  assert.equal(result.sent, true);
  assert.equal(result.threshold, 80);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].threshold, 80);
  assert.equal(sent[0].payload.email, 'qa@example.com');
  assert.equal(sent[0].payload.firstName, 'Alex');
  assert.equal(sent[0].payload.creditsUsed, 160);
  assert.equal(sent[0].payload.creditLimit, 200);
  assert.equal(
    supabase.inserted.some((row) => row.feature === EMAIL_ACTIVITY_FEATURES.usageAlert80),
    true,
  );
});

test('maybeSendUsageThresholdEmails sends 100 percent rather than 80 when the pool is exhausted', async () => {
  const sent = [];
  const result = await maybeSendUsageThresholdEmails(
    createThresholdSupabase({ creditCount: 200 }),
    { userId: 'user-1', subscription: { tier: 'essentials', status: 'active' } },
    {
      send80: async (payload) => { sent.push({ threshold: 80, payload }); },
      send100: async (payload) => { sent.push({ threshold: 100, payload }); },
    },
  );

  assert.equal(result.sent, true);
  assert.equal(result.threshold, 100);
  assert.deepEqual(sent.map((item) => item.threshold), [100]);
});

test('maybeSendUsageThresholdEmails is idempotent within the billing cycle', async () => {
  const sent = [];
  const result = await maybeSendUsageThresholdEmails(
    createThresholdSupabase({
      creditCount: 170,
      alertCounts: { [EMAIL_ACTIVITY_FEATURES.usageAlert80]: 1 },
    }),
    { userId: 'user-1', subscription: { tier: 'essentials', status: 'active' } },
    {
      send80: async (payload) => { sent.push(payload); },
      send100: async () => {},
    },
  );

  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'already_sent_this_cycle');
  assert.equal(sent.length, 0);
});

test('recordGenerationUsage notifies usage thresholds after a successful write', async () => {
  const supabase = createThresholdSupabase({ creditCount: 10 });
  const recorded = await recordGenerationUsage(supabase, {
    userId: 'user-1',
    featureKey: 'aiProxyCall',
    subscription: { tier: 'essentials', status: 'active' },
  });
  assert.equal(recorded.ok, true);
  assert.equal(recorded.creditsLogged, 1);
});
