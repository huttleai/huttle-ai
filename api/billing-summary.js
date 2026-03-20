import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import {
  authenticateBillingRequest,
  buildSubscriptionPayload,
  getStripeSubscription,
  resolveBillingContext,
  summarizeCardPaymentMethod,
} from './_utils/billing.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Authentication service not configured' });
  }

  // NOTE: Stripe rate limits — 100 reads/sec in live mode, 25 reads/sec in test mode.
  // billing-summary is called on every BillingManagementPanel mount. If this endpoint
  // is hit too frequently, consider caching the summary in Supabase for 60 seconds:
  //   SELECT * FROM billing_summary_cache WHERE user_id = $1 AND cached_at > now() - interval '60s'
  // For current usage patterns (single-tab load), direct Stripe calls are acceptable.

  try {
    const authResult = await authenticateBillingRequest(req, supabase);
    if (authResult.error || !authResult.user) {
      return res.status(authResult.statusCode).json({ error: authResult.error });
    }

    const billingContext = await resolveBillingContext({
      supabase,
      stripe,
      userId: authResult.user.id,
      createCustomerIfMissing: false,
    });

    const { customerId, subscriptionId, subscriptionRecord } = billingContext;
    if (!customerId && !subscriptionId && !subscriptionRecord) {
      return res.status(200).json({
        summary: {
          subscription: null,
          paymentMethod: null,
          invoicesEnabled: false,
        },
      });
    }

    const [stripeSubscription, customer] = await Promise.all([
      getStripeSubscription({
        stripe,
        customerId,
        subscriptionId,
        expand: ['data.default_payment_method', 'data.schedule'],
      }),
      customerId
        ? stripe.customers.retrieve(customerId, {
            expand: ['invoice_settings.default_payment_method'],
          })
        : null,
    ]);

    const normalizedSubscription = buildSubscriptionPayload({
      stripeSubscription,
      subscriptionRecord,
    });

    const defaultPaymentMethod = stripeSubscription?.default_payment_method || customer?.invoice_settings?.default_payment_method;
    const resolvedCustomerId = normalizedSubscription?.customerId || customerId || null;
    const paymentMethod = summarizeCardPaymentMethod(defaultPaymentMethod);

    return res.status(200).json({
      summary: {
        customerId: resolvedCustomerId,
        subscription: normalizedSubscription,
        paymentMethod,
        invoicesEnabled: Boolean(resolvedCustomerId),
      },
    });
  } catch (error) {
    console.error('Billing summary error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to load billing summary',
      message: 'Please refresh or contact support@huttleai.com if this persists.',
    });
  }
}
