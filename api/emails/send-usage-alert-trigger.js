import { createClient } from '@supabase/supabase-js';
import { sendUsageAlert100Email } from './send-usage-alert.js';
import { authenticateBillingRequest } from '../_utils/billing.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * POST /api/emails/send-usage-alert-trigger
 *
 * Called by the frontend useAIUsage hook the moment a user exhausts their
 * monthly credit pool (pool_exhausted). Fires Email 7 (usage-alert-100)
 * exactly once per billing cycle per user.
 *
 * Requires a Supabase bearer token. Body may include { userId: string } as a
 * consistency check, but the server always binds the send to the token user.
 *
 * Idempotency: checks user_activity for a row with feature = 'usageAlert100'
 * written this billing cycle. If one exists, skips the send and returns 200.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const requestedUserId = req.body?.userId;
  const authResult = await authenticateBillingRequest(req, supabase);
  if (authResult.error) {
    return res.status(authResult.statusCode).json({ error: authResult.error });
  }

  const userId = authResult.user.id;
  if (requestedUserId && requestedUserId !== userId) {
    return res.status(403).json({ error: 'Authenticated user does not match request user' });
  }

  try {
    // ── Idempotency check ──────────────────────────────────────────────────
    // Only send once per billing cycle (calendar month).
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: alreadySent, error: alreadySentError } = await supabase
      .from('user_activity')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', 'usageAlert100')
      .gte('created_at', startOfMonth.toISOString());

    if (alreadySentError) {
      throw new Error(alreadySentError.message || 'Failed to check usage alert send history');
    }

    if (alreadySent > 0) {
      return res.status(200).json({ skipped: true, reason: 'already_sent_this_cycle' });
    }

    // ── Fetch user data for the email ──────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('first_name, stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(profileError.message || 'Failed to load user profile');
    }

    const email = authResult.user.email;

    if (!email) {
      return res.status(404).json({ error: 'User email not found' });
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('tier, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      throw new Error(subscriptionError.message || 'Failed to load subscription');
    }

    // ── Build template variables ───────────────────────────────────────────
    const TIER_LABELS = {
      pro: 'Pro',
      essentials: 'Essentials',
      builder: 'Builders Club',
      founder: 'Builders Club',
      free: 'Free',
    };

    const planName = TIER_LABELS[subscription?.tier] || 'Pro';

    // Credit reset date = start of next calendar month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const creditResetDate = nextMonth.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const daysUntilReset = Math.ceil(
      (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // ── Send the email ─────────────────────────────────────────────────────
    const emailResult = await sendUsageAlert100Email({
      email,
      firstName: profile?.first_name || '',
      planName,
      creditResetDate,
      daysUntilReset,
    });

    if (emailResult?.error) {
      throw new Error(emailResult.error.message || 'Failed to send usage alert email');
    }

    // ── Mark as sent so we don't fire again this cycle ────────────────────
    const { error: insertError } = await supabase.from('user_activity').insert({
      user_id: userId,
      feature: 'usageAlert100',
      metadata: { planName, creditResetDate, daysUntilReset },
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      throw new Error(insertError.message || 'Failed to record usage alert send');
    }

    return res.status(200).json({ sent: true, planName, creditResetDate, daysUntilReset });
  } catch (err) {
    console.error('Usage alert trigger failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
