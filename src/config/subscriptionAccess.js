/**
 * Subscription status → access mode.
 *
 * Generating access and read-only are driven by subscriptions.status.
 * Trial vs paid is orthogonal to tier: never write a "_trial" suffix into
 * subscriptions.tier (the CHECK constraint rejects it).
 *
 * Dunning: keep generating through past_due while Stripe Smart Retry is still
 * attempting the card. Cut generating access at unpaid or canceled; unpaid
 * lands in the same read-only lapse UI as canceled/expired, plus the payment
 * retry banner so the user can update their card.
 */

export const GENERATING_ACCESS_STATUSES = ['active', 'trialing', 'past_due'];

export const READ_ONLY_STATUSES = ['cancelled', 'canceled', 'expired', 'incomplete_expired', 'unpaid'];

export const PAYMENT_RETRY_STATUSES = ['past_due', 'unpaid'];

export const READ_ONLY_GENERATE_MESSAGE =
  'Your Brand Voice profile is still here. Reactivate to start generating again.';

export const PAYMENT_RETRY_BANNER_MESSAGE =
  'We could not process your payment. Update your card to keep your account active.';

export function isGeneratingAccessStatus(status) {
  return GENERATING_ACCESS_STATUSES.includes(status);
}

export function isReadOnlyStatus(status) {
  return READ_ONLY_STATUSES.includes(status);
}

export function isPaymentRetryStatus(status) {
  return PAYMENT_RETRY_STATUSES.includes(status);
}

export function isTrialingStatus(status) {
  return status === 'trialing';
}
