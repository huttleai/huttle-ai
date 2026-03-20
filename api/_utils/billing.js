import { getPlanFromPriceId, normalizePlanId } from './stripePlans.js';

const STRIPE_SUBSCRIPTION_STATUS_PRIORITY = {
  trialing: 5,
  active: 4,
  past_due: 3,
  canceled: 2,
  incomplete: 1,
  incomplete_expired: 0,
  unpaid: 0,
};

export function getAppUrl() {
  return process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://huttleai.com';
}

export function toIsoDate(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

export function summarizeCardPaymentMethod(paymentMethod) {
  const card = paymentMethod?.card;
  if (!card) return null;

  return {
    id: paymentMethod.id,
    brand: card.brand,
    last4: card.last4,
    expMonth: card.exp_month,
    expYear: card.exp_year,
    funding: card.funding,
    wallet: card.wallet?.type || null,
  };
}

export function extractBillingCycle(subscription) {
  const recurring = subscription?.items?.data?.[0]?.price?.recurring;
  if (!recurring?.interval) return null;

  if (recurring.interval_count && recurring.interval_count > 1) {
    return `${recurring.interval_count}-${recurring.interval}`;
  }

  return recurring.interval;
}

export function getStripeSubscriptionPlan(subscription) {
  const priceId = subscription?.items?.data?.[0]?.price?.id;
  return normalizePlanId(
    subscription?.metadata?.planId ||
    subscription?.metadata?.plan ||
    getPlanFromPriceId(priceId)
  );
}

export function getUpcomingPlanChange(schedule) {
  if (!schedule?.phases?.length || !schedule?.current_phase?.end_date) {
    return null;
  }

  const nextPhase = schedule.phases.find((phase) => phase.start_date === schedule.current_phase.end_date);
  const nextPriceId = nextPhase?.items?.[0]?.price;
  const nextPlan = getPlanFromPriceId(nextPriceId);

  if (!nextPlan) {
    return null;
  }

  return {
    plan: nextPlan,
    effectiveAt: toIsoDate(nextPhase.start_date),
    priceId: nextPriceId,
  };
}

export function selectBestStripeSubscription(subscriptions = []) {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return null;
  }

  return [...subscriptions].sort((first, second) => {
    const firstPriority = STRIPE_SUBSCRIPTION_STATUS_PRIORITY[first.status] ?? -1;
    const secondPriority = STRIPE_SUBSCRIPTION_STATUS_PRIORITY[second.status] ?? -1;

    if (firstPriority !== secondPriority) {
      return secondPriority - firstPriority;
    }

    return (second.created ?? 0) - (first.created ?? 0);
  })[0];
}

export async function authenticateBillingRequest(req, supabase) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { error: 'Authentication required', statusCode: 401, user: null };
  }

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: 'Invalid authentication token', statusCode: 401, user: null };
  }

  return { error: null, statusCode: 200, user };
}

export async function syncStripeCustomerId({ supabase, userId, customerId }) {
  if (!supabase || !userId || !customerId) return;

  await Promise.allSettled([
    supabase
      .from('subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', userId),
    supabase
      .from('user_profile')
      .upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      ),
  ]);
}

export async function resolveBillingContext({
  supabase,
  stripe,
  userId,
  createCustomerIfMissing = false,
}) {
  const [{ data: subscriptionRecord, error: subscriptionError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, user_id, tier, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, cancelled_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_profile')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (subscriptionError && subscriptionError.code !== 'PGRST116') {
    throw new Error(subscriptionError.message || 'Failed to lookup subscription record');
  }

  if (profileError && profileError.code !== 'PGRST116') {
    throw new Error(profileError.message || 'Failed to lookup billing profile');
  }

  let customerId = subscriptionRecord?.stripe_customer_id || profile?.stripe_customer_id || null;
  let email = null;

  if ((!customerId || createCustomerIfMissing) && supabase?.auth?.admin) {
    const { data: authUserResult, error: authUserError } = await supabase.auth.admin.getUserById(userId);
    if (authUserError) {
      throw new Error(authUserError.message || 'Failed to lookup billing account');
    }
    email = authUserResult?.user?.email || null;
  }

  if (!customerId && createCustomerIfMissing) {
    if (!stripe || !email) {
      throw new Error('No billing account found');
    }

    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({ email });
      customerId = newCustomer.id;
    }

    await syncStripeCustomerId({ supabase, userId, customerId });
  } else if (customerId && (!subscriptionRecord?.stripe_customer_id || !profile?.stripe_customer_id)) {
    await syncStripeCustomerId({ supabase, userId, customerId });
  }

  return {
    customerId,
    email,
    subscriptionId: subscriptionRecord?.stripe_subscription_id || null,
    subscriptionRecord: subscriptionRecord || null,
  };
}

export async function getStripeSubscription({
  stripe,
  customerId,
  subscriptionId,
  expand = [],
}) {
  if (!stripe) return null;

  if (subscriptionId) {
    const retrieveExpand = expand.map((value) => value.replace(/^data\./, ''));
    return stripe.subscriptions.retrieve(subscriptionId, {
      expand: retrieveExpand,
    });
  }

  if (!customerId) return null;

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
    expand,
  });

  return selectBestStripeSubscription(subscriptions.data);
}

export function buildSubscriptionPayload({
  stripeSubscription,
  subscriptionRecord,
}) {
  if (!stripeSubscription && !subscriptionRecord) {
    return null;
  }

  const plan = stripeSubscription
    ? getStripeSubscriptionPlan(stripeSubscription)
    : normalizePlanId(subscriptionRecord?.tier);
  const upcomingPlanChange = stripeSubscription?.schedule
    ? getUpcomingPlanChange(
        typeof stripeSubscription.schedule === 'object'
          ? stripeSubscription.schedule
          : null
      )
    : null;

  return {
    id: stripeSubscription?.id || subscriptionRecord?.stripe_subscription_id || null,
    stripeSubscriptionId: stripeSubscription?.id || subscriptionRecord?.stripe_subscription_id || null,
    customerId: stripeSubscription?.customer || subscriptionRecord?.stripe_customer_id || null,
    status: stripeSubscription?.status || subscriptionRecord?.status || 'inactive',
    plan,
    tier: plan,
    billingCycle: extractBillingCycle(stripeSubscription),
    currentPeriodStart: stripeSubscription
      ? toIsoDate(stripeSubscription.current_period_start)
      : subscriptionRecord?.current_period_start || null,
    currentPeriodEnd: stripeSubscription
      ? toIsoDate(stripeSubscription.current_period_end)
      : subscriptionRecord?.current_period_end || null,
    trialStart: stripeSubscription ? toIsoDate(stripeSubscription.trial_start) : null,
    trialEnd: stripeSubscription ? toIsoDate(stripeSubscription.trial_end) : null,
    cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end ?? subscriptionRecord?.cancel_at_period_end ?? false,
    cancelledAt: subscriptionRecord?.cancelled_at || toIsoDate(stripeSubscription?.canceled_at),
    upcomingPlanChange,
  };
}
