import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send the usage-alert-100 email when a user exhausts all credits for the month.
 * Should be called inline at the moment credits hit 0 for the first time in a billing cycle.
 * Idempotency (only once per cycle) must be enforced by the caller before invoking this.
 *
 * Required variables passed to template:
 *   {{{first_name}}}        – user's first name
 *   {{{plan_name}}}         – e.g. "Essentials", "Pro", "Builders Club"
 *   {{{credit_reset_date}}} – human-readable date credits refill, e.g. "May 15, 2026"
 *   {{{days_until_reset}}}  – integer number of days until reset, e.g. "12"
 */
export async function sendUsageAlert100Email({
  email,
  firstName,
  planName,
  creditResetDate,
  daysUntilReset,
}) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return resend.emails.send({
    from: 'Huttle AI <hello@huttleai.com>',
    to: email,
    subject: "You're out of credits for the month",
    template_id: 'usage-alert-100',
    variables: [
      {
        email,
        data: {
          first_name: firstName || 'there',
          plan_name: planName || 'Pro',
          credit_reset_date: creditResetDate || '',
          days_until_reset: String(daysUntilReset ?? ''),
        },
      },
    ],
  });
}
