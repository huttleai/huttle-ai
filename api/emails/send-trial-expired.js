import { sendEmail } from './sendEmail.js';
import { EMAIL_TEMPLATE_IDS } from './templateIds.js';

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
  return sendEmail({
    to: email,
    subject: "Your trial's wrapped up",
    templateId: EMAIL_TEMPLATE_IDS.trialExpired,
    variables: {
      first_name: firstName || 'there',
      plan_name: planName || 'Pro',
    },
  });
}
