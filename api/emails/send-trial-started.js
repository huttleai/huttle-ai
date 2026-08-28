import { sendEmail } from './sendEmail.js';
import { EMAIL_TEMPLATE_IDS } from './templateIds.js';

/**
 * Send the trial-started transactional email via the Resend template.
 * Triggered by customer.subscription.created when status === 'trialing'.
 *
 * Required variables passed to template:
 *   {{{first_name}}}      – user's first name
 *   {{{plan_name}}}       – e.g. "Essentials", "Pro", "Builders Club"
 *   {{{trial_end_date}}}  – human-readable date, e.g. "April 27, 2026"
 */
export async function sendTrialStartedEmail({ email, firstName, planName, trialEndDate }) {
  return sendEmail({
    to: email,
    subject: 'Your 7-day trial is live',
    templateId: EMAIL_TEMPLATE_IDS.trialStarted,
    variables: {
      first_name: firstName || 'there',
      plan_name: planName || 'Pro',
      trial_end_date: trialEndDate || '',
    },
  });
}
