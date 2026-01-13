/**
 * Stripe Checkout Session API Endpoint
 * 
 * Creates a Stripe Checkout session for subscription upgrades.
 * Deploy this to Vercel as a serverless function.
 * 
 * Required environment variables:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * - VITE_APP_URL or NEXT_PUBLIC_APP_URL: Your app's URL for redirects
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';

// Validate Stripe key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not configured in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Initialize Supabase client for user lookup
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export default async function handler(req, res) {
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Checkout session request received');
    console.log('📦 Request body:', req.body);
    
    // Validate Stripe key at runtime
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ 
        error: 'Stripe configuration error',
        details: 'STRIPE_SECRET_KEY is not set in environment variables'
      });
    }

    const { priceId, planId, billingCycle } = req.body;

    if (!priceId) {
      console.error('❌ No price ID provided in request');
      return res.status(400).json({ error: 'Price ID is required' });
    }
    
    console.log('💰 Price ID:', priceId);
    console.log('📋 Plan ID:', planId);
    console.log('📅 Billing Cycle:', billingCycle);

    // Get the app URL for redirects
    const appUrl = process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';

    // Get user from Authorization header if available
    let customerId = null;
    let customerEmail = null;
    let userId = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && supabase) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (user && !error) {
          userId = user.id;
          customerEmail = user.email;
          
          // Check if user already has a Stripe customer ID
          const { data: profile } = await supabase
            .from('user_profile')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.stripe_customer_id) {
            customerId = profile.stripe_customer_id;
          }
        }
      } catch (e) {
        console.warn('Could not get user from auth header:', e.message);
      }
    }

    // Create checkout session options
    const sessionOptions = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscription?canceled=true`,
      metadata: {
        planId,
        billingCycle,
        // Only add supabase_user_id if user exists (not guest checkout)
        ...(userId && { supabase_user_id: userId }),
      },
      subscription_data: {
        metadata: {
          planId,
          billingCycle,
          // Only add supabase_user_id if user exists (not guest checkout)
          ...(userId && { supabase_user_id: userId }),
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address
      billing_address_collection: 'required',
    };

    // If we have an existing customer, use it
    if (customerId) {
      sessionOptions.customer = customerId;
    } else if (customerEmail) {
      // Pre-fill email for new customers
      sessionOptions.customer_email = customerEmail;
    }

    console.log('🎫 Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create(sessionOptions);

    console.log('✅ Stripe session created successfully:', session.id);
    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('💥 Stripe Checkout Error:', error);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    return res.status(500).json({
      error: error.message || 'Failed to create checkout session',
      type: error.type,
      code: error.code,
      details: 'Check server logs for more information'
    });
  }
}

