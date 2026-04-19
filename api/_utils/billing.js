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

/**
 * Validate a client-supplied return_url against our own origin to prevent
 * open-redirect abuse via Stripe Portal / Checkout `return_url` params.
 *
 * Returns { valid: true } when the URL is safe to pass to Stripe, otherwise
 * { valid: false, reason }. A missing/empty returnUrl is treated as valid —
 * callers should fall back to a server-side default.
 *
 * Uses the same VITE_APP_URL / NEXT_PUBLIC_APP_URL env vars as getAppUrl().
 * Required Vercel env var: VITE_APP_URL (already in use across the billing
 * endpoints). If neither env var is set we log a warning and fail-open so we
 * don't break billing for misconfigured preview deployments.
 */
export function validateReturnUrl(returnUrl) {
  if (!returnUrl) return { valid: true };

  const configuredAppUrl = process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredAppUrl) {
    console.warn('[billing] VITE_APP_URL / NEXT_PUBLIC_APP_URL not set — cannot validate return_url');
    return { valid: true };
  }

  if (typeof returnUrl !== 'string' || !returnUrl.startsWith(configuredAppUrl)) {
    return { valid: false, reason: 'return_url must be within the app origin' };
  }

  return { valid: true };
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

/** @param {string|undefined} authHeader */
export function parseBearerToken(authHeader) {
  const bearerMatch =
    typeof authHeader === 'string' ? /^Bearer\s+(\S+)/i.exec(authHeader.trim()) : null;
  return bearerMatch ? bearerMatch[1] : null;
}

export async function authenticateBillingRequest(req, supabase) {
  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    return { error: 'Authentication required', statusCode: 401, user: null };
  }

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

  /* SELF-HEAL: Triggered for users with active tier but null
     stripe_customer_id (e.g. manually provisioned accounts,
     import migrations, or invite-based signups). Attempts to
     locate a Stripe customer by email and backfill the DB record.
     If no safe match is found, falls through to degraded state. */
  const needsSelfHeal =
    !customerId &&
    subscriptionRecord &&
    subscriptionRecord.tier &&
    subscriptionRecord.tier !== 'free' &&
    stripe &&
    email;

  if (needsSelfHeal) {
    console.log(`[billing] self-heal triggered for user ${userId} — stripe_customer_id is null, attempting email lookup`);
    try {
      const existingCustomers = await stripe.customers.list({ email, limit: 10 });
      const safeMatch = existingCustomers.data.find((c) => {
        if (c.deleted) return false;
        const metaUserId = c.metadata?.supabase_user_id || null;
        return !metaUserId || metaUserId === userId;
      });

      if (safeMatch) {
        customerId = safeMatch.id;
        await syncStripeCustomerId({ supabase, userId, customerId });
        if (!safeMatch.metadata?.supabase_user_id) {
          try {
            await stripe.customers.update(customerId, {
              metadata: { ...safeMatch.metadata, supabase_user_id: userId },
            });
          } catch (stampErr) {
            console.warn('[billing] self-heal metadata stamp failed:', stampErr?.message);
          }
        }
        console.info('[billing] self-healed missing stripe_customer_id for user', userId, '->', customerId);
      }
    } catch (healErr) {
      console.warn('[billing] self-heal lookup failed for user', userId, '—', healErr?.message);
    }
  }

  if (!customerId && createCustomerIfMissing) {
    if (!stripe || !email) {
      throw new Error('No billing account found');
    }

    // When matching by email, only adopt a customer if its metadata either
    // matches this supabase_user_id or is empty. This prevents hijacking a
    // customer that was previously created for a different Supabase user
    // (e.g. an account deleted and re-registered under the same email).
    const existingCustomers = await stripe.customers.list({ email, limit: 10 });
    const safeMatch = existingCustomers.data.find((c) => {
      if (c.deleted) return false;
      const metaUserId = c.metadata?.supabase_user_id || null;
      return !metaUserId || metaUserId === userId;
    });

    if (safeMatch) {
      customerId = safeMatch.id;
      if (!safeMatch.metadata?.supabase_user_id) {
        try {
          await stripe.customers.update(customerId, {
            metadata: { ...safeMatch.metadata, supabase_user_id: userId },
          });
        } catch (stampErr) {
          console.warn('[billing] metadata stamp on matched customer failed:', stampErr?.message);
        }
      }
    } else {
      const newCustomer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });
      customerId = newCustomer.id;
    }

    await syncStripeCustomerId({ supabase, userId, customerId });
  } else if (customerId) {
    // Verify the stored customerId actually belongs to this user on Stripe.
    // If the customer is stamped with a different supabase_user_id, refuse
    // to operate on it — this indicates data corruption.
    if (stripe) {
      try {
        const stripeCustomer = await stripe.customers.retrieve(customerId);
        if (!stripeCustomer.deleted) {
          const metaUserId = stripeCustomer.metadata?.supabase_user_id || null;
          if (metaUserId && metaUserId !== userId) {
            throw new Error(
              `Stripe customer ${customerId} is bound to a different user — refusing to operate on it.`
            );
          }
          if (!metaUserId) {
            try {
              await stripe.customers.update(customerId, {
                metadata: { ...stripeCustomer.metadata, supabase_user_id: userId },
              });
            } catch (stampErr) {
              console.warn('[billing] metadata backfill failed:', stampErr?.message);
            }
          }
        }
      } catch (retrieveErr) {
        // Don't fail the entire flow on a transient Stripe read error; log and continue.
        console.warn('[billing] stripe.customers.retrieve check failed:', retrieveErr?.message);
      }
    }

    if (!subscriptionRecord?.stripe_customer_id || !profile?.stripe_customer_id) {
      await syncStripeCustomerId({ supabase, userId, customerId });
    }
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
    try {
      return await stripe.subscriptions.retrieve(subscriptionId, {
        expand: retrieveExpand,
      });
    } catch (err) {
      // If the subscription no longer exists in Stripe (e.g. stale ID), fall
      // through to the customer list lookup rather than throwing a 500.
      console.warn('[billing] stripe.subscriptions.retrieve failed for', subscriptionId, '—', err?.message);
      if (!customerId) return null;
    }
  }

  if (!customerId) return null;

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
      expand,
    });
    return selectBestStripeSubscription(subscriptions.data);
  } catch (err) {
    console.warn('[billing] stripe.subscriptions.list failed for customer', customerId, '—', err?.message);
    return null;
  }
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
