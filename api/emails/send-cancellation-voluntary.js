import { sendEmail } from './sendEmail.js';
import { EMAIL_TEMPLATE_IDS } from './templateIds.js';

/**
 * Send the voluntary cancellation confirmation email via the Resend template.
 * Only called when cancellation_details.reason is "cancellation_requested" or null/unknown.
 * NOT called for payment_failed or payment_disputed — Stripe already sent those users retry notifications.
 *
 * Required variables passed to template:
 *   {{{first_name}}}       – user's first name
 *   {{{plan_name}}}        – e.g. "Essentials", "Pro", "Builders Club"
 *   {{{access_end_date}}}  – human-readable date access ends, e.g. "May 15, 2026"
 */
export async function sendCancellationVoluntaryEmail({ email, firstName, planName, accessEndDate }) {
  return sendEmail({
    to: email,
    subject: "You're all set",
    templateId: EMAIL_TEMPLATE_IDS.cancellationConfirmed,
    variables: {
      first_name: firstName || 'there',
      plan_name: planName || 'Pro',
      access_end_date: accessEndDate || '',
    },
  });
}
