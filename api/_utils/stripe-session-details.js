/**
 * True when the Checkout session is bound to this authenticated user.
 *
 * Positive matches (any one is enough):
 * - client_reference_id === userId (set by create-checkout-session)
 * - metadata.supabase_user_id === userId
 * - session.customer matches the caller's stored Stripe customer id
 *
 * Contradictory identity bindings (client_reference_id or metadata pointing
 * at a different user) always fail, even if a customer id happens to match.
 */
export function checkoutSessionBelongsToUser(session, { userId, stripeCustomerId } = {}) {
  if (!session || !userId) return false;

  const clientRef =
    typeof session.client_reference_id === 'string' ? session.client_reference_id.trim() : '';
  const metaUserId =
    typeof session.metadata?.supabase_user_id === 'string'
      ? session.metadata.supabase_user_id.trim()
      : '';
  const sessionCustomer =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer && typeof session.customer === 'object'
        ? session.customer.id
        : null;

  if (clientRef && clientRef !== userId) return false;
  if (metaUserId && metaUserId !== userId) return false;

  if (clientRef === userId || metaUserId === userId) return true;

  if (stripeCustomerId && sessionCustomer && sessionCustomer === stripeCustomerId) {
    return true;
  }

  return false;
}

/**
 * Build the minimal public response from a Stripe Checkout Session.
 * Intentionally excludes PII fields such as customer email.
 */
export function buildPublicSessionDetails(session) {
  const amountTotal =
    typeof session?.amount_total === 'number' ? session.amount_total : 0;
  const currency = session?.currency || 'usd';
  const tierName = session?.metadata?.tier || null;

  return {
    amount_total: amountTotal,
    currency,
    tier_name: tierName,
  };
}
