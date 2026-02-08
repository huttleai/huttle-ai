/**
 * Subscription Status API Endpoint
 * 
 * Returns the current user's subscription status.
 * 
 * Required environment variables:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';

// Validate and initialize Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not configured');
}
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// Initialize Supabase client for user lookup
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
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
    // Get user from Authorization header
    const authHeader = req.headers.authorization;
    
    // If Stripe is not configured, return free tier (graceful degradation)
    if (!stripe) {
      console.warn('Stripe not configured - returning freemium status');
      return res.status(200).json({
        subscription: null,
        plan: 'freemium',
        status: 'active',
        currentPeriodEnd: null,
        _warning: 'Stripe not configured'
      });
    }
    
    if (!authHeader || !supabase) {
      // Return free tier status for unauthenticated users
      return res.status(200).json({
        subscription: null,
        plan: 'freemium',
        status: 'active',
        currentPeriodEnd: null,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(200).json({
        subscription: null,
        plan: 'freemium',
        status: 'active',
        currentPeriodEnd: null,
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
        plan: 'freemium',
        status: 'active',
        currentPeriodEnd: null,
      });
    }

    // Get active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // Check for canceled subscriptions that are still active
      const canceledSubs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'canceled',
        limit: 1,
      });

      if (canceledSubs.data.length > 0) {
        const sub = canceledSubs.data[0];
        return res.status(200).json({
          subscription: sub.id,
          plan: sub.metadata?.planId || 'freemium',
          status: 'canceled',
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        });
      }

      return res.status(200).json({
        subscription: null,
        plan: 'freemium',
        status: 'active',
        currentPeriodEnd: null,
      });
    }

    const subscription = subscriptions.data[0];
    
    return res.status(200).json({
      subscription: subscription.id,
      plan: subscription.metadata?.planId || 'freemium',
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error('Subscription Status Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get subscription status',
    });
  }
}

