/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events to sync subscription status with your database.
 * Also adds Founders Club members to Mailchimp when they complete checkout.
 * 
 * Required environment variables:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * - STRIPE_WEBHOOK_SECRET: Your Stripe webhook signing secret
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 * - MAILCHIMP_FOUNDERS_API_KEY: Your Mailchimp API key (optional)
 * - MAILCHIMP_FOUNDERS_AUDIENCE_ID: Your Mailchimp Founders Club audience ID (optional)
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Supabase with service role key for admin access
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mailchimp configuration (optional)
const MAILCHIMP_FOUNDERS_API_KEY = process.env.MAILCHIMP_FOUNDERS_API_KEY || '';
const MAILCHIMP_FOUNDERS_AUDIENCE_ID = process.env.MAILCHIMP_FOUNDERS_AUDIENCE_ID || '';
const MAILCHIMP_SERVER_PREFIX = MAILCHIMP_FOUNDERS_API_KEY.split('-')[1] || 'us22';

// Disable body parsing - we need the raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to get raw body
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Map Stripe price IDs to plan tiers
function getPlanFromPriceId(priceId) {
  const priceMap = {
    [process.env.VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY]: 'essentials',
    [process.env.VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL]: 'essentials',
    [process.env.VITE_STRIPE_PRICE_PRO_MONTHLY]: 'pro',
    [process.env.VITE_STRIPE_PRICE_PRO_ANNUAL]: 'pro',
  };
  return priceMap[priceId] || 'free';
}

// Add member to Mailchimp Founders Club
async function addToFoundersClub(email, firstName = '', lastName = '') {
  // Skip if Mailchimp is not configured
  if (!MAILCHIMP_FOUNDERS_API_KEY || !MAILCHIMP_FOUNDERS_AUDIENCE_ID) {
    console.log('⚠️ Mailchimp Founders Club not configured, skipping...');
    return { success: false, skipped: true };
  }

  try {
    const mailchimpUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_FOUNDERS_AUDIENCE_ID}/members`;
    
    const memberData = {
      email_address: email,
      status: 'subscribed',
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName,
      },
      tags: ['Founders Club', 'Stripe Checkout']
    };

    const response = await fetch(mailchimpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${MAILCHIMP_FOUNDERS_API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });

    const data = await response.json();

    if (!response.ok) {
      // Member already exists is not an error
      if (data.title === 'Member Exists') {
        console.log(`✅ Founders Club: ${email} already in list`);
        return { success: true, alreadyExists: true };
      }
      console.error('Mailchimp error:', data);
      return { success: false, error: data.detail };
    }

    console.log(`🎉 Added to Founders Club: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error adding to Founders Club:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Get customer email and subscription info
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const customerEmail = session.customer_email || session.customer_details?.email;

        if (customerEmail && customerId) {
          // Find user by email and update their profile with Stripe customer ID
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const user = authUsers?.users?.find(u => u.email === customerEmail);
          
          if (user) {
            // Extract customer name from session
            const customerName = session.customer_details?.name || '';
            const nameParts = customerName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Update or create user profile with Stripe customer ID
            await supabase
              .from('user_profile')
              .upsert({
                user_id: user.id,
                stripe_customer_id: customerId,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id',
              });

            // Get subscription details to determine plan
            if (subscriptionId) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              const priceId = subscription.items.data[0]?.price?.id;
              const plan = subscription.metadata?.planId || getPlanFromPriceId(priceId);

              // Update subscription in database
              await supabase
                .from('subscriptions')
                .upsert({
                  user_id: user.id,
                  stripe_subscription_id: subscriptionId,
                  stripe_customer_id: customerId,
                  tier: plan,
                  status: 'active',
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                }, {
                  onConflict: 'user_id',
                });

              // Add to Mailchimp Founders Club (for Pro/Founder tier members)
              if (plan === 'pro' || plan === 'founder') {
                await addToFoundersClub(customerEmail, firstName, lastName);
              }
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const { data: profile } = await supabase
          .from('user_profile')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          const priceId = subscription.items.data[0]?.price?.id;
          const plan = subscription.metadata?.planId || getPlanFromPriceId(priceId);

          await supabase
            .from('subscriptions')
            .upsert({
              user_id: profile.user_id,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              tier: plan,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id',
            });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const { data: profile } = await supabase
          .from('user_profile')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // Update subscription to canceled/free tier
          await supabase
            .from('subscriptions')
            .update({
              tier: 'free',
              status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', profile.user_id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Find user by Stripe customer ID
        const { data: profile } = await supabase
          .from('user_profile')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // Update subscription status to past_due
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', profile.user_id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

