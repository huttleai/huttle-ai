import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return resend.emails.send({
    from: 'Huttle AI <hello@huttleai.com>',
    to: email,
    subject: 'Your 7-day trial is live',
    template_id: 'trial-started',
    variables: [
      {
        email,
        data: {
          first_name: firstName || 'there',
          plan_name: planName || 'Pro',
          trial_end_date: trialEndDate || '',
        },
      },
    ],
  });
}
