import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function formatTrialEndDate(trialEndDate) {
  return trialEndDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getPlanPricing(plan) {
  const normalizedPlan = String(plan || 'pro').toLowerCase();

  if (normalizedPlan === 'essentials') {
    return {
      planLabel: 'Essentials',
      formattedAmount: '$15/month',
    };
  }

  return {
    planLabel: 'Pro',
    formattedAmount: '$39/month',
  };
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

function buildTwoDaysEmail({ firstName, formattedDate, planLabel, formattedAmount, manageUrl, contentCount }) {
  const contentLine = typeof contentCount === 'number'
    ? `<p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#2d525b;"><strong>P.S.</strong> You&apos;ve created ${contentCount} piece${contentCount === 1 ? '' : 's'} of content during your trial. Don&apos;t lose access to your Content Vault.</p>`
    : '';

  return {
    subject: 'Your Huttle AI trial ends in 2 days',
    html: buildEmailShell({
      title: 'Your trial ends in 2 days',
      preview: `Your ${planLabel} plan will begin automatically on ${formattedDate}.`,
      ctaUrl: manageUrl,
      ctaLabel: 'Manage your subscription',
      bodyHtml: `
        <p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#2d525b;">Hey ${firstName},</p>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#2d525b;">Just a heads up: your Huttle AI trial ends on <strong>${formattedDate}</strong>.</p>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#2d525b;">After that, your <strong>${planLabel}</strong> subscription begins at <strong>${formattedAmount}</strong>. Nothing changes and no action is needed. We&apos;ll just start your subscription automatically.</p>
        <p style="margin:0;font-size:16px;line-height:1.8;color:#2d525b;">If you want to cancel before then, you can do that from your billing settings with one click. No questions asked.</p>
        <p style="margin:24px 0 0;font-size:15px;line-height:1.8;color:#2d525b;">Talk soon,<br />The Huttle AI Team</p>
        ${contentLine}
      `,
    }),
  };
}

function buildOneDayEmail({ firstName, formattedDate, planLabel, formattedAmount, manageUrl }) {
  return {
    subject: "Last day of your Huttle AI trial - you'll be charged tomorrow",
    html: buildEmailShell({
      title: 'Last day of your free trial',
      preview: `Your ${planLabel} plan begins tomorrow at ${formattedAmount}.`,
      ctaUrl: manageUrl,
      ctaLabel: 'Manage your subscription',
      secondaryCtaUrl: manageUrl,
      secondaryCtaLabel: 'Cancel before midnight',
      bodyHtml: `
        <p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#2d525b;">Hey ${firstName},</p>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#2d525b;">Your Huttle AI trial ends on <strong>${formattedDate}</strong>.</p>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.8;color:#2d525b;">Tomorrow, your <strong>${planLabel}</strong> plan begins at <strong>${formattedAmount}</strong>. Your card on file will be charged automatically.</p>
        <p style="margin:0;font-size:16px;line-height:1.8;color:#2d525b;">Everything you&apos;ve created stays in your Content Vault. Your brand voice settings carry over. Nothing resets.</p>
        <p style="margin:24px 0 0;font-size:15px;line-height:1.8;color:#2d525b;">The Huttle AI Team</p>
      `,
    }),
  };
}

export function shouldSendTrialWarning(daysRemaining) {
  return daysRemaining === 2 || daysRemaining === 1;
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
  const { planLabel, formattedAmount } = getPlanPricing(plan);
  const formattedDate = formatTrialEndDate(trialEndDate);

  const payload = daysRemaining === 2
    ? buildTwoDaysEmail({
        firstName: safeFirstName,
        formattedDate,
        planLabel,
        formattedAmount,
        manageUrl,
        contentCount,
      })
    : buildOneDayEmail({
        firstName: safeFirstName,
        formattedDate,
        planLabel,
        formattedAmount,
        manageUrl,
      });

  return resend.emails.send({
    from: 'Huttle AI <hello@huttleai.com>',
    to: email,
    subject: payload.subject,
    html: payload.html,
  });
}
