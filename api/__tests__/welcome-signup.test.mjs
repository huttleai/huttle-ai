import assert from 'node:assert/strict';
import test from 'node:test';

import { isEligibleSignupMoment, maybeSendWelcomeEmail } from '../emails/welcomeSignup.js';
import { EMAIL_ACTIVITY_FEATURES, EMAIL_TEMPLATE_IDS } from '../emails/templateIds.js';

test('isEligibleSignupMoment allows new accounts and recent confirmations only', () => {
  const now = Date.now();
  assert.equal(
    isEligibleSignupMoment({ created_at: new Date(now).toISOString() }),
    true,
  );
  assert.equal(
    isEligibleSignupMoment({
      created_at: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
      email_confirmed_at: new Date(now - 10 * 60 * 1000).toISOString(),
    }),
    true,
  );
  assert.equal(
    isEligibleSignupMoment({
      created_at: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      email_confirmed_at: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    false,
  );
  assert.equal(isEligibleSignupMoment(null), false);
});

test('maybeSendWelcomeEmail skips logins that are not a new signup', async () => {
  const result = await maybeSendWelcomeEmail(
    { from() { throw new Error('should not query'); } },
    {
      user: {
        id: 'legacy-user',
        email: 'old@example.com',
        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        email_confirmed_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  assert.deepEqual(result, { skipped: true, reason: 'not_a_new_signup' });
});

test('maybeSendWelcomeEmail skips when the welcome activity row already exists', async () => {
  const supabase = {
    from(table) {
      assert.equal(table, 'user_activity');
      const query = {
        select() { return query; },
        eq() { return query; },
        then(resolve) {
          return Promise.resolve({ count: 1, error: null }).then(resolve);
        },
      };
      return query;
    },
  };

  const result = await maybeSendWelcomeEmail(supabase, {
    user: {
      id: 'new-user',
      email: 'new@example.com',
      created_at: new Date().toISOString(),
    },
  });
  assert.deepEqual(result, { skipped: true, reason: 'already_sent' });
});

test('welcome and 80% template aliases are declared and flagged as dashboard-pending', async () => {
  const { EMAIL_TEMPLATES_PENDING_RESEND_DASHBOARD } = await import('../emails/templateIds.js');
  assert.equal(EMAIL_TEMPLATE_IDS.welcome, 'welcome');
  assert.equal(EMAIL_TEMPLATE_IDS.usageAlert80, 'usage-alert-80');
  assert.equal(EMAIL_TEMPLATE_IDS.usageAlert100, 'usage-alert-100');
  assert.equal(EMAIL_ACTIVITY_FEATURES.welcome, 'welcomeEmail');
  assert.ok(EMAIL_TEMPLATES_PENDING_RESEND_DASHBOARD.includes('welcome'));
  assert.ok(EMAIL_TEMPLATES_PENDING_RESEND_DASHBOARD.includes('usage-alert-80'));
  assert.ok(!EMAIL_TEMPLATES_PENDING_RESEND_DASHBOARD.includes('usage-alert-100'));
});
