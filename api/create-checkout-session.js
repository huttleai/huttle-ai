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
import {
  getPurchasableCheckoutPriceIds,
  isPurchasableCheckoutPriceId,
} from './_utils/stripePlans.js';
import { authenticateBillingRequest } from './_utils/billing.js';

// Validate Stripe key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not configured in environment variables');
}

// SECURITY: Never use a placeholder key - validate at request time instead
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Initialize Supabase client for user lookup
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export default async function handler(req, res) {
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    console.warn('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate Stripe is configured
    if (!stripe) {
      console.error('[create-checkout-session] STRIPE_SECRET_KEY not configured');
      return res.status(500).json({ 
        error: 'Payment service not configured',
      });
    }

    const { priceId, planId, billingCycle } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    const purchasablePriceIds = getPurchasableCheckoutPriceIds();
    if (purchasablePriceIds.size === 0) {
      console.error('[create-checkout-session] No purchasable Essentials/Pro Stripe price IDs configured');
      return res.status(500).json({
        error: 'Payment service not configured',
      });
    }

    if (!isPurchasableCheckoutPriceId(priceId)) {
      return res.status(400).json({
        error: 'This plan is not available for new purchases. Choose Essentials or Pro.',
      });
    }

    // Get the app URL for redirects - REQUIRED in production
    const appUrl = process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error('❌ VITE_APP_URL or NEXT_PUBLIC_APP_URL must be configured for redirects');
      return res.status(500).json({ 
        error: 'App URL not configured',
        details: 'VITE_APP_URL or NEXT_PUBLIC_APP_URL must be set in environment variables'
      });
    }

    // SECURITY: Authentication is REQUIRED. Previously this endpoint accepted
    // unauthenticated calls and let the webhook guess the user via email,
    // which could attach the subscription to the wrong Supabase user when the
    // same email ever mapped to multiple auth records. We now always bind
    // checkout to the authenticated user_id so Stripe metadata is the source
    // of truth downstream.
    if (!supabase) {
      console.error('[create-checkout-session] Supabase service role client not configured');
      return res.status(500).json({ error: 'Authentication service not configured' });
    }

    const authResult = await authenticateBillingRequest(req, supabase);
    if (authResult.error || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || 'Authentication required to start checkout',
      });
    }

    const userId = authResult.user.id;
    const customerEmail = authResult.user.email || null;
    let customerId = null;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profile')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.warn('[create-checkout-session] user_profile lookup:', profileError.message);
      }

      if (profile?.stripe_customer_id) {
        // Verify the customer still exists in Stripe and, if it carries
        // supabase_user_id metadata, that it matches this authenticated user.
        try {
          const existingCustomer = await stripe.customers.retrieve(profile.stripe_customer_id);
          if (!existingCustomer.deleted) {
            const metadataUserId = existingCustomer.metadata?.supabase_user_id || null;
            if (metadataUserId && metadataUserId !== userId) {
              console.error('[create-checkout-session] cross-user customer mismatch', {
                userId,
                customerId: profile.stripe_customer_id,
                metadataUserId,
              });
              return res.status(409).json({
                error: 'Billing account conflict detected. Please contact support@huttleai.com',
              });
            }
            customerId = profile.stripe_customer_id;
            // Opportunistically stamp the customer with the user_id so future
            // matches are deterministic even if email collisions occur.
            if (!metadataUserId) {
              try {
                await stripe.customers.update(customerId, {
                  metadata: { ...existingCustomer.metadata, supabase_user_id: userId },
                });
              } catch (stampErr) {
                console.warn('[create-checkout-session] metadata stamp failed:', stampErr.message);
              }
            }
          }
        } catch (retrieveErr) {
          console.warn('[create-checkout-session] stripe.customers.retrieve failed:', retrieveErr.message);
        }
      }
    } catch (lookupErr) {
      console.warn('[create-checkout-session] customer resolve error:', lookupErr.message);
    }

    const tierMetadataMap = {
      [process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY || process.env.VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY]: { tier: 'Essentials',    billingCycle: 'Monthly' },
      [process.env.STRIPE_PRICE_ESSENTIALS_ANNUAL  || process.env.VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL]:  { tier: 'Essentials',    billingCycle: 'Annual'  },
      [process.env.STRIPE_PRICE_PRO_MONTHLY        || process.env.VITE_STRIPE_PRICE_PRO_MONTHLY]:        { tier: 'Pro',           billingCycle: 'Monthly' },
      [process.env.STRIPE_PRICE_PRO_ANNUAL         || process.env.VITE_STRIPE_PRICE_PRO_ANNUAL]:         { tier: 'Pro',           billingCycle: 'Annual'  },
    };
    const tierInfo = tierMetadataMap[priceId] ?? { tier: 'Unknown', billingCycle: 'Unknown' };

    const baseMetadata = {
      planId,
      billingCycle,
      ...tierInfo,
      source: 'app_checkout',
      ...(userId && { supabase_user_id: userId }),
    };

    const subscriptionData = {
      metadata: baseMetadata,
      trial_period_days: 7,
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel',
        },
      },
    };

    // Create checkout session options
    const sessionOptions = {
      mode: 'subscription',
      // Binds the authenticated Supabase user UUID to the Stripe session at
      // the platform level — more reliable than metadata for webhook user resolution.
      client_reference_id: userId,
      // Omit payment_method_types so Stripe can use Dashboard-configured methods.
      // if_required + a trial lets Checkout skip the card form.
      payment_method_collection: 'if_required',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.VITE_APP_URL || 'https://www.huttleai.com'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard?canceled=true`,
      metadata: baseMetadata,
      subscription_data: subscriptionData,
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
          message: 'Start your 7-day free trial. No credit card required. You will not be charged unless you add a payment method and stay after the trial.',
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

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionOptions);
    } catch (stripeError) {
      console.error('[create-checkout-session] Stripe API Error:', stripeError.type, stripeError.code, stripeError.message);
      
      // SECURITY: Don't expose internal Stripe error details to client
      return res.status(500).json({
        error: 'Payment service error. Please try again or contact support.',
      });
    }
    
    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[create-checkout-session] Error:', error.message);
    
    // SECURITY: Don't expose internal error details to client
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
    });
  }
}

