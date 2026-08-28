import { createClient } from '@supabase/supabase-js';
import { authenticateBillingRequest } from '../_utils/billing.js';
import { sendUsageAlertForThreshold } from './usageThresholdAlerts.js';

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
 * The recipient is always derived from the authenticated bearer token.
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

  const authResult = await authenticateBillingRequest(req, supabase);
  if (authResult.error || !authResult.user) {
    return res.status(authResult.statusCode || 401).json({
      error: authResult.error || 'Authentication required',
    });
  }

  const userId = authResult.user.id;

  try {
    const result = await sendUsageAlertForThreshold(supabase, {
      userId,
      threshold: 100,
    });

    if (result.skipped && result.reason === 'missing_email') {
      return res.status(404).json({ error: 'User email not found' });
    }

    if (result.sent) {
      return res.status(200).json({ sent: true });
    }

    return res.status(200).json({ skipped: true, reason: result.reason || 'skipped' });
  } catch (err) {
    console.error('Usage alert trigger failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
