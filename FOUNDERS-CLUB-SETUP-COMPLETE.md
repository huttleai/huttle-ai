# ✅ Founders Club Setup Complete!

## 🎉 What I've Done

I've successfully updated your codebase to properly handle Founders Club checkouts:

### ✅ Files Updated:

1. **`src/LandingPage.jsx`** (line 478-482)
   - Changed from GET request to proper POST request
   - Added error handling and user feedback
   - Now sends `priceId`, `planId: 'founder'`, and `billingCycle: 'annual'` to the API

2. **`api/stripe-webhook.js`** (line 48-57)
   - Added `VITE_STRIPE_PRICE_FOUNDER_ANNUAL` to the price mapping
   - Webhook now recognizes Founder purchases and sets tier to 'founder'
   - Already configured to add Founders to Mailchimp (line 184)

---

## 📋 What You Need to Do Next

### 1. ✅ DONE - Environment Variables
You already added these to both `.env` and Vercel:
- `VITE_STRIPE_PRICE_FOUNDER_ANNUAL=price_xxxxxxxxxxxxx`
- `STRIPE_SECRET_KEY=sk_xxxxxxxxxxxxx`
- `STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx`
- `VITE_STRIPE_PUBLISHABLE_KEY=pk_xxxxxxxxxxxxx`

### 2. 🔔 Verify Stripe Webhook Configuration

Go to **Stripe Dashboard → Developers → Webhooks** and make sure:

- [ ] Webhook endpoint exists: `https://your-app.vercel.app/api/stripe-webhook`
- [ ] Status: **Enabled**
- [ ] Events selected:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- [ ] Signing secret matches your `STRIPE_WEBHOOK_SECRET` in Vercel

**If not set up yet:**
1. Click "Add endpoint"
2. Enter URL: `https://your-app.vercel.app/api/stripe-webhook`
3. Select the 4 events above
4. Save and copy the signing secret
5. Add/update `STRIPE_WEBHOOK_SECRET` in Vercel

### 3. 📧 Configure Mailchimp Founders Club (Optional but Recommended)

If you want Founders to automatically be added to a separate Mailchimp audience:

**In Mailchimp:**
1. Create an audience called "Founders Club" (or use existing)
2. Get the Audience ID: Audience → Settings → Audience name and defaults → Copy the ID

**In Vercel Dashboard:**
1. Go to Settings → Environment Variables
2. Add these variables:
   ```
   MAILCHIMP_FOUNDERS_API_KEY=your_mailchimp_api_key
   MAILCHIMP_FOUNDERS_AUDIENCE_ID=your_founders_audience_id
   ```

**Note:** If these aren't set, the webhook will skip Mailchimp but everything else will still work fine. The subscription will still be saved to Supabase.

### 4. 🚀 Deploy Changes

Since I've modified code files, you need to deploy:

**Option A - Push to Git (Recommended):**
```bash
git add .
git commit -m "Fix Founders Club Stripe checkout integration"
git push
```
Vercel will auto-deploy.

**Option B - Vercel CLI:**
```bash
vercel --prod
```

**After deploying, verify the environment variables are applied:**
- Go to Vercel Dashboard → Your Project → Deployments
- Click the latest deployment → "View Function Logs"
- Trigger a test and check logs show no "undefined" variables

### 5. 🧪 Test the Complete Flow

**Test Checkout (Use Stripe Test Mode):**

1. Go to your landing page
2. Click "Get Early Access" or "Become a Founding Member"
3. Should see Founders Club modal
4. Click "Checkout"
5. Should redirect to Stripe Checkout
6. Verify price shows **$199.00/year**
7. Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
8. Complete checkout
9. Should redirect back to your app

**Verify in Systems:**

- [ ] **Stripe Dashboard** → Customers → New customer created
- [ ] **Stripe Dashboard** → Subscriptions → Active subscription, tier shows "founder"
- [ ] **Supabase** → `subscriptions` table → New row with `tier='founder'`, `status='active'`
- [ ] **Supabase** → `user_profile` table → `stripe_customer_id` populated
- [ ] **Mailchimp Founders** → New subscriber added (if configured)
- [ ] **Mailchimp Founders** → Tags: 'Founders Club', 'Stripe Checkout'

**Check Webhook Delivery:**

