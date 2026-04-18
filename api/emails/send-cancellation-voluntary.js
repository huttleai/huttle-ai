import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function getAppUrl() {
  return process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://huttleai.com';
}

function getFeedbackUrl() {
  return process.env.CANCELLATION_FEEDBACK_URL || `${getAppUrl()}/feedback`;
}

function buildEmailShell({ title, preview, bodyHtml, ctaUrl, ctaLabel, secondaryCtaUrl, secondaryCtaLabel }) {
  return `
    <div style="margin:0;padding:0;background:#f4fbfc;font-family:Inter,Arial,sans-serif;color:#12313a;">
      <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
        <div style="background:linear-gradient(135deg,#0f1f25 0%,#12313a 100%);border-radius:24px 24px 0 0;padding:28px 32px;">
          <div style="display:inline-block;background:#01bad2;color:#0f1f25;font-weight:800;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;border-radius:999px;padding:8px 12px;">
            Huttle AI
          </div>
          <h1 style="margin:20px 0 8px;font-size:30px;line-height:1.1;color:#ffffff;">${title}</h1>
          <p style="margin:0;color:#b8d9df;font-size:15px;line-height:1.6;">${preview}</p>
        </div>

        <div style="background:#ffffff;border:1px solid #d7eef2;border-top:none;border-radius:0 0 24px 24px;padding:32px;">
          ${bodyHtml}

          <div style="margin-top:28px;">
            <a href="${ctaUrl}" style="display:inline-block;background:#01bad2;color:#08333a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 18px;border-radius:14px;">
              ${ctaLabel}
            </a>
            ${secondaryCtaUrl ? `
              <a href="${secondaryCtaUrl}" style="display:inline-block;margin-left:12px;background:#edf8fa;color:#0c4a55;text-decoration:none;font-weight:700;font-size:15px;padding:14px 18px;border-radius:14px;">
                ${secondaryCtaLabel}
              </a>
            ` : ''}
          </div>

          <p style="margin:28px 0 0;font-size:13px;line-height:1.7;color:#5b7880;">
            Need help? Reply to this email and the Huttle AI team will take care of you.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Send the voluntary cancellation confirmation email.
 * Only called when cancellation_details.reason is "cancellation_requested" or null/unknown.
 * NOT called for payment_failed or payment_disputed — Stripe already sent those users retry notifications.
 */
export async function sendCancellationVoluntaryEmail({ email, firstName, planName, accessEndDate }) {
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const safeFirstName = firstName || 'there';
  const safePlanName = planName || 'Pro';
  const feedbackUrl = getFeedbackUrl();
  const appUrl = getAppUrl();

  const accessLine = accessEndDate
    ? `<p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#2d525b;">You&apos;ll keep full access to your <strong>${safePlanName}</strong> features until <strong>${accessEndDate}</strong>. After that, your account will revert to the free plan — your content and brand settings stay saved.</p>`
    : `<p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#2d525b;">Your <strong>${safePlanName}</strong> plan has been cancelled. Your content and brand settings stay saved on the free plan.</p>`;

  const html = buildEmailShell({
    title: 'Your cancellation is confirmed',
    preview: `Thanks for giving Huttle AI a shot, ${safeFirstName}. We&apos;d love to know what we could have done better.`,
    ctaUrl: feedbackUrl,
    ctaLabel: 'Tell us why you cancelled',
    secondaryCtaUrl: appUrl,
    secondaryCtaLabel: 'Visit Huttle AI',
    bodyHtml: `
      <p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#2d525b;">Hey ${safeFirstName},</p>
      <p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#2d525b;">Your <strong>${safePlanName}</strong> subscription has been cancelled. No further charges will be made.</p>
      ${accessLine}
      <p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#2d525b;">If you ever want to come back, we&apos;ll be here. You can resubscribe anytime from your account settings — your previous work will be right where you left it.</p>
      <p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#2d525b;">One small ask: we read every response personally, and your feedback helps us build a product people actually want to use.</p>
      <p style="margin:24px 0 0;font-size:15px;line-height:1.8;color:#2d525b;">Thanks for giving us a shot,<br />The Huttle AI Team</p>
    `,
  });

  return resend.emails.send({
    from: 'Huttle AI <hello@huttleai.com>',
    to: email,
    subject: 'Your Huttle AI cancellation is confirmed',
    html,
  });
}
