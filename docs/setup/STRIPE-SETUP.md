# Stripe Integration Setup Guide

This guide walks you through setting up Stripe for Huttle AI subscriptions.

## 📋 Prerequisites

- A Stripe account (create one at [stripe.com](https://stripe.com))
- Your Huttle AI app deployed to Vercel
- Supabase project configured

## 🔧 Step 1: Create Stripe Products & Prices

### In Stripe Dashboard:

1. Go to **Products** → **Add Product**

2. **Create Essentials Plan:**
   - Name: `Huttle AI Essentials`
   - Description: `200 AI generations/month, 5GB storage, Full Trend Lab access`
   - Create two prices:
     - **Monthly**: $9/month (recurring)
     - **Annual**: $90/year (recurring) - Note the discount!

3. **Create Pro Plan:**
   - Name: `Huttle AI Pro`
   - Description: `800 AI generations/month, 25GB storage, Content Repurposer, Trend Forecaster, Huttle Agent`
   - Create two prices:
     - **Monthly**: $19/month (recurring)
     - **Annual**: $190/year (recurring)

4. Copy the **Price IDs** for each (they look like `price_1234567890`)

## 🔑 Step 2: Get Your API Keys

1. Go to **Developers** → **API Keys**
2. Copy your:
   - **Publishable key** (starts with `pk_`)
   - **Secret key** (starts with `sk_`)

## 🌐 Step 3: Configure Environment Variables

### In Vercel Dashboard:

Go to your project → **Settings** → **Environment Variables**

Add these variables:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_live_your_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key

# Stripe Price IDs (from Step 1)
VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY=price_essentials_monthly_id
VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL=price_essentials_annual_id
VITE_STRIPE_PRICE_PRO_MONTHLY=price_pro_monthly_id
VITE_STRIPE_PRICE_PRO_ANNUAL=price_pro_annual_id

# Your app URL (for redirects)
VITE_APP_URL=https://your-app.vercel.app

# Stripe Webhook Secret (from Step 5)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### For Local Development (.env file):

```env
# Use test keys for development
STRIPE_SECRET_KEY=sk_test_your_test_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key

# Test Price IDs (create test products in Stripe)
VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY=price_test_essentials_monthly
VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL=price_test_essentials_annual
VITE_STRIPE_PRICE_PRO_MONTHLY=price_test_pro_monthly
VITE_STRIPE_PRICE_PRO_ANNUAL=price_test_pro_annual

VITE_APP_URL=http://localhost:5173
```

## 🗄️ Step 4: Set Up Database Schema

Run the following SQL in your Supabase SQL Editor:

```sql
-- See docs/setup/supabase-stripe-schema.sql for full schema
```

Or run the file directly: `docs/setup/supabase-stripe-schema.sql`

## 🔔 Step 5: Configure Stripe Webhooks

### In Stripe Dashboard:

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your endpoint URL:
   ```
   https://your-app.vercel.app/api/stripe-webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

### For Local Testing:

Use the Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:5173/api/stripe-webhook

# Copy the webhook signing secret it provides
```

## 🧪 Step 6: Test the Integration

### Test Checkout Flow:

1. Go to your Subscription page
2. Click "Upgrade Now" on Essentials or Pro
3. Use Stripe test card: `4242 4242 4242 4242`
4. Any future expiry date and any CVC
5. Complete checkout
6. Verify you're redirected back with success

### Test Customer Portal:

1. After subscribing, the "Manage Billing" button should appear
2. Click it to open Stripe Customer Portal
3. You can update payment method, view invoices, cancel, etc.

### Test Webhooks:

1. Make a test purchase
2. Check Stripe Dashboard → Developers → Webhooks → Recent events
3. Verify events are being delivered successfully
4. Check your Supabase `subscriptions` table for updates

## 🔒 Step 7: Configure Customer Portal

### In Stripe Dashboard:

1. Go to **Settings** → **Billing** → **Customer portal**
2. Configure what customers can do:
   - ✅ Update payment method
   - ✅ View invoice history
   - ✅ Cancel subscription
   - ✅ Update subscription (optional)
3. Customize the portal appearance to match your brand
4. Save changes

## 📊 Subscription Plans Summary

| Plan | Monthly | Annual | AI Gens | Storage |
|------|---------|--------|---------|---------|
| Freemium | $0 | $0 | 20 | 250MB |
| Essentials | $9 | $90 | 200 | 5GB |
| Pro | $19 | $190 | 800 | 25GB |

## 🚨 Troubleshooting

### "Failed to create checkout session"
- Check that all price IDs are correctly set in environment variables
- Verify STRIPE_SECRET_KEY is set on the server
- Check Vercel function logs for errors

### "No subscription found" when clicking Manage Billing
- User needs to complete a purchase first
- Check that webhook is updating the database correctly
- Verify `stripe_customer_id` is being saved to `user_profile`

### Webhooks not working
- Verify the webhook endpoint URL is correct
- Check the signing secret matches
- Look at Stripe webhook logs for delivery failures
- Ensure your API endpoint is publicly accessible

### Subscription not updating after purchase
- Check Supabase RLS policies allow service role to write
- Verify webhook handler is receiving events
- Check Vercel function logs for errors

## 📚 Additional Resources

- [Stripe Checkout Documentation](https://stripe.com/docs/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

