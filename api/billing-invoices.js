import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import { authenticateBillingRequest, getStripeSubscription, resolveBillingContext, toIsoDate } from './_utils/billing.js';

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Authentication service not configured' });
  }

  // NOTE: Stripe rate limits — 100 reads/sec in live mode.
  // Invoice lists are per-customer so the payload is small, but avoid calling
  // this on every keystroke. BillingManagementPanel calls it once on mount +
  // on explicit "Refresh" — that pattern is acceptable.

  try {
    const authResult = await authenticateBillingRequest(req, supabase);
    if (authResult.error || !authResult.user) {
      return res.status(authResult.statusCode).json({ error: authResult.error });
    }

    const { customerId, subscriptionId } = await resolveBillingContext({
      supabase,
      stripe,
      userId: authResult.user.id,
      createCustomerIfMissing: false,
    });

    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && subscriptionId) {
      const stripeSubscription = await getStripeSubscription({
        stripe,
        customerId: null,
        subscriptionId,
      });
      resolvedCustomerId = stripeSubscription?.customer || null;
    }

    if (!resolvedCustomerId) {
      return res.status(200).json({ invoices: [] });
    }

    const invoices = await stripe.invoices.list({
      customer: resolvedCustomerId,
      limit: 12,
    });

    const formattedInvoices = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      paid: invoice.paid,
      currency: invoice.currency,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      createdAt: toIsoDate(invoice.created),
      periodStart: toIsoDate(invoice.period_start),
      periodEnd: toIsoDate(invoice.period_end),
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      description: invoice.description || invoice.lines?.data?.[0]?.description || null,
    }));

    return res.status(200).json({ invoices: formattedInvoices });
  } catch (error) {
    console.error('Billing invoices error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to load invoices',
      message: 'Please try again or contact support@huttleai.com.',
    });
  }
}
