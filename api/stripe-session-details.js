/**
 * Stripe Checkout Session Details API Endpoint
 *
 * Returns minimal details for a completed Stripe Checkout session so the
 * client can fire a Meta Pixel `Purchase` event on `/payment-success` with
 * the correct value, currency, and tier name.
 *
 * Requires a valid logged-in session. The Checkout session must belong to
 * the caller (client_reference_id / metadata.supabase_user_id / Stripe
 * customer id). Only non-sensitive fields are returned.
 *
 * Required environment variables:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import { authenticateBillingRequest, parseBearerToken } from './_utils/billing.js';
import {
  buildPublicSessionDetails,
  checkoutSessionBelongsToUser,
} from './_utils/stripe-session-details.js';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not configured in environment variables');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!parseBearerToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[stripe-session-details] Supabase env vars not configured');
    return res.status(500).json({ error: 'Authentication service not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const authResult = await authenticateBillingRequest(req, supabase);
  if (authResult.error || !authResult.user) {
    return res.status(authResult.statusCode || 401).json({
      error: authResult.error || 'Authentication required',
    });
  }

  const userId = authResult.user.id;

  if (!stripe) {
    console.error('[stripe-session-details] STRIPE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  const sessionId =
    typeof req.query?.session_id === 'string' ? req.query.session_id.trim() : '';

  // Basic shape validation — Stripe Checkout session IDs start with `cs_`.
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'Invalid or missing session_id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const [{ data: subscriptionRow }, { data: profileRow }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_profile')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const stripeCustomerId =
      subscriptionRow?.stripe_customer_id || profileRow?.stripe_customer_id || null;

    if (!checkoutSessionBelongsToUser(session, { userId, stripeCustomerId })) {
      return res.status(403).json({ error: 'Checkout session does not belong to this user' });
    }

    return res.status(200).json(buildPublicSessionDetails(session));
  } catch (error) {
    if (error?.code === 'resource_missing' || error?.statusCode === 404) {
      return res.status(404).json({ error: 'Checkout session not found' });
    }
    console.error('[stripe-session-details] Failed to retrieve session:', error.message);
    return res.status(500).json({ error: 'Failed to load session details' });
  }
}
