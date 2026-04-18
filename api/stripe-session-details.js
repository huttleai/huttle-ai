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
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import { buildPublicSessionDetails } from './_utils/stripe-session-details.js';

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
    return res.status(200).json(buildPublicSessionDetails(session));
  } catch (error) {
    console.error('[stripe-session-details] Failed to retrieve session:', error.message);
    return res.status(500).json({ error: 'Failed to load session details' });
  }
}
