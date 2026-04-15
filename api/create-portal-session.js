/**
 * Stripe Customer Portal Session API Endpoint
 * 
 * Creates a Stripe Customer Portal session for subscription management.
 * Users can update payment methods, view invoices, and cancel subscriptions.
 * 
 * Required environment variables:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * - VITE_APP_URL or NEXT_PUBLIC_APP_URL: Your app's URL for redirects
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import { authenticateBillingRequest, getAppUrl, resolveBillingContext } from './_utils/billing.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export default async function handler(req, res) {
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Authentication service not configured' });
  }

  try {
    const authResult = await authenticateBillingRequest(req, supabase);
    if (authResult.error || !authResult.user) {
      return res.status(authResult.statusCode).json({ error: authResult.error });
    }

    const { user_id: requestedUserId, return_url: returnUrl } = req.body ?? {};
    if (requestedUserId && requestedUserId !== authResult.user.id) {
      return res.status(403).json({ error: 'You can only manage your own billing account' });
    }

    const { customerId } = await resolveBillingContext({
      supabase,
      stripe,
      userId: authResult.user.id,
      createCustomerIfMissing: true,
    });

    if (!customerId) {
      return res.status(400).json({
        error: 'No billing account found. Please contact support@huttleai.com',
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url:
        returnUrl ||
        `${getAppUrl()}/dashboard/subscription`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Portal session error:', err);
    return res.status(500).json({ error: err.message });
  }
}

