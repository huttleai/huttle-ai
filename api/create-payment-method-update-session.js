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
  setCorsHeaders(req, res);

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

    const { return_url: returnUrl } = req.body ?? {};
    const { customerId } = await resolveBillingContext({
      supabase,
      stripe,
      userId: authResult.user.id,
      createCustomerIfMissing: true,
    });

    if (!customerId) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      currency: 'usd',
      success_url: `${getAppUrl()}/dashboard/subscription?billing=payment-method-updated`,
      cancel_url: returnUrl || `${getAppUrl()}/dashboard/subscription`,
      metadata: {
        purpose: 'payment_method_update',
        user_id: authResult.user.id,
      },
      setup_intent_data: {
        metadata: {
          purpose: 'payment_method_update',
          user_id: authResult.user.id,
        },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Payment method update session error:', error);
    return res.status(500).json({ error: error.message || 'Failed to open payment method update flow' });
  }
}
