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
import { logError, logInfo, logWarn } from './_utils/observability.js';
import { resolvePlanId } from './_utils/stripePlans.js';
import { maybeSendTrialReminder } from './_utils/trialReminderUtils.js';

// Validate required environment variables at startup
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
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

// Mailchimp configuration (optional)
const MAILCHIMP_FOUNDERS_API_KEY = process.env.MAILCHIMP_FOUNDERS_API_KEY || '';
const MAILCHIMP_FOUNDERS_AUDIENCE_ID = process.env.MAILCHIMP_FOUNDERS_AUDIENCE_ID || '';
const MAILCHIMP_SERVER_PREFIX = MAILCHIMP_FOUNDERS_API_KEY.split('-')[1] || 'us22';
const USERS_PAGE_SIZE = 200;
const MAX_USER_LOOKUP_PAGES = 50;

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

// Add member to Mailchimp Founders Club
async function addToFoundersClub(email, firstName = '', lastName = '') {
  // Skip if Mailchimp is not configured
  if (!MAILCHIMP_FOUNDERS_API_KEY || !MAILCHIMP_FOUNDERS_AUDIENCE_ID) {
    console.warn('Mailchimp Founders Club not configured, skipping...');
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
        return { success: true, alreadyExists: true };
      }
      console.error('Mailchimp error:', data);
      return { success: false, error: data.detail };
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding to Founders Club:', error);
    return { success: false, error: error.message };
  }
}

async function hasProcessedEvent(eventId) {
  if (!eventId || !supabase) return false;

  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    logWarn('stripe_webhook.idempotency_check_failed', { eventId, error: error.message });
    return false;
  }

  return Boolean(data?.event_id);
}

async function markEventProcessed(eventId, eventType) {
  if (!eventId || !supabase) return false;

  const { error } = await supabase
    .from('stripe_webhook_events')
    .upsert(
      {
        event_id: eventId,
        event_type: eventType || 'unknown',
        processed_at: new Date().toISOString(),
      },
      {
        onConflict: 'event_id',
        ignoreDuplicates: true,
      }
    );

  if (error) {
    logError('stripe_webhook.idempotency_mark_failed', { eventId, error: error.message });
    return false;
  }

  return true;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function findAuthUserById(userId) {
  if (!userId || !supabase) return { user: null, error: null };

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    return { user: null, error };
  }

  return { user: data?.user || null, error: null };
}

async function findAuthUserByEmail(customerEmail) {
  if (!customerEmail || !supabase) return { user: null, error: null };

  const targetEmail = normalizeEmail(customerEmail);
  if (!targetEmail) return { user: null, error: null };

  // listUsers does not support server-side email filtering, so paginate and match locally.
  for (let page = 1; page <= MAX_USER_LOOKUP_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USERS_PAGE_SIZE,
    });

    if (error) {
      return { user: null, error };
    }

    const users = data?.users || [];
    const matchedUser = users.find((candidate) => normalizeEmail(candidate?.email) === targetEmail);
    if (matchedUser) {
      return { user: matchedUser, error: null };
    }

    if (users.length < USERS_PAGE_SIZE) {
      break;
    }
  }

  return { user: null, error: null };
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

    logInfo('stripe_webhook.received', { eventType: event.type, eventId: event.id });

    if (await hasProcessedEvent(event.id)) {
      logInfo('stripe_webhook.duplicate_ignored', { eventId: event.id });
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
        const metadataUserId = session.metadata?.supabase_user_id;

        if (customerId) {
          let user = null;

          if (metadataUserId) {
            const { user: metadataUser, error: metadataLookupError } = await findAuthUserById(metadataUserId);
            if (metadataLookupError) {
              throw new Error(`Failed to resolve metadata user (${metadataUserId}): ${metadataLookupError.message}`);
            }
            user = metadataUser;
          }

          if (!user) {
            const { user: emailUser, error: emailLookupError } = await findAuthUserByEmail(customerEmail);
            if (emailLookupError) {
              throw new Error(`Failed to resolve checkout user by email (${customerEmail}): ${emailLookupError.message}`);
            }
            user = emailUser;
          }
          
          if (user) {
            // Extract customer name from session
            const customerName = session.customer_details?.name || '';
            const nameParts = customerName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Update or create user profile with Stripe customer ID
            const { error: profileUpsertError } = await supabase
              .from('user_profile')
              .upsert({
                user_id: user.id,
                stripe_customer_id: customerId,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id',
              });
            if (profileUpsertError) {
              throw new Error(`Failed to upsert user_profile for user ${user.id}: ${profileUpsertError.message}`);
            }

            // Get subscription details to determine plan
            if (subscriptionId) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              const priceId = subscription.items.data[0]?.price?.id;
              const plan = resolvePlanId({
                planId: subscription.metadata?.planId,
                metadataPlanId: subscription.metadata?.plan,
                priceId,
              });

              // Update subscription in database
              const { error: subscriptionUpsertError } = await supabase
                .from('subscriptions')
                .upsert({
                  user_id: user.id,
                  stripe_subscription_id: subscriptionId,
                  stripe_customer_id: customerId,
                  tier: plan,
                  status: subscription.status,
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
                  trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
                  cancel_at_period_end: subscription.cancel_at_period_end,
                  updated_at: new Date().toISOString(),
                }, {
                  onConflict: 'user_id',
                });
              if (subscriptionUpsertError) {
                throw new Error(`Failed to upsert subscription for user ${user.id}: ${subscriptionUpsertError.message}`);
              }

              // Add launch and paid members to the founding audience workflow.
              if (customerEmail && (plan === 'pro' || plan === 'founder' || plan === 'builder')) {
                await addToFoundersClub(customerEmail, firstName, lastName);
              }
            }
          } else {
            if (metadataUserId) {
              throw new Error(`Checkout metadata user not found: ${metadataUserId}`);
            }
            console.warn('No auth user found for checkout email:', customerEmail);
          }
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object;
        await maybeSendTrialReminder({ stripe, supabase, subscription });
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
          const plan = resolvePlanId({
            planId: subscription.metadata?.planId,
            metadataPlanId: subscription.metadata?.plan,
            priceId,
          });

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
              trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
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
          // Preserve the last paid tier for history, but remove active access.
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              cancel_at_period_end: false,
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

    const marked = await markEventProcessed(event.id, event.type);
    if (!marked) {
      return res.status(500).json({ error: 'Failed to persist webhook idempotency state.' });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred processing this webhook.' });
  }
}

