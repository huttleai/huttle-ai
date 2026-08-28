import { getAppUrl } from '../_utils/billing.js';
import { sendEmail } from './sendEmail.js';
import { EMAIL_TEMPLATE_IDS } from './templateIds.js';

/**
 * Send the Welcome transactional email via the Resend `welcome` template.
 *
 * Fires exactly once per account after successful signup, or right after
 * email verification when confirmations are enabled. Not on every login.
 *
 * Required template variables (huttle-transactional-emails.md):
 *   {{first_name}}
 *   {{brand_voice_url}}     – Brand Voice setup
 *   {{plan_builder_url}}    – Plan Builder
 *   {{ignite_engine_url}}   – Ignite Engine
 *
 * IMPORTANT: template alias `welcome` must be created and published in the
 * Resend dashboard. This send will fail until that template exists.
 */
export async function sendWelcomeEmail({
  email,
  firstName,
  brandVoiceUrl,
  planBuilderUrl,
  igniteEngineUrl,
  userId,
} = {}) {
  const appUrl = getAppUrl();

  return sendEmail({
    to: email,
    subject: 'Welcome to Huttle AI',
    templateId: EMAIL_TEMPLATE_IDS.welcome,
    idempotencyKey: userId ? `welcome-email/${userId}` : undefined,
    variables: {
      first_name: firstName || 'there',
      brand_voice_url: brandVoiceUrl || `${appUrl}/dashboard/brand-voice`,
      plan_builder_url: planBuilderUrl || `${appUrl}/dashboard/plan-builder`,
      ignite_engine_url: igniteEngineUrl || `${appUrl}/dashboard/ignite-engine`,
    },
  });
}
