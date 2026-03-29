/**
 * Help Center — Email Support form → Resend → team inbox + optional confirmation to user.
 *
 * Env: RESEND_API_KEY (required), SUPPORT_INBOX_EMAIL (optional, default support@huttleai.com)
 */

import { Resend } from 'resend';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import { checkPersistentRateLimit } from './_utils/persistent-rate-limit.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const SUPPORT_TO = (process.env.SUPPORT_INBOX_EMAIL || 'support@huttleai.com').trim();
const FROM = 'Huttle AI <hello@huttleai.com>';

const SUBJECT_LABELS = {
  technical: 'Technical Issue',
  billing: 'Billing Question',
  feature: 'Feature Question',
  other: 'Other',
};

const ALLOWED_SUBJECT_IDS = new Set(Object.keys(SUBJECT_LABELS));
const MAX_MESSAGE_LEN = 8000;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!resend) {
    console.error('support-contact: RESEND_API_KEY missing');
    return res.status(503).json({ error: 'Email is not configured on the server' });
  }

  try {
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const subjectId = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!ALLOWED_SUBJECT_IDS.has(subjectId)) {
      return res.status(400).json({ error: 'Invalid subject' });
    }

    if (!message || message.length > MAX_MESSAGE_LEN) {
      return res.status(400).json({
        error: message ? `Message must be at most ${MAX_MESSAGE_LEN} characters` : 'Message is required',
      });
    }

    const rateLimit = await checkPersistentRateLimit({
      userKey: email.toLowerCase(),
      route: 'support-contact',
      maxRequests: 5,
      windowSeconds: 3600,
    });

    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    const topicLabel = SUBJECT_LABELS[subjectId];
    const safeBody = escapeHtml(message).replace(/\r\n/g, '\n').replace(/\n/g, '<br/>');
    const accountLine = userId ? `<p><strong>User ID:</strong> ${escapeHtml(userId)}</p>` : '';

    const supportHtml = `
      <div style="font-family:Inter,Arial,sans-serif;color:#12313a;line-height:1.5;">
        <h2 style="margin:0 0 12px;">Help Center message</h2>
        <p><strong>From:</strong> ${escapeHtml(email)}</p>
        <p><strong>Topic:</strong> ${escapeHtml(topicLabel)}</p>
        ${accountLine}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
        <div>${safeBody}</div>
      </div>
    `;

    const supportResult = await resend.emails.send({
      from: FROM,
      to: SUPPORT_TO,
      replyTo: email,
      subject: `[Huttle Help] ${topicLabel}`,
      html: supportHtml,
    });

    if (supportResult.error) {
      console.error('support-contact: Resend (support) error', supportResult.error);
      return res.status(502).json({ error: 'Could not send message. Please try again or email support@huttleai.com directly.' });
    }

    let confirmationSent = true;
    const confirmResult = await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'We received your message — Huttle AI',
      html: `
        <div style="font-family:Inter,Arial,sans-serif;color:#12313a;line-height:1.6;">
          <p>Hi,</p>
          <p>Thanks for contacting Huttle AI. We received your message about <strong>${escapeHtml(topicLabel)}</strong> and typically reply within 24–48 business hours.</p>
          <p>If your question is urgent, you can also reach us at <a href="mailto:support@huttleai.com">support@huttleai.com</a>.</p>
          <p style="margin-top:24px;color:#64748b;font-size:14px;">— Huttle AI Support</p>
        </div>
      `,
    });

    if (confirmResult.error) {
      confirmationSent = false;
      console.error('support-contact: Resend (confirmation) error', confirmResult.error);
    }

    return res.status(200).json({ ok: true, confirmationSent });
  } catch (err) {
    console.error('support-contact:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
