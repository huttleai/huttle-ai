/**
 * Test endpoint to verify Stripe configuration
 * Access at: /api/test-stripe-price
 * 
 * SECURITY: Protected by CRON_SECRET to prevent unauthorized access.
 * This endpoint exposes configuration details and should NOT be publicly accessible.
 */

import Stripe from 'stripe';

export default async function handler(req, res) {
  // SECURITY: Require admin secret to access this endpoint
  // This prevents information disclosure about Stripe configuration
  const ADMIN_SECRET = process.env.CRON_SECRET;
  const providedSecret = req.headers['x-cron-secret'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!ADMIN_SECRET) {
    return res.status(403).json({ error: 'Endpoint not configured' });
  }

  if (providedSecret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check if Stripe key exists
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: 'STRIPE_SECRET_KEY not configured',
      });
    }

    // Check which mode we're in
    const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
    const isLiveMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Get the founder price ID
    const founderPriceId = process.env.VITE_STRIPE_PRICE_FOUNDER_ANNUAL;

    if (!founderPriceId) {
      return res.status(500).json({
        error: 'VITE_STRIPE_PRICE_FOUNDER_ANNUAL not configured',
      });
    }

    // Try to retrieve the price from Stripe
    const price = await stripe.prices.retrieve(founderPriceId);

    // Success!
    return res.status(200).json({
      success: true,
      message: 'Stripe configuration is valid!',
      mode: isTestMode ? 'test' : isLiveMode ? 'live' : 'unknown',
      priceId: founderPriceId,
      priceAmount: `$${(price.unit_amount / 100).toFixed(2)}`,
      priceInterval: price.recurring?.interval,
      productId: price.product,
    });

  } catch (error) {
    console.error('Stripe Test Error:', error);
    return res.status(500).json({
      error: 'Stripe configuration test failed',
      hint: 'Check Vercel function logs for details',
    });
  }
}




