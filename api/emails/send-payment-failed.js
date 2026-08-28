import { sendEmail } from './sendEmail.js';
import { EMAIL_TEMPLATE_IDS } from './templateIds.js';

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
  return sendEmail({
    to: email,
    subject: "Your payment didn't go through",
    templateId: EMAIL_TEMPLATE_IDS.paymentFailed,
    variables: {
      first_name: firstName || 'there',
      plan_name: planName || 'Pro',
    },
  });
}
