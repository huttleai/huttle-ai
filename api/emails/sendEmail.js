import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const EMAIL_FROM_ADDRESS = 'Huttle AI <hello@huttleai.com>';

export function getResendClient() {
  return resend;
}

/**
 * Shared Resend template send used by Huttle transactional emails.
 * Matches the payload shape of the existing send-* helpers:
 * template_id + variables: [{ email, data }].
 *
 * @param {{
 *   to: string,
 *   subject: string,
 *   templateId: string,
 *   variables?: Record<string, string>,
 *   idempotencyKey?: string,
 * }} options
 */
export async function sendEmail({ to, subject, templateId, variables = {}, idempotencyKey } = {}) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  if (!to) {
    throw new Error('Email recipient is required');
  }
  if (!templateId) {
    throw new Error('templateId is required');
  }

  const payload = {
    from: EMAIL_FROM_ADDRESS,
    to,
    subject,
    template_id: templateId,
    variables: [
      {
        email: to,
        data: variables,
      },
    ],
  };

  if (idempotencyKey) {
    return resend.emails.send(payload, { idempotencyKey });
  }

  return resend.emails.send(payload);
}
