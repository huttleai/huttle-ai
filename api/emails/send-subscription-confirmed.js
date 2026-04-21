import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Template IDs per plan tier.
 * Each tier has its own Resend template with plan-specific copy.
 */
const TEMPLATE_BY_TIER = {
  essentials: 'subscription-confirmed-essentials',
  pro: 'subscription-confirmed-pro',
  builder: 'subscription-confirmed-builders',
};

const SUBJECT_BY_TIER = {
  essentials: "You're on Essentials",
  pro: "You're on Pro",
  builder: "You're in the Builders Club",
};

/**
 * Send the subscription-confirmed email for the correct plan tier.
 * Triggered by customer.subscription.updated when status === 'active' AND
 * the previous status was 'trialing' or 'incomplete'.
 *
 * Required variables passed to template:
 *   {{{first_name}}}         – user's first name
 *   {{{next_billing_date}}}  – human-readable next charge date
 *   {{{amount}}}             – formatted charge amount, e.g. "$15"
 *   {{{billing_interval}}}   – "month" or "year"
 */
export async function sendSubscriptionConfirmedEmail({
  email,
  firstName,
  tier,
  nextBillingDate,
  amount,
  billingInterval,
}) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const normalizedTier = (tier || '').toLowerCase();
  const templateId = TEMPLATE_BY_TIER[normalizedTier];
  const subject = SUBJECT_BY_TIER[normalizedTier];

  if (!templateId) {
    throw new Error(`No subscription-confirmed template configured for tier: "${tier}"`);
  }

  return resend.emails.send({
    from: 'Huttle AI <hello@huttleai.com>',
    to: email,
    subject,
    template_id: templateId,
    variables: [
      {
        email,
        data: {
          first_name: firstName || 'there',
          next_billing_date: nextBillingDate || '',
          amount: amount || '',
          billing_interval: billingInterval || 'month',
        },
      },
    ],
  });
}
