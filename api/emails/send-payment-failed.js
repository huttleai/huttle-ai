import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send the payment-failed transactional email via the Resend template.
 * Only called on invoice.attempt_count === 1.
 * Stripe's built-in Smart Retries handle subsequent retry notifications (attempts 2+).
 *
 * Required variables passed to template:
 *   {{{first_name}}}  – user's first name
 *   {{{plan_name}}}   – e.g. "Essentials", "Pro", "Builders Club"
 */
export async function sendPaymentFailedEmail({ email, firstName, planName }) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return resend.emails.send({
    from: 'Huttle AI <hello@huttleai.com>',
    to: email,
    subject: "Your payment didn't go through",
    template_id: 'payment-failed',
    variables: [
      {
        email,
        data: {
          first_name: firstName || 'there',
          plan_name: planName || 'Pro',
        },
      },
    ],
  });
}
