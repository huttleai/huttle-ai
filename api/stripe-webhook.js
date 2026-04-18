/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events to sync subscription status with your database.
 * Routes new members to the correct Mailchimp audience based on their subscription tier:
 *   - pro       â MAILCHIMP_PRO_AUDIENCE_ID       (Pro Members)
 *   - essentials â MAILCHIMP_ESSENTIALS_AUDIENCE_ID (Essentials Members)
 *   - builder   â MAILCHIMP_BUILDERS_AUDIENCE_ID   (Builders Club)
 *
 * Required environment variables:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * - STRIPE_WEBHOOK_SECRET: Your Stripe webhook signing secret
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 * - MAILCHIMP_API_KEY: Your Mailchimp API key (optional â also accepts legacy MAILCHIMP_FOUNDERS_API_KEY)
 * - MAILCHIMP_PRO_AUDIENCE_ID: Mailchimp audience ID for Pro Members (optional)
 * - MAILCHIMP_ESSENTIALS_AUDIENCE_ID: Mailchimp audience ID for Essentials Members (optional)
 * - MAILCHIMP_BUILDERS_AUDIENCE_ID: Mailchimp audience ID for Builders Club (optional)
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { logError, logInfo, logWarn } from './_utils/observability.js';
import { resolvePlanId } from './_utils/stripePlans.js';
import { maybeSendTrialReminder } from './_utils/trialReminderUtils.js';
import { toIsoDate } from './_utils/billing.js';
import { sendCancellationVoluntaryEmail } from './emails/send-cancellation-voluntary.js';

// Validate required environment variables at startup
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('â CRITICAL: STRIPE_SECRET_KEY is not configured');
}
if (!STRIPE_WEBHOOK_SECRET) {
  console.error('â CRITICAL: STRIPE_WEBHOOK_SECRET is not configured');
}
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('â CRITICAL: Supabase credentials are not configured');
}

// Initialize clients only if credentials are available
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const endpointSecret = STRIPE_WEBHOOK_SECRET;
const supabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Mailchimp configuration
// Accept new MAILCHIMP_API_KEY first; fall back to legacy MAILCHIMP_FOUNDERS_API_KEY for zero-downtime deploy.
const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY || process.env.MAILCHIMP_FOUNDERS_API_KEY || '';
const MAILCHIMP_SERVER_PREFIX = MAILCHIMP_API_KEY.split('-')[1] || 'us22';

// Per-tier audience IDs â set each one in Vercel environment variables.
const MAILCHIMP_AUDIENCE_IDS = {
  pro:        process.env.MAILCHIMP_PRO_AUDIENCE_ID || '',
  essentials: process.env.MAILCHIMP_ESSENTIALS_AUDIENCE_ID || '',
  builder:    process.env.MAILCHIMP_BUILDERS_AUDIENCE_ID || '',
};

// Human-readable tier labels used in the TIER merge tag and Mailchimp tags.
const TIER_LABELS = {
  pro:        'Pro',
  essentials: 'Essentials',
  builder:    'Builders Club',
};

// Disable body parsing â we need the raw body for Stripe webhook signature verification.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read the raw request body for Stripe signature verification.
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Add a new subscriber to the Mailchimp audience that matches their subscription tier.
 * Passes email, first name, last name, and a TIER merge tag so Mailchimp automations
 * can personalise messaging per tier.
 *
 * Silently skips (with a warning) if Mailchimp credentials or the audience ID for the
 * given tier are not configured â so a missing env var never blocks checkout processing.
 */
