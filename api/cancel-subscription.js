import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import { authenticateBillingRequest, getStripeSubscription, resolveBillingContext } from './_utils/billing.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Authentication service not configured' });
  }

  try {
    const authResult = await authenticateBillingRequest(req, supabase);
    if (authResult.error || !authResult.user) {
      return res.status(authResult.statusCode).json({ error: authResult.error });
    }

    // Only allow users to cancel their own subscription — never accept a
    // user_id or stripe_subscription_id from the client body for security.
    const { user_id: requestedUserId } = req.body ?? {};
    if (requestedUserId && requestedUserId !== authResult.user.id) {
      return res.status(403).json({ error: 'You can only cancel your own subscription' });
    }

    if (!stripe) {
      return res.status(500).json({ error: 'Payment service not configured' });
    }

    // Always resolve the subscription ID server-side from the authenticated user.
    const billingContext = await resolveBillingContext({
      supabase,
      stripe,
      userId: authResult.user.id,
      createCustomerIfMissing: false,
    });

    let stripeSubscriptionId = billingContext.subscriptionId ?? null;
    const stripeCustomerId = billingContext.customerId ?? null;

    // If stripe_subscription_id is null in Supabase but we have a customer ID,
    // look up active subscriptions directly from Stripe to recover the ID.
    if (!stripeSubscriptionId && stripeCustomerId) {
      const foundSubscription = await getStripeSubscription({
        stripe,
        customerId: stripeCustomerId,
        subscriptionId: null,
        expand: [],
      });
      stripeSubscriptionId = foundSubscription?.id ?? null;
    }

    if (!stripeSubscriptionId) {
      return res.status(400).json({
        error: 'No active Stripe subscription found. Please contact support.',
        message: 'If you believe this is an error, please contact support@huttleai.com',
      });
    }

    let accessUntil = null;

    const stripeSubscription = await getStripeSubscription({
      stripe,
      customerId: null,
      subscriptionId: stripeSubscriptionId,
      expand: ['schedule'],
    });

    // If Stripe has already hard-canceled this subscription, treat it as success.
    // The webhook will have (or will) set status: 'canceled' in Supabase.
    if (!stripeSubscription || stripeSubscription.status === 'canceled') {
      return res.status(200).json({
        success: true,
        access_until: stripeSubscription
          ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
          : null,
      });
    }

    // If cancel_at_period_end is already true, the user already cancelled —
    // return success with the existing access-until date.
    if (stripeSubscription.cancel_at_period_end) {
      return res.status(200).json({
        success: true,
        access_until: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      });
    }

    // Release any pending subscription schedule (e.g. a queued downgrade)
    // before setting cancel_at_period_end, otherwise Stripe will reject the update.
    const scheduleId = typeof stripeSubscription.schedule === 'string'
      ? stripeSubscription.schedule
      : stripeSubscription.schedule?.id || null;

    if (scheduleId) {
      await stripe.subscriptionSchedules.release(scheduleId);
    }

    const cancelledSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    accessUntil = new Date(cancelledSubscription.current_period_end * 1000).toISOString();

    const subscriptionUpdate = {
      cancel_at_period_end: true,
      cancelled_at: new Date().toISOString(),
    };

    let { error: updateError } = await supabase
      .from('subscriptions')
      .update(subscriptionUpdate)
      .eq('user_id', authResult.user.id);

    if (updateError?.message?.toLowerCase().includes('cancelled_at')) {
      const fallbackResult = await supabase
        .from('subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('user_id', authResult.user.id);
      updateError = fallbackResult.error;
    }

    if (updateError) {
      console.error('Cancel subscription update error:', updateError);
      // The Stripe cancel already succeeded — don't surface a 500 to the user.
      // The webhook will sync the correct state shortly.
      console.warn('Supabase sync failed after cancel; webhook will reconcile.');
    }

    return res.status(200).json({ success: true, access_until: accessUntil });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to cancel subscription. Please try again.',
      message: 'If this problem persists, contact support@huttleai.com',
    });
  }
}
