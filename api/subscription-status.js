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

// Validate and initialize Stripe (server-side: process.env.STRIPE_SECRET_KEY — never VITE_)
const STRIPE_SECRET_KEY = (process.env.STRIPE_SECRET_KEY || '').trim();
const mode = STRIPE_SECRET_KEY.startsWith('sk_test') ? 'TEST' : 'LIVE';
if (STRIPE_SECRET_KEY) {
  console.log('[Stripe] Running in', mode, 'mode');
} else {
  console.error('❌ STRIPE_SECRET_KEY is not configured');
}

let stripe = null;
if (STRIPE_SECRET_KEY) {
  try {
    stripe = new Stripe(STRIPE_SECRET_KEY);
  } catch (initErr) {
    console.error('[Stripe] SDK initialization failed:', initErr);
    stripe = null;
  }
}

// Service role client for server-side user lookup (not the anon key)
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const supabase =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export default async function handler(req, res) {
  try {
    setCorsHeaders(req, res);

    if (handlePreflight(req, res)) return;

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!STRIPE_SECRET_KEY) {
      console.error('Stripe secret key not configured');
      return res.status(500).json({ error: 'Stripe secret key not configured' });
    }

    if (!stripe) {
      console.error('Stripe client not initialized');
      return res.status(500).json({
        error: 'Failed to get subscription status. Please try again.',
      });
    }

    if (!supabase) {
      console.error('Supabase service role client not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
      return res.status(500).json({
        error: 'Authentication service not configured',
      });
    }

    const authResult = await authenticateBillingRequest(req, supabase);
    if (authResult?.error || !authResult?.user) {
      const statusCode =
        typeof authResult?.statusCode === 'number' &&
        authResult.statusCode >= 400 &&
        authResult.statusCode < 600
          ? authResult.statusCode
          : 401;
      return res.status(statusCode).json({ error: authResult?.error ?? 'Authentication required' });
    }

    const billingContext = await resolveBillingContext({
      supabase,
      stripe,
      userId: authResult.user.id,
      createCustomerIfMissing: false,
    });

    const customerId = billingContext?.customerId ?? null;
    const subscriptionId = billingContext?.subscriptionId ?? null;
    const subscriptionRecord = billingContext?.subscriptionRecord ?? null;

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

    const subStatus = stripeSubscription?.status;
    if (
      !stripeSubscription ||
      subStatus === 'incomplete_expired' ||
      subStatus === 'unpaid'
    ) {
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

    if (!normalizedSubscription) {
      return res.status(200).json({
        subscription: null,
        plan: null,
        status: 'inactive',
        currentPeriodEnd: null,
        trialEnd: null,
      });
    }

    // Strip sensitive Stripe identifiers before sending to the client.
    // The cancel and billing endpoints resolve customer/subscription IDs
    // server-side from the authenticated user_id — clients never need them.
    const {
      customerId: _cid,
      stripeSubscriptionId: _sid,
      id: _id,
      ...safeSubscription
    } = normalizedSubscription;

    return res.status(200).json({
      subscription: safeSubscription,
      plan: normalizedSubscription.plan ?? null,
      tier: normalizedSubscription.tier ?? null,
      status: normalizedSubscription.status ?? 'inactive',
      currentPeriodStart: normalizedSubscription.currentPeriodStart ?? null,
      currentPeriodEnd: normalizedSubscription.currentPeriodEnd ?? null,
      trialStart: normalizedSubscription.trialStart ?? null,
      trialEnd: normalizedSubscription.trialEnd ?? null,
      billingCycle: normalizedSubscription.billingCycle ?? null,
      cancelAtPeriodEnd: normalizedSubscription.cancelAtPeriodEnd ?? false,
      cancelledAt: normalizedSubscription.cancelledAt ?? null,
      upcomingPlanChange: normalizedSubscription.upcomingPlanChange ?? null,
    });
  } catch (error) {
    console.error('Subscription Status Error:', error?.message ?? error, error);
    return res.status(500).json({
      error: 'Failed to get subscription status. Please try again.',
    });
  }
}
