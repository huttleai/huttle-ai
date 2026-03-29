import { describe, expect, it } from 'vitest';
import { resolveSubscriptionAccessState } from '../../src/context/subscriptionResolution';

function normalizeTier(plan) {
  if (!plan) return null;
  const value = String(plan).toLowerCase();
  if (value === 'free') return 'free';
  if (value === 'essentials') return 'essentials';
  if (value === 'pro') return 'pro';
  if (value === 'founder' || value === 'founders') return 'founder';
  if (value === 'builder' || value === 'builders') return 'builder';
  return null;
}

describe('resolveSubscriptionAccessState', () => {
  it('uses Stripe inactive status over stale active DB row', () => {
    const result = resolveSubscriptionAccessState({
      databaseSubscription: { status: 'active', tier: 'pro' },
      stripeResult: {
        success: true,
        status: 'inactive',
        plan: null,
        subscription: null,
      },
      normalizeTier,
      freeTier: 'free',
    });

    expect(result.stripeIsAuthoritative).toBe(true);
    expect(result.nextStatus).toBe('inactive');
    expect(result.hasActiveSubscription).toBe(false);
    expect(result.nextTier).toBe('free');
  });

  it('falls back to DB status when Stripe lookup fails', () => {
    const result = resolveSubscriptionAccessState({
      databaseSubscription: { status: 'active', tier: 'pro' },
      stripeResult: {
        success: false,
        status: 'unknown',
      },
      normalizeTier,
      freeTier: 'free',
    });

    expect(result.stripeIsAuthoritative).toBe(false);
    expect(result.nextStatus).toBe('active');
    expect(result.hasActiveSubscription).toBe(true);
    expect(result.nextTier).toBe('pro');
  });
});
