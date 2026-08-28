import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send trial warning emails via the Resend `trial-ending-soon` template.
 * Sends at 3 days remaining and again at 1 day remaining.
 *
 * Required variables passed to template:
 *   {{{first_name}}}      – user's first name
 *   {{{plan_name}}}       – e.g. "Essentials", "Pro", "Builders Club"
 *   {{{trial_end_date}}}  – human-readable date, e.g. "Friday, April 27, 2026"
 *   {{{amount}}}          – formatted charge amount, e.g. "$39/month"
 *   {{{credit_limit}}}    – monthly credit allocation, e.g. "600"
 */

function formatTrialEndDate(trialEndDate) {
  return trialEndDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getPlanDetails(plan) {
  const normalizedPlan = String(plan || 'pro').toLowerCase();

  if (normalizedPlan === 'essentials') {
    return { planLabel: 'Essentials', formattedAmount: '$15/month', creditLimit: '200' };
  }
  if (normalizedPlan === 'builder') {
    return { planLabel: 'Legacy Annual', formattedAmount: '$249/year', creditLimit: '800' };
  }
  return { planLabel: 'Pro', formattedAmount: '$39/month', creditLimit: '600' };
}

/**
 * Returns true if daysRemaining is a supported send window (3 or 1).
 */
export function shouldSendTrialWarning(daysRemaining) {
  return daysRemaining === 3 || daysRemaining === 1;
}

export async function sendTrialWarningEmail({
  email,
  firstName,
  daysRemaining,
  trialEndDate,
  plan,
  manageUrl,
  contentCount,
}) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  if (!shouldSendTrialWarning(daysRemaining)) {
    return { skipped: true, reason: 'days_remaining_not_supported' };
  }

  const safeFirstName = firstName || 'there';
  const { planLabel, formattedAmount, creditLimit } = getPlanDetails(plan);
  const formattedDate = formatTrialEndDate(trialEndDate);

  const subject = daysRemaining === 3
    ? '3 days left on your trial'
    : "Last day of your Huttle AI trial — you'll be charged tomorrow";

  return resend.emails.send({
    from: 'Huttle AI <hello@huttleai.com>',
    to: email,
    subject,
    template_id: 'trial-ending-soon',
    variables: [
      {
        email,
        data: {
          first_name: safeFirstName,
          plan_name: planLabel,
          trial_end_date: formattedDate,
          amount: formattedAmount,
          credit_limit: creditLimit,
          days_remaining: String(daysRemaining),
          manage_url: manageUrl || 'https://huttleai.com/dashboard/subscription',
          content_count: typeof contentCount === 'number' ? String(contentCount) : '',
        },
      },
    ],
  });
}
