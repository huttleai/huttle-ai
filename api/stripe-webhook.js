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

  // Cross-user safety check: refuse to overwrite another user's subscription
  // row if this customer_id or subscription_id is already bound to a different
  // user_id in our database. This prevents a misconfigured or corrupted
  // customer mapping from silently hijacking another account's billing state.
  const { data: existingBySubId } = await supabase
    .from('subscriptions')
    .select('user_id, stripe_customer_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (existingBySubId && existingBySubId.user_id && existingBySubId.user_id !== userId) {
    logError('stripe_webhook.cross_user_subscription_conflict', {
      incomingUserId: userId,
      existingUserId: existingBySubId.user_id,
      subscriptionId: subscription.id,
      customerId,
    });
    throw new Error(
      `Stripe subscription ${subscription.id} is already bound to a different user — aborting sync.`
    );
  }

  const { data: existingByCustomerId } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .neq('user_id', userId)
    .maybeSingle();

  if (existingByCustomerId?.user_id) {
    logError('stripe_webhook.cross_user_customer_conflict', {
      incomingUserId: userId,
      existingUserId: existingByCustomerId.user_id,
      customerId,
      subscriptionId: subscription.id,
    });
    throw new Error(
      `Stripe customer ${customerId} is already bound to user ${existingByCustomerId.user_id} — refusing to rebind to ${userId}.`
    );
  }

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

          console.log('[checkout.session.completed] received', {
            eventId: event.id,
            sessionId: session.id,
            mode: session.mode,
            customerId,
            subscriptionId,
            hasClientReferenceId: Boolean(session.client_reference_id),
            hasMetadataUserId: Boolean(session.metadata?.supabase_user_id),
            customerEmail,
          });

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

          // Resolve the Supabase user. Priority order:
          // 1. client_reference_id — dedicated Stripe field set at session creation (most reliable)
          // 2. session.metadata.supabase_user_id — stamped in metadata as a belt-and-suspenders backup
          // 3. Email lookup — last resort for sessions created before client_reference_id was added
          let userId = session.client_reference_id || session.metadata?.supabase_user_id || null;
          let customerName = session.customer_details?.name || '';

          console.log('[checkout.session.completed] user resolution', {
            eventId: event.id,
            sessionId: session.id,
            customerId,
            subscriptionId,
            source: session.client_reference_id
              ? 'client_reference_id'
              : session.metadata?.supabase_user_id
              ? 'metadata'
              : 'email_fallback',
            userId,
          });

          if (!userId && customerEmail) {
            console.log('[checkout.session.completed] falling back to email lookup', { eventId: event.id, customerEmail });
            const { data: userList, error: userLookupError } = await supabase.auth.admin.listUsers({
              filter: `email.eq.${customerEmail}`,
              page: 1,
              perPage: 1,
            });
            if (userLookupError) {
              logError('stripe_webhook.checkout_user_lookup_failed', { eventId: event.id, customerId, error: userLookupError.message });
              console.error('[checkout.session.completed] email lookup failed — cannot proceed', { eventId: event.id, error: userLookupError.message });
              break;
            }
            userId = userList?.users?.[0]?.id ?? null;
            console.log('[checkout.session.completed] email lookup result', { eventId: event.id, found: Boolean(userId), userId });
          }

          if (!userId) {
            logWarn('stripe_webhook.checkout_no_user_found', { eventId: event.id, customerId, customerEmail });
            console.error('[checkout.session.completed] FAILED: could not resolve Supabase user', {
              eventId: event.id,
              customerId,
              customerEmail,
              clientReferenceId: session.client_reference_id,
            });
            break;
          }

          const nameParts = customerName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Backfill the stripe_customer_id on user_profile for future lookups.
          console.log('[checkout.session.completed] backfilling user_profile', { eventId: event.id, userId, customerId });
          try {
            await supabase.from('user_profile').upsert({
              user_id: userId,
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
          } catch (profileErr) {
            logError('stripe_webhook.checkout_profile_upsert_failed', { eventId: event.id, userId, error: profileErr.message });
            console.error('[checkout.session.completed] user_profile upsert failed', { eventId: event.id, userId, error: profileErr.message });
          }

          if (subscriptionId) {
            console.log('[checkout.session.completed] syncing subscription record', { eventId: event.id, userId, subscriptionId });
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              const plan = await updateSubscriptionRecord({ userId, customerId, subscription, customerName });
              console.log('[checkout.session.completed] subscription synced successfully', { eventId: event.id, userId, plan });

                try {
                  const { data: userRow, error: userFetchErr } = await supabase
                    .from('users')
                    .select('secure_account_email_sent')
                    .eq('id', userId)
                    .maybeSingle();

                  const alreadySentInvite = userRow?.secure_account_email_sent === true;

                  if (userFetchErr) {
                    logError('stripe_webhook.users_invite_flag_fetch_failed', { eventId: event.id, userId, error: userFetchErr.message });
                  }

                  // Update subscription_tier only — secure_account_email_sent is handled separately below.
                  const { error: usersTierError } = await supabase
                    .from('users')
                    .update({
                      subscription_tier: plan,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', userId);
                  if (usersTierError) {
                    logError('stripe_webhook.users_subscription_tier_sync_failed', {
                      eventId: event.id,
                      userId,
                      context: 'checkout.session.completed',
                      error: usersTierError.message,
                    });
                    console.error('[checkout.session.completed] users.subscription_tier sync failed', { eventId: event.id, userId, error: usersTierError.message });
                  }

                  // Bug 2 Fix: Send secure account invite email and flip flag to true only after
                  // confirmed send. If the send fails, leave the flag as false so it is retried.
                  if (!alreadySentInvite && customerEmail) {
                    try {
                      const appUrl = process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://huttleai.com';
                      const resendApiKey = process.env.RESEND_API_KEY;

                      if (resendApiKey) {
                        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                          type: 'recovery',
                          email: customerEmail,
                          options: { redirectTo: `${appUrl}/secure-account` },
                        });

                        if (linkError) {
                          logError('stripe_webhook.secure_account_link_failed', { eventId: event.id, userId, error: linkError.message });
                        } else if (linkData?.properties?.action_link) {
                          const emailRes = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                              Authorization: `Bearer ${resendApiKey}`,
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              from: 'Huttle AI <hello@huttleai.com>',
                              to: [customerEmail],
                              subject: 'Secure your Huttle AI account',
                              html: `<p>Hi ${firstName || 'there'},</p><p>Your Huttle AI subscription is active. Click below to set up your password and access your dashboard.</p><p><a href="${linkData.properties.action_link}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Secure My Account &rarr;</a></p><p style="color:#6b7280;font-size:14px;">This link expires in 24 hours. If you did not make this purchase, contact us at hello@huttleai.com.</p>`,
                            }),
                          });

                          if (emailRes.ok) {
                            console.log('[checkout.session.completed] secure_account_email sent, setting flag to true', { eventId: event.id, userId });
                            const { error: flagError } = await supabase
                              .from('users')
                              .update({ secure_account_email_sent: true, updated_at: new Date().toISOString() })
                              .eq('id', userId);
                            if (flagError) {
                              logError('stripe_webhook.secure_account_flag_update_failed', { eventId: event.id, userId, error: flagError.message });
                            }
                          } else {
                            logError('stripe_webhook.secure_account_email_send_failed', { eventId: event.id, userId, status: emailRes.status });
                          }
                        }
                      } else {
                        logWarn('stripe_webhook.secure_account_email_skipped', { reason: 'RESEND_API_KEY not configured', eventId: event.id, userId });
                      }
                    } catch (secureEmailErr) {
                      logError('stripe_webhook.secure_account_email_error', { eventId: event.id, userId, error: secureEmailErr.message });
                    }
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
              console.error('[checkout.session.completed] subscription sync failed', { eventId: event.id, userId, subscriptionId, error: subErr.message });
            }
          } else {
            console.log('[checkout.session.completed] no subscriptionId on session — skipping subscription sync', { eventId: event.id, userId });
          }
        } catch (err) {
          logError('stripe_webhook.checkout_session_completed_error', { eventId: event.id, error: err.message });
          console.error('[checkout.session.completed] unhandled error', { eventId: event.id, error: err.message });
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

          // Fallback: if user_profile has no mapping yet (e.g. row was never
          // backfilled), trust the subscription.metadata.supabase_user_id that
          // the create-checkout-session endpoint stamped when it was created.
          // The Stripe customer's own metadata is a last-resort tiebreaker.
          let resolvedUserId = profile?.user_id || null;
          if (!resolvedUserId) {
            const metadataUserId = subscription.metadata?.supabase_user_id || null;
            if (metadataUserId) {
              resolvedUserId = metadataUserId;
              logInfo('stripe_webhook.subscription_user_from_metadata', {
                eventId: event.id,
                customerId,
                userId: metadataUserId,
              });
            } else {
              try {
                const customer = await stripe.customers.retrieve(customerId);
                if (!customer.deleted && customer.metadata?.supabase_user_id) {
                  resolvedUserId = customer.metadata.supabase_user_id;
                  logInfo('stripe_webhook.subscription_user_from_customer_metadata', {
                    eventId: event.id,
                    customerId,
                    userId: resolvedUserId,
                  });
                }
              } catch (custErr) {
                logWarn('stripe_webhook.customer_metadata_lookup_failed', {
                  eventId: event.id,
                  customerId,
                  error: custErr.message,
                });
              }
            }
          }

          if (resolvedUserId) {
            const tier = await updateSubscriptionRecord({
              userId: resolvedUserId,
              customerId,
              subscription,
            });

            // Backfill user_profile mapping once we know the user — future
            // webhooks will then resolve via the fast path above.
            if (!profile) {
              try {
                await supabase.from('user_profile').upsert({
                  user_id: resolvedUserId,
                  stripe_customer_id: customerId,
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
              } catch (backfillErr) {
                logWarn('stripe_webhook.user_profile_backfill_failed', {
                  eventId: event.id,
                  userId: resolvedUserId,
                  error: backfillErr.message,
                });
              }
            }

            if (event.type === 'customer.subscription.updated') {
              try {
                const { error: usersTierError } = await supabase
                  .from('users')
                  .update({ subscription_tier: tier })
                  .eq('id', resolvedUserId);
                if (usersTierError) {
                  logError('stripe_webhook.users_subscription_tier_sync_failed', {
                    eventId: event.id,
                    userId: resolvedUserId,
                    context: 'customer.subscription.updated',
                    error: usersTierError.message,
                  });
                }
              } catch (usersTierErr) {
                logError('stripe_webhook.users_subscription_tier_sync_failed', {
                  eventId: event.id,
                  userId: resolvedUserId,
                  context: 'customer.subscription.updated',
                  error: usersTierErr.message,
                });
              }
            }
          } else {
            logWarn('stripe_webhook.subscription_updated_no_user_found', {
              eventId: event.id,
              customerId,
              subscriptionId: subscription.id,
            });
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
