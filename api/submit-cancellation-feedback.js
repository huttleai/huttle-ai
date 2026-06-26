import { createClient } from '@supabase/supabase-js';
import { parseBearerToken } from './_utils/billing.js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';

const REASON_LABELS = {
  too_expensive: "It's too expensive",
  didnt_use: "Didn't use it enough",
  missing_features: 'Missing features I need',
  hard_to_use: 'Hard to use or confusing',
  technical_issues: 'Ran into technical issues',
  switching: 'Switching to another tool',
  business_changed: 'Business needs changed',
  taking_break: 'Just taking a break',
  other: 'Something else',
};

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    user_id: submittedUserId,
    plan_name,
    reason,
    reason_other,
    what_would_stay,
    recommend_likelihood,
    additional_feedback,
  } = req.body ?? {};

  if (!reason) {
    return res.status(400).json({ error: 'Missing required field: reason' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase env vars not configured for cancellation feedback');
    return res.status(500).json({ error: 'Service configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user?.id) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  if (submittedUserId && submittedUserId !== user.id) {
    return res.status(403).json({ error: 'User mismatch' });
  }

  const userId = user.id;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existingFeedback } = await supabase
    .from('cancellation_feedback')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', twentyFourHoursAgo)
    .limit(1)
    .maybeSingle();

  if (existingFeedback) {
    return res.status(200).json({ success: true, duplicate: true });
  }

  const { error: insertError } = await supabase.from('cancellation_feedback').insert({
    user_id: userId,
    subscription_tier: plan_name || null,
    cancellation_reason: reason,
    reason_other: reason === 'other' ? (reason_other || null) : null,
    what_would_stay: what_would_stay || null,
    recommend_likelihood: recommend_likelihood || null,
    additional_feedback: additional_feedback || null,
    source: 'cancel_modal',
    submitted_via: 'web',
    custom_feedback: null,
  });

  if (insertError) {
    console.error('Cancellation feedback insert error:', insertError);
    return res.status(500).json({ error: 'Failed to save feedback' });
  }

  const slackWebhookUrl = process.env.SLACK_WEBHOOK_CHURN;
  if (slackWebhookUrl) {
    try {
      const reasonLabel = REASON_LABELS[reason] || reason;
      const slackBody = JSON.stringify({
        text: [
          ':bust_in_silhouette: *Cancellation Feedback*',
          `Plan: ${plan_name || 'unknown'}`,
          `Reason: ${reasonLabel}`,
          `Would recommend: ${recommend_likelihood || 'not answered'}`,
          `What would have made them stay:\n> ${what_would_stay || '_not shared_'}`,
          `Additional notes:\n> ${additional_feedback || '_none_'}`,
        ].join('\n'),
      });

      await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: slackBody,
      });
    } catch (slackError) {
      console.error('Slack cancellation notification error (non-blocking):', slackError);
    }
  }

  return res.status(200).json({ ok: true });
}
