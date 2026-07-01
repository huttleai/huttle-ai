/**
 * Stripe Checkout Session Details API Endpoint
 *
 * Returns minimal details for a completed Stripe Checkout session so the
 * client can fire a Meta Pixel `Purchase` event on `/payment-success` with
 * the correct value, currency, and tier name.
 *
 * Only non-sensitive fields are returned. No secrets or card data are exposed.
 *
 * Required environment variables:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import { authenticateBillingRequest } from './_utils/billing.js';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not configured in environment variables');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    console.error('[stripe-session-details] STRIPE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  if (!supabase) {
    console.error('[stripe-session-details] Supabase service role client not configured');
    return res.status(500).json({ error: 'Authentication service not configured' });
  }

  const authResult = await authenticateBillingRequest(req, supabase);
  if (authResult.error || !authResult.user) {
    return res.status(authResult.statusCode || 401).json({ error: authResult.error });
  }

  const sessionId =
    typeof req.query?.session_id === 'string' ? req.query.session_id.trim() : '';

  // Basic shape validation — Stripe Checkout session IDs start with `cs_`.
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'Invalid or missing session_id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionUserId = session.client_reference_id || session.metadata?.supabase_user_id || null;
    if (!sessionUserId || sessionUserId !== authResult.user.id) {
      return res.status(403).json({ error: 'You can only view your own checkout session' });
    }

    const amountTotal =
      typeof session.amount_total === 'number' ? session.amount_total : 0;
    const currency = session.currency || 'usd';
    const tierName = session.metadata?.tier || null;

    return res.status(200).json({
      amount_total: amountTotal,
      currency,
      tier_name: tierName,
    });
  } catch (error) {
    console.error('[stripe-session-details] Failed to retrieve session:', error.message);
    return res.status(500).json({ error: 'Failed to load session details' });
  }
}
