import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send the trial-expired transactional email via the Resend template.
 * Triggered by customer.subscription.updated when trial ends without a payment method,
 * OR customer.subscription.deleted when status was 'trialing'.
 *
 * Required variables passed to template:
 *   {{{first_name}}}  – user's first name
 *   {{{plan_name}}}   – e.g. "Essentials", "Pro", "Builders Club"
 */
export async function sendTrialExpiredEmail({ email, firstName, planName }) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return resend.emails.send({
    from: 'Huttle AI <hello@huttleai.com>',
    to: email,
    subject: "Your trial's wrapped up",
    template_id: 'trial-expired',
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
