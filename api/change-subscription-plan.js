import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import {
  authenticateBillingRequest,
  getStripeSubscription,
  getStripeSubscriptionPlan,
  resolveBillingContext,
  toIsoDate,
} from './_utils/billing.js';
import { getPlanDisplayName, getPriceIdForPlan } from './_utils/stripePlans.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const MONTHLY_PLAN_RANK = {
  essentials: 1,
  pro: 2,
};

async function scheduleDowngradeAtPeriodEnd({ stripeSubscription, targetPriceId, targetPlanId, billingCycle }) {
  let scheduleId = typeof stripeSubscription.schedule === 'string'
    ? stripeSubscription.schedule
    : stripeSubscription.schedule?.id || null;

  let schedule = scheduleId
    ? await stripe.subscriptionSchedules.retrieve(scheduleId)
    : await stripe.subscriptionSchedules.create({ from_subscription: stripeSubscription.id });

  const currentPhaseStart = schedule.current_phase?.start_date || stripeSubscription.current_period_start;
  const currentPhaseEnd = schedule.current_phase?.end_date || stripeSubscription.current_period_end;
  const currentItems = stripeSubscription.items.data.map((item) => ({
    price: item.price.id,
    quantity: item.quantity || 1,
  }));

  schedule = await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'release',
    phases: [
      {
        start_date: currentPhaseStart,
        end_date: currentPhaseEnd,
        items: currentItems,
        proration_behavior: 'none',
      },
      {
        start_date: currentPhaseEnd,
        items: [{ price: targetPriceId, quantity: 1 }],
        proration_behavior: 'none',
        metadata: {
          planId: targetPlanId,
          billingCycle,
          changed_via: 'app_billing_center',
        },
      },
    ],
  });

  return {
    scheduleId: schedule.id,
    effectiveAt: toIsoDate(currentPhaseEnd),
  };
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Authentication service not configured' });
  }

  try {
    const authResult = await authenticateBillingRequest(req, supabase);
    if (authResult.error || !authResult.user) {
      return res.status(authResult.statusCode).json({ error: authResult.error });
    }

    const {
      target_plan_id: targetPlanId,
      billing_cycle: billingCycle = 'monthly',
    } = req.body ?? {};

    if (!targetPlanId) {
      return res.status(400).json({ error: 'target_plan_id required' });
    }

    if (!['essentials', 'pro'].includes(targetPlanId)) {
      return res.status(400).json({ error: 'Only Essentials and Pro plan changes are supported here' });
    }

    const targetPriceId = getPriceIdForPlan({ planId: targetPlanId, billingCycle });
    if (!targetPriceId) {
      return res.status(500).json({ error: 'Target plan is not configured' });
    }

    const { customerId, subscriptionId } = await resolveBillingContext({
      supabase,
      stripe,
      userId: authResult.user.id,
      createCustomerIfMissing: false,
    });

    if (!subscriptionId) {
      return res.status(400).json({ error: 'No active subscription found to update' });
    }

    const stripeSubscription = await getStripeSubscription({
      stripe,
      customerId,
      subscriptionId,
      expand: ['schedule'],
    });

    if (!stripeSubscription) {
      return res.status(400).json({ error: 'No active Stripe subscription found' });
    }

    const currentPlanId = getStripeSubscriptionPlan(stripeSubscription);
    if (!['essentials', 'pro'].includes(currentPlanId)) {
      return res.status(403).json({ error: 'Founders Club and Builders Club memberships cannot switch to monthly plans' });
    }

    const currentPriceId = stripeSubscription.items.data[0]?.price?.id;
    if (currentPriceId === targetPriceId) {
      return res.status(200).json({
        success: true,
        mode: 'noop',
        message: `You are already on ${getPlanDisplayName(targetPlanId)}.`,
      });
    }

    const isDowngrade = (MONTHLY_PLAN_RANK[targetPlanId] ?? 0) < (MONTHLY_PLAN_RANK[currentPlanId] ?? 0);

    if (isDowngrade) {
      const schedule = await scheduleDowngradeAtPeriodEnd({
        stripeSubscription,
        targetPriceId,
        targetPlanId,
        billingCycle,
      });

      return res.status(200).json({
        success: true,
        mode: 'scheduled',
        message: `${getPlanDisplayName(targetPlanId)} will start on your next billing date.`,
        effective_at: schedule.effectiveAt,
      });
    }

    const updatedSubscription = await stripe.subscriptions.update(stripeSubscription.id, {
      cancel_at_period_end: false,
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: targetPriceId,
        },
      ],
      metadata: {
        ...stripeSubscription.metadata,
        planId: targetPlanId,
        billingCycle,
        changed_via: 'app_billing_center',
      },
      payment_behavior: 'pending_if_incomplete',
      proration_behavior: 'create_prorations',
    });

    await supabase
      .from('subscriptions')
      .update({
        tier: targetPlanId,
        status: updatedSubscription.status,
        current_period_start: toIsoDate(updatedSubscription.current_period_start),
        current_period_end: toIsoDate(updatedSubscription.current_period_end),
        cancel_at_period_end: updatedSubscription.cancel_at_period_end,
        cancelled_at: null,
      })
      .eq('user_id', authResult.user.id);

    return res.status(200).json({
      success: true,
      mode: 'immediate',
      message: `Your plan has been updated to ${getPlanDisplayName(targetPlanId)}.`,
    });
  } catch (error) {
    console.error('Change subscription plan error:', error);
    return res.status(500).json({ error: error.message || 'Failed to change subscription plan' });
  }
}