async function addToMailchimpByTier(email, firstName = '', lastName = '', tier = '') {
  const audienceId = MAILCHIMP_AUDIENCE_IDS[tier];
  const tierLabel  = TIER_LABELS[tier] || tier;

  if (!MAILCHIMP_API_KEY) {
    console.warn('Mailchimp API key not configured, skipping audience add...');
    return { success: false, skipped: true };
  }

  if (!audienceId) {
    console.warn(`No Mailchimp audience ID configured for tier "${tier}", skipping...`);
    return { success: false, skipped: true };
  }

  try {
    const mailchimpUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${audienceId}/members`;

    const memberData = {
      email_address: email,
      status: 'subscribed',
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName,
        TIER: tierLabel,
      },
      tags: [tierLabel, 'Stripe Checkout'],
    };

    const response = await fetch(mailchimpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });

    const data = await response.json();

    if (!response.ok) {
      // A 400 with title "Member Exists" is not an error â idempotent.
      if (data.title === 'Member Exists') {
        return { success: true, alreadyExists: true };
      }
      console.error(`Mailchimp error (tier=${tier}):`, data);
      return { success: false, error: data.detail };
    }

    logInfo('stripe_webhook.mailchimp_added', { email, tier, audienceId });
    return { success: true };
  } catch (error) {
    console.error(`Error adding to Mailchimp (tier=${tier}):`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Post a cancellation notification to Slack.
 * Always called on customer.subscription.deleted, regardless of cancellation type.
 * Requires SLACK_WEBHOOK_URL environment variable; silently skips if not configured.
 */
async function postCancellationToSlack({ email, plan, days, reason }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    logWarn('stripe_webhook.cancellation_slack_skipped', { reason: 'SLACK_WEBHOOK_URL not configured' });
    return;
  }

  const text = `❌ Cancellation: ${email} cancelled ${plan} after ${days} days. Reason: ${reason}`;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    logWarn('stripe_webhook.cancellation_slack_error', { status: response.status });
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
  customerName = null,
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
    customer_name: customerName || null,
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

  if (!stripe) {
    console.error('â Stripe webhook called but STRIPE_SECRET_KEY is not configured');
    return res.status(500).json({ error: 'Payment service not configured' });
  }
  if (!endpointSecret) {
    console.error('â Stripe webhook called but STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook verification not configured' });
  }
  if (!supabase) {
    console.error('â Stripe webhook called but Supabase is not configured');
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

    switch (event.type) {
      case 'checkout.session.completed': {
        try {
          const session = event.data.object;

          const customerId = session.customer;
          const subscriptionId = session.subscription;
          const customerEmail = session.customer_email || session.customer_details?.email;

          // Setup-mode sessions are payment method updates â sync new card and move on.
          if (session.mode === 'setup' && customerId && session.setup_intent) {
            try {
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
            } catch (setupErr) {
              logError('stripe_webhook.setup_session_error', { eventId: event.id, error: setupErr.message });
            }
            break;
          }

          if (!customerId) break;

          // Resolve the Supabase user â prefer the user_id embedded in checkout
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
              logError('stripe_webhook.checkout_user_lookup_failed', { eventId: event.id, customerId, error: userLookupError.message });
              break;
            }
            userId = userList?.users?.[0]?.id ?? null;
          }

          if (!userId) {
            logWarn('stripe_webhook.checkout_no_user_found', { eventId: event.id, customerId, customerEmail });
            break;
          }

          const nameParts = customerName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Backfill the stripe_customer_id on user_profile for future lookups.
          try {
            await supabase.from('user_profile').upsert({
              user_id: userId,
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
          } catch (profileErr) {
            logError('stripe_webhook.checkout_profile_upsert_failed', { eventId: event.id, userId, error: profileErr.message });
          }

          if (subscriptionId) {
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              const plan = await updateSubscriptionRecord({ userId, customerId, subscription, customerName });

              try {
                const { data: userRow, error: userFetchErr } = await supabase
                  .from('users')
                  .select('secure_account_email_sent')
                  .eq('id', userId)
                  .maybeSingle();

                const alreadySentInvite = userRow?.secure_account_email_sent === true;

                const { error: usersTierError } = await supabase
                  .from('users')
                  .update({
                    subscription_tier: plan,
                    ...(!alreadySentInvite && { secure_account_email_sent: false }),
                  })
                  .eq('id', userId);
                if (usersTierError) {
                  logError('stripe_webhook.users_subscription_tier_sync_failed', {
                    eventId: event.id,
                    userId,
                    context: 'checkout.session.completed',
                    error: usersTierError.message,
                  });
                }

                if (userFetchErr) {
                  logError('stripe_webhook.users_invite_flag_fetch_failed', { eventId: event.id, userId, error: userFetchErr.message });
                }
              } catch (usersTierErr) {
                logError('stripe_webhook.users_subscription_tier_sync_failed', {
                  eventId: event.id,
                  userId,
                  context: 'checkout.session.completed',
                  error: usersTierErr.message,
                });
              }

              // Route new member to the correct Mailchimp audience by tier.
              // Supported tiers: 'pro', 'essentials', 'builder'.
              // 'founder' plan is retired â no audience ID will be found, call is a no-op.
              if (plan === 'pro' || plan === 'essentials' || plan === 'builder') {
                await addToMailchimpByTier(customerEmail, firstName, lastName, plan);
              }
            } catch (subErr) {
              logError('stripe_webhook.checkout_subscription_sync_failed', { eventId: event.id, userId, subscriptionId, error: subErr.message });
            }
          }
        } catch (err) {
          logError('stripe_webhook.checkout_session_completed_error', { eventId: event.id, error: err.message });
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        try {
          const subscription = event.data.object;
          await maybeSendTrialReminder({ stripe, supabase, subscription });
        } catch (err) {
          logError('stripe_webhook.trial_will_end_error', { eventId: event.id, error: err.message });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        try {
          const subscription = event.data.object;
          const customerId = subscription.customer;

          const { data: profile, error: profileError } = await supabase
            .from('user_profile')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

          if (profileError && profileError.code !== 'PGRST116') {
            logError('stripe_webhook.subscription_updated_profile_lookup_failed', { eventId: event.id, customerId, error: profileError.message });
            break;
          }

          if (profile) {
            const tier = await updateSubscriptionRecord({
              userId: profile.user_id,
              customerId,
              subscription,
            });

            if (event.type === 'customer.subscription.updated') {
              try {
                const { error: usersTierError } = await supabase
                  .from('users')
                  .update({ subscription_tier: tier })
                  .eq('id', profile.user_id);
                if (usersTierError) {
                  logError('stripe_webhook.users_subscription_tier_sync_failed', {
                    eventId: event.id,
                    userId: profile.user_id,
                    context: 'customer.subscription.updated',
                    error: usersTierError.message,
                  });
                }
              } catch (usersTierErr) {
                logError('stripe_webhook.users_subscription_tier_sync_failed', {
                  eventId: event.id,
                  userId: profile.user_id,
                  context: 'customer.subscription.updated',
                  error: usersTierErr.message,
                });
              }
            }
          }
        } catch (err) {
          logError('stripe_webhook.subscription_updated_error', { eventId: event.id, error: err.message });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        try {
          const subscription = event.data.object;
          const customerId = subscription.customer;

          const { data: profile } = await supabase
            .from('user_profile')
            .select('user_id, first_name')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

          if (profile) {
            // ── Supabase subscription status update (do not modify) ──────────
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
              logError('stripe_webhook.subscription_deleted_update_failed', { eventId: event.id, userId: profile.user_id, error: delError.message });
            }
            // ── End Supabase update ───────────────────────────────────────────

            // Fetch customer email for notifications
            let userEmail = null;
            const firstName = profile.first_name || 'there';

            try {
              const customer = await stripe.customers.retrieve(customerId);
              userEmail = customer.deleted ? null : customer.email;
            } catch (custErr) {
              logWarn('stripe_webhook.subscription_deleted_customer_fetch_failed', {
                eventId: event.id,
                error: custErr.message,
              });
            }

            // Resolve plan label and days subscribed for notifications
            const priceId = subscription.items.data[0]?.price?.id;
            const planId = resolvePlanId({
              planId: subscription.metadata?.planId,
              metadataPlanId: subscription.metadata?.plan,
              priceId,
            });
            const planName = TIER_LABELS[planId] || planId || 'Pro';

            const startedAt = subscription.start_date || subscription.created;
            const endedAt = subscription.ended_at || Math.floor(Date.now() / 1000);
            const daysSubscribed = Math.max(0, Math.floor((endedAt - startedAt) / 86400));

            const cancellationReason = subscription.cancellation_details?.reason;

            // Slack — always post regardless of cancellation type
            const slackReason = cancellationReason === 'payment_failed'
              ? 'payment_failed'
              : cancellationReason === 'payment_disputed'
              ? 'disputed'
              : 'voluntary';

            try {
              await postCancellationToSlack({
                email: userEmail || customerId,
                plan: planName,
                days: daysSubscribed,
                reason: slackReason,
              });
            } catch (slackErr) {
              logWarn('stripe_webhook.cancellation_slack_failed', {
                eventId: event.id,
                error: slackErr.message,
              });
            }

            // Email — skip for involuntary cancellations (Stripe already sent retry notifications)
            if (cancellationReason === 'payment_failed' || cancellationReason === 'payment_disputed') {
              logInfo('stripe_webhook.cancellation_email_skipped', {
                eventId: event.id,
                userId: profile.user_id,
                reason: cancellationReason,
              });
            } else if (userEmail) {
              // "cancellation_requested" or null/unknown — treat as voluntary
              try {
                const accessEndDate = subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : null;

                await sendCancellationVoluntaryEmail({
                  email: userEmail,
                  firstName,
                  planName,
                  accessEndDate,
                });
              } catch (emailErr) {
                logWarn('stripe_webhook.cancellation_email_failed', {
                  eventId: event.id,
                  userId: profile.user_id,
                  error: emailErr.message,
                });
              }
            }
          }
        } catch (err) {
          logError('stripe_webhook.subscription_deleted_error', { eventId: event.id, error: err.message });
        }
        break;
      }

      case 'invoice.payment_failed': {
        try {
          const invoice = event.data.object;
          const customerId = invoice.customer;

          const { data: profile } = await supabase
            .from('user_profile')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

          if (profile) {
            await supabase
              .from('subscriptions')
              .update({
                status: 'past_due',
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', profile.user_id);
          }
        } catch (err) {
          logError('stripe_webhook.invoice_payment_failed_error', { eventId: event.id, error: err.message });
        }
        break;
      }

      case 'invoice.paid': {
        try {
          const invoice = event.data.object;
          const customerId = invoice.customer;

          const { data: profile } = await supabase
            .from('user_profile')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

          if (profile && invoice.subscription) {
            let periodStart = invoice.period_start ? toIsoDate(invoice.period_start) : null;
            let periodEnd = invoice.period_end ? toIsoDate(invoice.period_end) : null;

            try {
              const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription);
              periodStart = toIsoDate(stripeSub.current_period_start) || periodStart;
              periodEnd = toIsoDate(stripeSub.current_period_end) || periodEnd;
            } catch (subErr) {
              logWarn('stripe_webhook.invoice_paid_sub_fetch_failed', { eventId: event.id, error: subErr.message });
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
              logError('stripe_webhook.invoice_paid_update_failed', { eventId: event.id, userId: profile.user_id, error: paidError.message });
            }
          }
        } catch (err) {
          logError('stripe_webhook.invoice_paid_error', { eventId: event.id, error: err.message });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        try {
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
        } catch (err) {
          logError('stripe_webhook.invoice_payment_succeeded_error', { eventId: event.id, error: err.message });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    const marked = await markEventProcessed(event.id, event.type);
    if (!marked) {
      logWarn('stripe_webhook.idempotency_mark_failed', { eventId: event.id, eventType: event.type });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logError('stripe_webhook.unhandled_error', { error: error?.message ?? String(error) });
    return res.status(200).json({ received: true, error: 'Internal processing error â logged for review' });
  }
}