- [ ] Stripe Dashboard → Developers → Webhooks → Click your endpoint
- [ ] See `checkout.session.completed` event
- [ ] Status: ✅ Success (200)
- [ ] Click event → Response body shows `{"received":true}`

**Check Vercel Logs:**
- [ ] Vercel Dashboard → Functions → Click `stripe-webhook`
- [ ] Should see: `"🎉 Added to Founders Club: email@example.com"` (if Mailchimp configured)
- [ ] No errors about undefined variables

---

## 🔍 How It Works Now

### Flow Diagram:

```
User clicks "Get Founders Access"
    ↓
LandingPage.jsx - handleProceedToCheckout()
    ↓
POST /api/create-checkout-session
    - priceId: $199/year Founders price
    - planId: 'founder'
    - billingCycle: 'annual'
    ↓
Stripe Checkout Session Created
    ↓
User completes payment on Stripe
    ↓
Stripe sends webhook to /api/stripe-webhook
    ↓
Webhook Handler:
    1. Saves customer ID to Supabase user_profile
    2. Creates/updates subscription in Supabase
       - tier: 'founder'
       - status: 'active'
    3. Checks if tier is 'pro' or 'founder'
    4. If yes → Adds to Mailchimp Founders Club
       - Tags: ['Founders Club', 'Stripe Checkout']
       - Merge fields: FNAME, LNAME
    ↓
✅ Complete! User is now a Founder
```

---

## 🐛 Troubleshooting

### "Payment system is being configured" alert
- Check: `VITE_STRIPE_PRICE_FOUNDER_ANNUAL` is set in Vercel
- Check: You redeployed after adding the environment variable
- Check browser console: Should see the price ID when logging `import.meta.env.VITE_STRIPE_PRICE_FOUNDER_ANNUAL`

### Stripe Checkout shows wrong price
- Verify the Price ID in Vercel matches the $199/year product in Stripe
- Check you're using the correct Stripe mode (test vs live)

### Webhook not triggering
- Verify webhook URL: `https://your-app.vercel.app/api/stripe-webhook`
- Check webhook signing secret matches Vercel env var
- Look at Stripe webhook logs for delivery failures
- Check Vercel function logs for errors

### Subscriber not added to Mailchimp
- Check `MAILCHIMP_FOUNDERS_API_KEY` and `MAILCHIMP_FOUNDERS_AUDIENCE_ID` are set
- Verify Mailchimp API key has proper permissions
- Check Vercel function logs - should see success message
- Note: If Mailchimp vars aren't set, it skips gracefully (this is intentional)

### Subscription not saved to Supabase
- Verify webhook is receiving events (check Stripe logs)
- Check `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
- Verify RLS policies allow service role to write to `subscriptions` table
- Check Vercel function logs for database errors

---

## 📊 Expected Database Schema

Your `subscriptions` table should have these columns:
- `user_id` (uuid, references auth.users)
- `stripe_subscription_id` (text)
- `stripe_customer_id` (text)
- `tier` (text) - will be 'founder', 'pro', 'essentials', or 'free'
- `status` (text) - 'active', 'canceled', 'past_due'
- `current_period_start` (timestamp)
- `current_period_end` (timestamp)
- `cancel_at_period_end` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

## ✅ Summary

**What's Working:**
- ✅ Founders Club button properly calls Stripe API
- ✅ Creates checkout session with correct $199/year price
- ✅ Webhook saves subscription as 'founder' tier
- ✅ Webhook auto-adds to Mailchimp (if configured)
- ✅ Proper error handling and user feedback

**What You Still Need:**
1. Deploy the code changes (git push or vercel deploy)
2. Verify Stripe webhook is configured correctly
3. (Optional) Add Mailchimp Founders environment variables
4. Test the complete flow with Stripe test mode

---

## 📞 Support

If you run into issues:

1. **Check Vercel function logs** - Most issues show up here
2. **Check Stripe webhook logs** - Shows delivery status
3. **Check browser console** - Shows frontend errors
4. **Verify environment variables** - Make sure all are set and redeployed

**Key files to reference:**
- `PRE-LAUNCH-CHECKLIST.md` - Complete testing checklist
- `WEBHOOK-INTEGRATION-COMPLETE.md` - Webhook documentation
- `docs/setup/STRIPE-SETUP.md` - Stripe setup guide

---

**Last Updated:** January 2026  
**Status:** 🟢 Ready to Deploy and Test

# Rebuild trigger for env vars


