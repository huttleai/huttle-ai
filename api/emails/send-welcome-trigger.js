import { createClient } from '@supabase/supabase-js';
import { authenticateBillingRequest } from '../_utils/billing.js';
import { maybeSendWelcomeEmail } from './welcomeSignup.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * POST /api/emails/send-welcome-trigger
 *
 * Called after signup (session present) or after the first SIGNED_IN that
 * follows email verification. Recipient is always derived from the
 * authenticated bearer token. Idempotent: one Welcome send per account.
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

  try {
    const result = await maybeSendWelcomeEmail(supabase, {
      user: authResult.user,
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Welcome email trigger failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
