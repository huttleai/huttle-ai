/**
 * Subscription Status API Endpoint
 * 
 * Returns the current user's subscription status.
 * 
 * Required environment variables:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 */

// STRIPE ENVIRONMENT VARIABLES
// SANDBOX (testing):
//   STRIPE_SECRET_KEY = sk_test_...
//   STRIPE_WEBHOOK_SECRET = whsec_... (test)
//   VITE_STRIPE_PUBLISHABLE_KEY = pk_test_...
// LIVE (production):
//   STRIPE_SECRET_KEY = sk_live_...
//   STRIPE_WEBHOOK_SECRET = whsec_... (live)
//   VITE_STRIPE_PUBLISHABLE_KEY = pk_live_...

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import {
  authenticateBillingRequest,
  buildSubscriptionPayload,
  getStripeSubscription,
  resolveBillingContext,
} from './_utils/billing.js';

// Validate and initialize Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const mode = process.env.STRIPE_SECRET_KEY
  ?.startsWith('sk_test') ? 'TEST' : 'LIVE';
console.log('[Stripe] Running in', mode, 'mode');

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not configured');
}
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// Initialize Supabase client for user lookup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export default async function handler(req, res) {
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // If Stripe is not configured, return inactive state gracefully.
    if (!stripe) {
      console.warn('Stripe not configured - returning inactive subscription status');
      return res.status(200).json({
        subscription: null,
        plan: null,
        status: 'inactive',
        currentPeriodEnd: null,
        trialEnd: null,
        _warning: 'Stripe not configured'
      });
    }
    
    if (!supabase) {
      return res.status(500).json({
        error: 'Authentication service not configured',
      });
    }

    const authResult = await authenticateBillingRequest(req, supabase);
    if (authResult.error || !authResult.user) {
      return res.status(authResult.statusCode).json({ error: authResult.error });
    }

    const { customerId, subscriptionId, subscriptionRecord } = await resolveBillingContext({
      supabase,
      stripe,
      userId: authResult.user.id,
      createCustomerIfMissing: false,
    });

    if (!customerId && !subscriptionId && !subscriptionRecord) {
      return res.status(200).json({
        subscription: null,
        plan: null,
        status: 'inactive',
        currentPeriodEnd: null,
        trialEnd: null,
      });
    }

    const stripeSubscription = await getStripeSubscription({
      stripe,
      customerId,
      subscriptionId,
      expand: ['data.schedule'],
    });

    if (!stripeSubscription || stripeSubscription.status === 'incomplete_expired' || stripeSubscription.status === 'unpaid') {
      return res.status(200).json({
        subscription: null,
        plan: null,
        status: 'inactive',
        currentPeriodEnd: null,
        trialEnd: null,
      });
    }

    const normalizedSubscription = buildSubscriptionPayload({
      stripeSubscription,
      subscriptionRecord,
    });

    // Strip sensitive Stripe identifiers before sending to the client.
    // The cancel and billing endpoints resolve customer/subscription IDs
    // server-side from the authenticated user_id — clients never need them.
    const {
      customerId: _cid,
      stripeSubscriptionId: _sid,
      id: _id,
      ...safeSubscription
    } = normalizedSubscription || {};

    return res.status(200).json({
      subscription: safeSubscription,
      plan: normalizedSubscription?.plan ?? null,
      tier: normalizedSubscription?.tier ?? null,
      status: normalizedSubscription?.status ?? 'inactive',
      currentPeriodStart: normalizedSubscription?.currentPeriodStart ?? null,
      currentPeriodEnd: normalizedSubscription?.currentPeriodEnd ?? null,
      trialStart: normalizedSubscription?.trialStart ?? null,
      trialEnd: normalizedSubscription?.trialEnd ?? null,
      billingCycle: normalizedSubscription?.billingCycle ?? null,
      cancelAtPeriodEnd: normalizedSubscription?.cancelAtPeriodEnd ?? false,
      cancelledAt: normalizedSubscription?.cancelledAt ?? null,
      upcomingPlanChange: normalizedSubscription?.upcomingPlanChange ?? null,
    });
  } catch (error) {
    console.error('Subscription Status Error:', error);
    return res.status(500).json({
      error: 'Failed to get subscription status. Please try again.',
    });
  }
}

