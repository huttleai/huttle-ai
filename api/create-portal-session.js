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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate Stripe is configured
  if (!stripe) {
    console.error('❌ Portal session requested but STRIPE_SECRET_KEY is not configured');
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  try {
    // Get the app URL for redirects - REQUIRED in production
    const appUrl = process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error('❌ VITE_APP_URL or NEXT_PUBLIC_APP_URL must be configured for redirects');
      return res.status(500).json({ error: 'App URL not configured for redirects' });
    }

    // Get user from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !supabase) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    // Get user's Stripe customer ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile lookup error:', profileError);
      return res.status(500).json({ error: 'Failed to lookup user profile' });
    }

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ 
        error: 'No subscription found. Please subscribe to a plan first.' 
      });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/subscription`,
    });

    return res.status(200).json({
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe Portal Error:', error);
    return res.status(500).json({
      error: 'Failed to create portal session. Please try again.',
    });
  }
}

