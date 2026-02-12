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

// Validate required environment variables at startup
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Log warnings for missing config (helps with debugging in Vercel logs)
if (!STRIPE_SECRET_KEY) {
  console.error('❌ CRITICAL: STRIPE_SECRET_KEY is not configured');
}
if (!STRIPE_WEBHOOK_SECRET) {
  console.error('❌ CRITICAL: STRIPE_WEBHOOK_SECRET is not configured');
}
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ CRITICAL: Supabase credentials are not configured');
}

// Initialize clients only if credentials are available
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const endpointSecret = STRIPE_WEBHOOK_SECRET;
const supabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;
const processedEventIds = new Set();
const MAX_PROCESSED_EVENTS = 500;

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
// Note: Server-side code should use non-VITE_ prefixed env vars
// We check both for backwards compatibility during migration
function getPlanFromPriceId(priceId) {
  if (!priceId) return 'free';
  
  const priceMap = {
    // Essentials tier
    [process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY || process.env.VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY]: 'essentials',
    [process.env.STRIPE_PRICE_ESSENTIALS_ANNUAL || process.env.VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL]: 'essentials',
    // Pro tier
    [process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.VITE_STRIPE_PRICE_PRO_MONTHLY]: 'pro',
    [process.env.STRIPE_PRICE_PRO_ANNUAL || process.env.VITE_STRIPE_PRICE_PRO_ANNUAL]: 'pro',
    // Founder tier
    [process.env.STRIPE_PRICE_FOUNDER_ANNUAL || process.env.VITE_STRIPE_PRICE_FOUNDER_ANNUAL]: 'founder',
  };
  
  // Remove undefined keys that might have been added
  const plan = priceMap[priceId];
  if (plan) return plan;
  
  // Log unknown price IDs for debugging
  console.warn(`Unknown price ID: ${priceId} - defaulting to free tier`);
  return 'free';
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

function hasProcessedEvent(eventId) {
  return !!eventId && processedEventIds.has(eventId);
}

function markEventProcessed(eventId) {
  if (!eventId) return;
  processedEventIds.add(eventId);
  if (processedEventIds.size > MAX_PROCESSED_EVENTS) {
    const oldestEventId = processedEventIds.values().next().value;
    if (oldestEventId) {
      processedEventIds.delete(oldestEventId);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate required services are configured
  if (!stripe) {
    console.error('❌ Stripe webhook called but STRIPE_SECRET_KEY is not configured');
    return res.status(500).json({ error: 'Payment service not configured' });
  }
  if (!endpointSecret) {
    console.error('❌ Stripe webhook called but STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook verification not configured' });
  }
  if (!supabase) {
    console.error('❌ Stripe webhook called but Supabase is not configured');
    return res.status(500).json({ error: 'Database service not configured' });
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

    console.log('[stripe-webhook] Received event:', event.type, event.id);

    if (hasProcessedEvent(event.id)) {
      console.log('[stripe-webhook] Duplicate event ignored:', event.id);
      return res.status(200).json({ received: true, duplicate: true });
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
          // Find user by email - use filtered query instead of listing all users
          // SECURITY & PERFORMANCE: listUsers() loads ALL users into memory which is 
          // both slow and a potential DoS vector as the user base grows
          const { data: userList, error: userLookupError } = await supabase.auth.admin.listUsers({
            filter: `email.eq.${customerEmail}`,
            page: 1,
            perPage: 1,
          });
          if (userLookupError) {
            console.error('Error finding auth user by email:', userLookupError);
            break;
          }
          const user = userList?.users?.[0];
          
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
          } else {
            console.warn('No auth user found for checkout email:', customerEmail);
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const { data: profile, error: profileError } = await supabase
          .from('user_profile')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error finding user profile by customer id:', profileError);
          break;
        }

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

        // Find user by Stripe customer ID (maybeSingle to avoid crash if profile missing)
        const { data: profile } = await supabase
          .from('user_profile')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

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

        // Find user by Stripe customer ID (maybeSingle to avoid crash if profile missing)
        const { data: profile } = await supabase
          .from('user_profile')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

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

    markEventProcessed(event.id);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred processing this webhook.' });
  }
}

