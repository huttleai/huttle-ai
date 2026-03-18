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
import { normalizePlanId, resolvePlanId } from './_utils/stripePlans.js';

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

const STATUS_PRIORITY = {
  trialing: 5,
  active: 4,
  past_due: 3,
  canceled: 2,
  incomplete: 1,
  incomplete_expired: 0,
  unpaid: 0,
};

function toIsoDate(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function selectBestSubscription(subscriptions = []) {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return null;
  }

  return [...subscriptions].sort((first, second) => {
    const firstPriority = STATUS_PRIORITY[first.status] ?? -1;
    const secondPriority = STATUS_PRIORITY[second.status] ?? -1;

    if (firstPriority !== secondPriority) {
      return secondPriority - firstPriority;
    }

    return (second.created ?? 0) - (first.created ?? 0);
  })[0];
}

export default async function handler(req, res) {
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from Authorization header
    const authHeader = req.headers.authorization;
    
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

    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({
        error: 'Invalid authentication token',
      });
    }

    // Get user's Stripe customer ID from profile
    const { data: profile } = await supabase
      .from('user_profile')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(200).json({
        subscription: null,
        plan: null,
        status: 'inactive',
        currentPeriodEnd: null,
        trialEnd: null,
      });
    }

    // Get all subscriptions from Stripe so trialing, past_due, and canceled
    // states are surfaced consistently in the app.
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'all',
      limit: 10,
    });

    const subscription = selectBestSubscription(subscriptions.data);

    if (!subscription || subscription.status === 'incomplete_expired' || subscription.status === 'unpaid') {
      return res.status(200).json({
        subscription: null,
        plan: null,
        status: 'inactive',
        currentPeriodEnd: null,
        trialEnd: null,
      });
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const resolvedPlan = normalizePlanId(
      resolvePlanId({
        planId: subscription.metadata?.planId,
        metadataPlanId: subscription.metadata?.plan,
        priceId,
      })
    );

    return res.status(200).json({
      subscription: {
        id: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        plan: resolvedPlan,
        currentPeriodStart: toIsoDate(subscription.current_period_start),
        currentPeriodEnd: toIsoDate(subscription.current_period_end),
        trialStart: toIsoDate(subscription.trial_start),
        trialEnd: toIsoDate(subscription.trial_end),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      plan: resolvedPlan,
      status: subscription.status,
      currentPeriodEnd: toIsoDate(subscription.current_period_end),
      trialEnd: toIsoDate(subscription.trial_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error('Subscription Status Error:', error);
    return res.status(500).json({
      error: 'Failed to get subscription status. Please try again.',
    });
  }
}

