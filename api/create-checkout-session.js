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
  console.log('🚀 [create-checkout-session] Handler started');
  console.log('📋 Method:', req.method);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Checkout session request received');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
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

    // Get the app URL for redirects - REQUIRED in production
    const appUrl = process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error('❌ VITE_APP_URL or NEXT_PUBLIC_APP_URL must be configured for redirects');
      return res.status(500).json({ 
        error: 'App URL not configured',
        details: 'VITE_APP_URL or NEXT_PUBLIC_APP_URL must be set in environment variables'
      });
    }

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
      success_url: `${appUrl}/dashboard?success=true`,
      cancel_url: `${appUrl}/dashboard?canceled=true`,
      metadata: {
        planId,
        billingCycle,
        source: 'founders_club',
        // Only add supabase_user_id if user exists (not guest checkout)
        ...(userId && { supabase_user_id: userId }),
      },
      subscription_data: {
        metadata: {
          planId,
          billingCycle,
          source: 'founders_club',
          // Only add supabase_user_id if user exists (not guest checkout)
          ...(userId && { supabase_user_id: userId }),
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address (this includes name)
      billing_address_collection: 'required',
      // Collect phone number for better customer data
      phone_number_collection: {
        enabled: true,
      },
      // Custom text for the checkout page
      custom_text: {
        submit: {
          message: 'Welcome to the Huttle AI Founders Club! Your membership will be activated immediately after payment.',
        },
      },
    };

    // If we have an existing customer, use it
    if (customerId) {
      sessionOptions.customer = customerId;
    } else if (customerEmail) {
      // Pre-fill email for new customers
      sessionOptions.customer_email = customerEmail;
    }

    console.log('🎫 Creating Stripe checkout session...');
    console.log('📋 Session options:', JSON.stringify(sessionOptions, null, 2));
    
    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionOptions);
    } catch (stripeError) {
      console.error('💥 Stripe API Error:', stripeError);
      console.error('Stripe Error type:', stripeError.type);
      console.error('Stripe Error code:', stripeError.code);
      console.error('Stripe Error message:', stripeError.message);
      
      return res.status(500).json({
        error: stripeError.message || 'Stripe API error',
        type: stripeError.type,
        code: stripeError.code,
        details: 'Error creating Stripe checkout session'
      });
    }

    console.log('✅ Stripe session created successfully:', session.id);
    console.log('✅ Session URL:', session.url);
    
    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('💥 General Checkout Error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      error: error.message || 'Failed to create checkout session',
      type: error.type || error.name,
      code: error.code || 'UNKNOWN',
      details: 'Check server logs for more information'
    });
  }
}

