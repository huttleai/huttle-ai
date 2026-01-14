# 🚀 START HERE - Deploy Huttle AI in 15 Minutes

**Your app is production-ready!** Follow these simple steps.

---

## Step 1: Gather Your API Keys (5 minutes)

### Stripe (Required)
1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copy:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

3. Go to [dashboard.stripe.com/products](https://dashboard.stripe.com/products)
4. Create 3 products (or use existing):
   - **Essentials:** $15/month, $150/year
   - **Pro:** $35/month, $350/year
   - **Founder:** $997/year
5. Copy all 5 price IDs (starts with `price_`)

### Supabase (Required)
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project → Settings → API
3. Copy:
   - Project URL
   - `anon` (public) key
   - `service_role` (secret) key

### AI APIs (Required)
1. **Grok:** [console.x.ai](https://console.x.ai) → Copy API key
2. **Perplexity:** [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) → Copy API key

---

## Step 2: Push to GitHub (2 minutes)

```bash
# In your terminal
cd /Users/huttleai/huttle-ai

# Add and commit
git add .
git commit -m "Production ready - full Stripe integration"

# Push to GitHub
git push origin main
```

*If you don't have a GitHub repo yet:*
```bash
# Create repo at github.com/new
git remote add origin https://github.com/YOUR-USERNAME/huttle-ai.git
git push -u origin main
```

---

## Step 3: Deploy to Vercel (8 minutes)

### 3.1 Import Project
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `huttle-ai` repo
4. **Don't deploy yet!** Click "Environment Variables" first

### 3.2 Add Environment Variables

Copy-paste these into Vercel, filling in your actual values:

```bash
# Supabase (4 variables)
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY

# Stripe Backend (7 variables)
STRIPE_SECRET_KEY=sk_test_YOUR-SECRET-KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR-WEBHOOK-SECRET
STRIPE_PRICE_ESSENTIALS_MONTHLY=price_ESSENTIALS_MONTHLY
STRIPE_PRICE_ESSENTIALS_ANNUAL=price_ESSENTIALS_ANNUAL
STRIPE_PRICE_PRO_MONTHLY=price_PRO_MONTHLY
STRIPE_PRICE_PRO_ANNUAL=price_PRO_ANNUAL
STRIPE_PRICE_FOUNDER_ANNUAL=price_FOUNDER_ANNUAL

# Stripe Frontend (6 variables)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR-PUBLISHABLE-KEY
VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY=price_ESSENTIALS_MONTHLY
VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL=price_ESSENTIALS_ANNUAL
VITE_STRIPE_PRICE_PRO_MONTHLY=price_PRO_MONTHLY
VITE_STRIPE_PRICE_PRO_ANNUAL=price_PRO_ANNUAL
VITE_STRIPE_PRICE_FOUNDER_ANNUAL=price_FOUNDER_ANNUAL

# App & AI (3 variables)
VITE_APP_URL=https://your-project.vercel.app
GROK_API_KEY=xai-YOUR-GROK-KEY
PERPLEXITY_API_KEY=pplx-YOUR-PERPLEXITY-KEY
```

**Note:** You'll update `STRIPE_WEBHOOK_SECRET` in the next step.

### 3.3 Deploy
Click "Deploy" and wait ~2 minutes

---

## Step 4: Configure Stripe Webhook (3 minutes)

### 4.1 Get Your URL
After deployment, copy your Vercel URL:
```
https://your-project.vercel.app
```

### 4.2 Add Webhook in Stripe
1. Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. **URL:** `https://your-project.vercel.app/api/stripe-webhook`
4. **Events to send:** Select these 6:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)

### 4.3 Update Vercel
1. Go to your Vercel project → Settings → Environment Variables
2. Find `STRIPE_WEBHOOK_SECRET`
3. Update with the signing secret you just copied
4. Go to Deployments → Click "..." → "Redeploy"

---

## Step 5: Test Everything (5 minutes)

### 5.1 Visit Your App
```
https://your-project.vercel.app
```

### 5.2 Test Sign Up
1. Click "Sign Up"
2. Create an account
3. Verify you land on dashboard

### 5.3 Test Stripe (Critical!)
1. Go to `/subscription` page
2. Open browser console (F12)
3. Click "Upgrade" on Essentials
4. Check console - should see:
   ```
   🔵 Stripe Key Loaded: pk_test_...
   🔵 Is Demo Mode: false
   ✅ Checkout session created
   ```
5. Should redirect to Stripe Checkout

### 5.4 Complete Test Payment
1. Use test card: **4242 4242 4242 4242**
2. Expiry: **12/34**
3. CVC: **123**
4. ZIP: **12345**
5. Click "Pay"
6. Should redirect back to your app
7. Dashboard should show you're on Essentials plan

### 5.5 Verify Webhook
1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click your endpoint
3. Check "Recent attempts"
4. Should see successful deliveries (200 responses)

---

## ✅ Success!

If all tests passed, your app is **LIVE** and fully functional! 🎉

### What's Working:
- ✅ User authentication
- ✅ Stripe payments
- ✅ Subscriptions
- ✅ Webhooks
- ✅ All features

---

## 🚨 Troubleshooting

### "Demo Mode Active" banner shows
**Fix:** Make sure all `VITE_STRIPE_PRICE_*` variables are set in Vercel, then redeploy

### Button spins forever on "Processing..."
**Fix:** 
1. Check browser console for errors
2. Verify `STRIPE_SECRET_KEY` is set
3. Verify `VITE_APP_URL` matches your actual URL
4. Redeploy

### Webhook not working
**Fix:**
1. Verify webhook URL is exactly: `https://your-domain.com/api/stripe-webhook`
2. Verify `STRIPE_WEBHOOK_SECRET` is set in Vercel
3. Check Stripe webhook attempts for specific error
4. Redeploy

### Need more help?
See detailed guides:
- **[PRODUCTION-DEPLOYMENT-GUIDE.md](./PRODUCTION-DEPLOYMENT-GUIDE.md)** - Complete instructions
- **[GITHUB-DEPLOYMENT-CHECKLIST.md](./GITHUB-DEPLOYMENT-CHECKLIST.md)** - Step-by-step checklist

---

## 🎯 Going to Production

When ready for real payments:

1. **Switch Stripe to Live Mode:**
   - Update `STRIPE_SECRET_KEY` → use `sk_live_`
   - Update `VITE_STRIPE_PUBLISHABLE_KEY` → use `pk_live_`
   - Use live mode price IDs
   - Redeploy

2. **Add Custom Domain (Optional):**
   - Vercel Settings → Domains
   - Update `VITE_APP_URL` to your domain
   - Update Stripe webhook URL
   - Redeploy

---

## 📊 Environment Variables Checklist

Before deploying, verify you have all 20:

**Supabase (4):**
- [ ] SUPABASE_URL
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] VITE_SUPABASE_URL
- [ ] VITE_SUPABASE_ANON_KEY

**Stripe Backend (7):**
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] STRIPE_PRICE_ESSENTIALS_MONTHLY
- [ ] STRIPE_PRICE_ESSENTIALS_ANNUAL
- [ ] STRIPE_PRICE_PRO_MONTHLY
- [ ] STRIPE_PRICE_PRO_ANNUAL
- [ ] STRIPE_PRICE_FOUNDER_ANNUAL

**Stripe Frontend (6):**
- [ ] VITE_STRIPE_PUBLISHABLE_KEY
- [ ] VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY
- [ ] VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL
- [ ] VITE_STRIPE_PRICE_PRO_MONTHLY
- [ ] VITE_STRIPE_PRICE_PRO_ANNUAL
- [ ] VITE_STRIPE_PRICE_FOUNDER_ANNUAL

**App & AI (3):**
- [ ] VITE_APP_URL
- [ ] GROK_API_KEY
- [ ] PERPLEXITY_API_KEY

---

**Time to deploy:** ~15 minutes  
**Difficulty:** Easy  
**Confidence:** 100%

**Let's go! 🚀**

