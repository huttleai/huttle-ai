export const ACTIVE_ACCESS_STATUSES = new Set(['active', 'trialing', 'past_due']);

/**
 * Resolve access status/tier from Stripe + DB sources.
 * Stripe is authoritative when subscription-status call succeeds.
 */
export function resolveSubscriptionAccessState({
  databaseSubscription = null,
  stripeResult = null,
  normalizeTier,
  freeTier,
}) {
  const stripeSubscription = stripeResult?.success ? stripeResult.subscription : null;
  const stripeIsAuthoritative = Boolean(stripeResult?.success);
  const databaseTier = databaseSubscription ? normalizeTier(databaseSubscription.tier) : null;
  const resolvedStripeTier = normalizeTier(stripeSubscription?.plan || stripeResult?.plan);

  const stripeStatus = stripeSubscription?.status || stripeResult?.status || 'inactive';
  const databaseStatus = databaseSubscription?.status || 'inactive';
  const nextStatus = stripeIsAuthoritative
    ? stripeStatus
    : databaseStatus || stripeResult?.status || 'inactive';

  const hasActiveSubscription = ACTIVE_ACCESS_STATUSES.has(nextStatus);
  const nextTier = hasActiveSubscription
    ? (stripeIsAuthoritative
      ? (resolvedStripeTier || databaseTier || freeTier)
      : (databaseTier || resolvedStripeTier || freeTier))
    : freeTier;

  return {
    stripeSubscription,
    databaseTier,
    resolvedStripeTier,
    stripeIsAuthoritative,
    hasActiveSubscription,
    nextStatus,
    nextTier,
  };
}
