import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const EMAIL_FROM_ADDRESS = 'Huttle AI <hello@huttleai.com>';

export function getResendClient() {
  return resend;
}

/**
 * Shared Resend template send used by Huttle transactional emails.
 *
 * Payload shape must match the installed `resend` SDK's own
 * `CreateEmailOptions` type (see node_modules/resend/dist/index.d.mts):
 * template id/variables go under a nested `template: { id, variables }`
 * object, where `variables` is a flat `Record<string, string | number>`.
 * A top-level `template_id`/`variables` is silently dropped by the SDK's
 * `parseEmailToApiOptions`, which produces a request with no html/text/
 * template content — Resend then rejects it with a 422.
 *
 * The Resend SDK never throws on an API error; it resolves to
 * `{ data, error }`. We check `error` here so a failed send throws,
 * instead of letting the caller believe the send succeeded and write a
 * permanent "sent" idempotency row for an email that was never delivered.
 *
 * @param {{
 *   to: string,
 *   subject: string,
 *   templateId: string,
 *   variables?: Record<string, string | number>,
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
    template: {
      id: templateId,
      variables,
    },
  };

  const { data, error } = idempotencyKey
    ? await resend.emails.send(payload, { idempotencyKey })
    : await resend.emails.send(payload);

  if (error) {
    throw new Error(
      `Resend send failed (template "${templateId}"): ${error.message || error.name || 'unknown error'}`
    );
  }

  return data;
}
