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
