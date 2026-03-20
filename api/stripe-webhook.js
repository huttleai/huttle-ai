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
import { toIsoDate } from './_utils/billing.js';

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

async function updateSubscriptionRecord({
  userId,
  customerId,
  subscription,
}) {
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = resolvePlanId({
    planId: subscription.metadata?.planId,
    metadataPlanId: subscription.metadata?.plan,
    priceId,
  });

  const payload = {
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    tier: plan,
    status: subscription.status,
    current_period_start: toIsoDate(subscription.current_period_start),
    current_period_end: toIsoDate(subscription.current_period_end),
    trial_start: subscription.trial_start ? toIsoDate(subscription.trial_start) : null,
    trial_end: subscription.trial_end ? toIsoDate(subscription.trial_end) : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancelled_at: subscription.canceled_at ? toIsoDate(subscription.canceled_at) : null,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase
    .from('subscriptions')
    .upsert(payload, { onConflict: 'user_id' });

  if (error?.message?.toLowerCase().includes('cancelled_at')) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.cancelled_at;
    error = (await supabase
      .from('subscriptions')
      .upsert(fallbackPayload, { onConflict: 'user_id' })).error;
  }

  if (error?.message?.toLowerCase().includes('trial_start') || error?.message?.toLowerCase().includes('trial_end')) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.trial_start;
    delete fallbackPayload.trial_end;
    error = (await supabase
      .from('subscriptions')
      .upsert(fallbackPayload, { onConflict: 'user_id' })).error;
  }

  if (error?.message?.toLowerCase().includes('cancelled_at')) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.cancelled_at;
    delete fallbackPayload.trial_start;
    delete fallbackPayload.trial_end;
    error = (await supabase
      .from('subscriptions')
      .upsert(fallbackPayload, { onConflict: 'user_id' })).error;
  }

  if (error) {
    throw new Error(error.message || 'Failed to sync subscription record');
  }

  return plan;
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
        
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const customerEmail = session.customer_email || session.customer_details?.email;

        // Setup-mode sessions are payment method updates — sync new card and move on.
        if (session.mode === 'setup' && customerId && session.setup_intent) {
          const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent);
          const paymentMethodId = typeof setupIntent.payment_method === 'string'
            ? setupIntent.payment_method
            : setupIntent.payment_method?.id;

          if (paymentMethodId) {
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });

            const { data: subscriptionRecord } = await supabase
              .from('subscriptions')
              .select('stripe_subscription_id')
              .eq('stripe_customer_id', customerId)
              .maybeSingle();

            if (subscriptionRecord?.stripe_subscription_id) {
              await stripe.subscriptions.update(subscriptionRecord.stripe_subscription_id, {
                default_payment_method: paymentMethodId,
              });
            }
          }

          break;
        }

        if (!customerId) break;

        // Resolve the Supabase user — prefer the user_id embedded in checkout
        // metadata (most reliable), then fall back to email lookup.
        let userId = session.metadata?.supabase_user_id || null;
        let customerName = session.customer_details?.name || '';

        if (!userId && customerEmail) {
          const { data: userList, error: userLookupError } = await supabase.auth.admin.listUsers({
            filter: `email.eq.${customerEmail}`,
            page: 1,
            perPage: 1,
          });
          if (userLookupError) {
            console.error('Error finding auth user by email:', userLookupError);
            break;
          }
          userId = userList?.users?.[0]?.id ?? null;
        }

        if (!userId) {
          console.warn('checkout.session.completed: no Supabase user found for customer', customerId, 'email', customerEmail);
          break;
        }

        const nameParts = customerName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Backfill the stripe_customer_id on user_profile for future lookups.
        await supabase.from('user_profile').upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const plan = await updateSubscriptionRecord({ userId, customerId, subscription });

          if (plan === 'pro' || plan === 'founder' || plan === 'builder') {
            await addToFoundersClub(customerEmail, firstName, lastName);
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
          await updateSubscriptionRecord({
            userId: profile.user_id,
            customerId,
            subscription,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const { data: profile } = await supabase
          .from('user_profile')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (profile) {
          // Reset tier to 'free' so paid-feature gates fail immediately.
          // cancelled_at may not exist yet on older schemas — fall back gracefully.
          const deletionPayload = {
            tier: 'free',
            status: 'canceled',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
            cancelled_at: new Date().toISOString(),
          };

          let { error: delError } = await supabase
            .from('subscriptions')
            .update(deletionPayload)
            .eq('user_id', profile.user_id);

          if (delError?.message?.toLowerCase().includes('cancelled_at')) {
            const { cancelled_at: _ca, ...fallback } = deletionPayload;
            delError = (await supabase.from('subscriptions').update(fallback).eq('user_id', profile.user_id)).error;
          }

          if (delError) {
            console.error('customer.subscription.deleted update error:', delError.message);
          }
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

      // invoice.paid fires on every invoice that transitions to paid, including
      // annual renewals. This is the canonical event for clearing past_due state
      // and refreshing billing period dates after every successful renewal.
      case 'invoice.paid': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const { data: profile } = await supabase
          .from('user_profile')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (profile && invoice.subscription) {
          // Fetch the live subscription to get accurate period dates.
          let periodStart = invoice.period_start ? toIsoDate(invoice.period_start) : null;
          let periodEnd = invoice.period_end ? toIsoDate(invoice.period_end) : null;

          try {
            const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription);
            periodStart = toIsoDate(stripeSub.current_period_start) || periodStart;
            periodEnd = toIsoDate(stripeSub.current_period_end) || periodEnd;
          } catch (subErr) {
            logWarn('stripe_webhook.invoice_paid_sub_fetch_failed', { error: subErr.message });
          }

          const updatePayload = {
            status: 'active',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
            ...(periodStart && { current_period_start: periodStart }),
            ...(periodEnd && { current_period_end: periodEnd }),
          };

          const { error: paidError } = await supabase
            .from('subscriptions')
            .update(updatePayload)
            .eq('user_id', profile.user_id);

          if (paidError) {
            console.error('invoice.paid update error:', paidError.message);
          }
        }
        break;
      }

      // invoice.payment_succeeded is a narrower event than invoice.paid — it only
      // fires when a payment attempt succeeds (not for manual invoice-paid marks).
      // Keep both for full coverage; period dates are refreshed here too.
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const { data: profile } = await supabase
          .from('user_profile')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (profile) {
          const updatePayload = {
            status: 'active',
            updated_at: new Date().toISOString(),
            ...(invoice.period_start && { current_period_start: toIsoDate(invoice.period_start) }),
            ...(invoice.period_end && { current_period_end: toIsoDate(invoice.period_end) }),
          };

          await supabase
            .from('subscriptions')
            .update(updatePayload)
            .eq('user_id', profile.user_id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Best-effort idempotency mark. If the write fails (e.g. table not yet
    // migrated), log a warning but still return 200 so Stripe does not retry
    // an event we already processed successfully.
    const marked = await markEventProcessed(event.id, event.type);
    if (!marked) {
      logWarn('stripe_webhook.idempotency_mark_failed', { eventId: event.id, eventType: event.type });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred processing this webhook.' });
  }
}

