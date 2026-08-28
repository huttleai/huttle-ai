import { sendEmail } from './sendEmail.js';
import { EMAIL_TEMPLATE_IDS } from './templateIds.js';

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
  userId,
} = {}) {
  return sendEmail({
    to: email,
    subject: "You're out of credits for the month",
    templateId: EMAIL_TEMPLATE_IDS.usageAlert100,
    idempotencyKey: userId
      ? `usage-alert-100/${userId}/${creditResetDate || 'cycle'}`
      : undefined,
    variables: {
      first_name: firstName || 'there',
      plan_name: planName || 'Pro',
      credit_reset_date: creditResetDate || '',
      days_until_reset: String(daysUntilReset ?? ''),
    },
  });
}

/**
 * Send the usage-alert-80 email when a user crosses 80% of their monthly pool.
 * Idempotency (only once per cycle) must be enforced by the caller.
 *
 * Required variables match the 100% alert, plus remaining/limit context:
 *   {{{first_name}}}
 *   {{{plan_name}}}
 *   {{{credit_reset_date}}}
 *   {{{days_until_reset}}}
 *   {{{credits_used}}}
 *   {{{credit_limit}}}
 *
 * IMPORTANT: template alias `usage-alert-80` must be created and published in
 * the Resend dashboard. This send will fail until that template exists.
 */
export async function sendUsageAlert80Email({
  email,
  firstName,
  planName,
  creditResetDate,
  daysUntilReset,
  creditsUsed,
  creditLimit,
  userId,
} = {}) {
  return sendEmail({
    to: email,
    subject: "You've used 80% of your credits this month",
    templateId: EMAIL_TEMPLATE_IDS.usageAlert80,
    idempotencyKey: userId
      ? `usage-alert-80/${userId}/${creditResetDate || 'cycle'}`
      : undefined,
    variables: {
      first_name: firstName || 'there',
      plan_name: planName || 'Pro',
      credit_reset_date: creditResetDate || '',
      days_until_reset: String(daysUntilReset ?? ''),
      credits_used: String(creditsUsed ?? ''),
      credit_limit: String(creditLimit ?? ''),
    },
  });
}
