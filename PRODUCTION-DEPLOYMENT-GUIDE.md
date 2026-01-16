# 🚀 Production Deployment Guide - Huttle AI

**Status:** ✅ Ready for Production Deployment  
**Last Updated:** 2026-01-14  
**Build Status:** ✅ Passing (vite build successful)

---

## 📋 Pre-Deployment Checklist

### ✅ Code Quality
- [x] Build completes successfully (`npm run build`)
- [x] No linter errors
- [x] All imports resolve correctly
- [x] Stripe integration with proper environment variable usage (`import.meta.env`)
- [x] All API endpoints functional

### ✅ Stripe Configuration
- [x] Using `import.meta.env.VITE_*` in frontend (correct for Vite)
- [x] Using `process.env.*` in API routes (correct for Node.js)
- [x] Comprehensive error handling and logging
- [x] Webhook integration configured
- [x] Test and production modes supported

---

## 🔑 Required Environment Variables

### CRITICAL - Must Set Before Deployment

Copy these to **Vercel Dashboard → Settings → Environment Variables**:

#### 1. Supabase (Authentication & Database)
```bash
# Backend (Server-side)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend (Client-side)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to get:**
- Go to [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Go to Settings → API
- Copy URL and keys

---

#### 2. Stripe (Payment Processing) - REQUIRED FOR FULL FUNCTIONALITY
```bash
# Backend (Server-side) - SECRET KEYS (NEVER expose client-side)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx  # Use sk_test_ for testing
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Price IDs (Backend) - Set these to match your Stripe Dashboard
STRIPE_PRICE_ESSENTIALS_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_ESSENTIALS_ANNUAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO_ANNUAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_FOUNDER_ANNUAL=price_xxxxxxxxxxxxx

# Frontend (Client-side) - PUBLIC KEYS (safe to expose)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx  # Use pk_test_ for testing
VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_PRO_ANNUAL=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_FOUNDER_ANNUAL=price_xxxxxxxxxxxxx
```

**Where to get:**
1. **API Keys:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Copy Publishable key → `VITE_STRIPE_PUBLISHABLE_KEY`
   - Copy Secret key → `STRIPE_SECRET_KEY`

2. **Price IDs:**
   - Go to [Stripe Products](https://dashboard.stripe.com/products)
   - Click on each product
   - Copy the price ID (starts with `price_`)
   - Set both backend (`STRIPE_PRICE_*`) and frontend (`VITE_STRIPE_PRICE_*`)

3. **Webhook Secret:**
   - Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
   - Click "Add endpoint"
   - URL: `https://your-domain.com/api/stripe-webhook`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

---

#### 3. Application URL
```bash
VITE_APP_URL=https://your-domain.com
```

**Important:** This MUST be your actual production URL for Stripe redirects to work.

---

#### 4. AI APIs (For AI-powered features)
```bash
# Backend (Server-side)
GROK_API_KEY=xai-xxxxxxxxxxxxx
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxx

# Frontend (Client-side)
VITE_GROK_API_KEY=xai-xxxxxxxxxxxxx
VITE_PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxx
```

**Where to get:**
- Grok: [x.ai API](https://console.x.ai)
- Perplexity: [Perplexity API Settings](https://www.perplexity.ai/settings/api)

---

#### 5. Security (Recommended)
```bash
CRON_SECRET=your-random-secret-string-here
```

**Generate a random secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### OPTIONAL - N8N Workflows

If you're using n8n for automation (otherwise, features use fallback data):

```bash
# Backend
N8N_WEBHOOK_URL_GENERATOR=https://your-n8n.app/webhook/generator
N8N_PLAN_BUILDER_WEBHOOK=https://your-n8n.app/webhook/plan-builder
N8N_VIRAL_BLUEPRINT_WEBHOOK=https://your-n8n.app/webhook/viral-blueprint

# Frontend
VITE_N8N_PLAN_BUILDER_WEBHOOK=https://your-n8n.app/webhook/plan-builder
VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK=https://your-n8n.app/webhook/viral-blueprint
VITE_N8N_DASHBOARD_WEBHOOK=https://your-n8n.app/webhook/dashboard
VITE_N8N_TREND_DEEP_DIVE_WEBHOOK=https://your-n8n.app/webhook/trend-deep-dive
VITE_N8N_TREND_FORECASTER_WEBHOOK=https://your-n8n.app/webhook/trend-forecaster
VITE_N8N_SOCIAL_UPDATES_WEBHOOK=https://your-n8n.app/webhook/social-updates
```

---

### OPTIONAL - Mailchimp

```bash
MAILCHIMP_WAITLIST_API_KEY=xxxxxxxxxxxxx-us1
MAILCHIMP_WAITLIST_AUDIENCE_ID=xxxxxxxxxxxxx
MAILCHIMP_FOUNDERS_API_KEY=xxxxxxxxxxxxx-us1
MAILCHIMP_FOUNDERS_AUDIENCE_ID=xxxxxxxxxxxxx
```

---

## 🚀 Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Push to GitHub
```bash
# If not already on GitHub
git init
git add .
git commit -m "Ready for production deployment"
git branch -M main
git remote add origin https://github.com/yourusername/huttle-ai.git
git push -u origin main
```

#### Step 2: Import to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Vite
5. **DO NOT deploy yet**

#### Step 3: Add Environment Variables
1. In Vercel project settings, go to "Settings" → "Environment Variables"
2. Add **ALL** the required variables listed above
3. Select "Production" environment for each
4. Click "Save"

#### Step 4: Deploy
1. Go to "Deployments" tab
2. Click "Redeploy" (or it will auto-deploy from GitHub)
3. Wait for deployment to complete (~2-3 minutes)

#### Step 5: Configure Stripe Webhook
1. Copy your production URL: `https://your-domain.vercel.app`
2. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
3. Add endpoint: `https://your-domain.vercel.app/api/stripe-webhook`
4. Select events (listed above in Stripe section)
5. Copy webhook signing secret
6. Add to Vercel env vars: `STRIPE_WEBHOOK_SECRET=whsec_...`
7. Redeploy in Vercel

---

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project (first time only)
vercel link

# Add environment variables (first time only)
vercel env add SUPABASE_URL production
# ... repeat for each variable

# Deploy to production
vercel --prod
```

---

## ✅ Post-Deployment Verification

### 1. Check Application Loads
- Visit your production URL
- ✅ Landing page loads
- ✅ No console errors (F12)
- ✅ Login/signup works

### 2. Test Stripe Integration
1. Go to `/subscription` page
2. Open browser console (F12)
3. Click "Upgrade" on any plan
4. **Expected behavior:**
   - Console shows: `🔵 Stripe Key Loaded: pk_live_...` (or `pk_test_...`)
   - Console shows: `🔵 Is Demo Mode: false`
   - Browser redirects to Stripe Checkout
   - Complete test payment (use test card: `4242 4242 4242 4242`)
   - Redirects back to your app

5. Check Stripe Dashboard → Payments
   - ✅ Payment appears
   - ✅ Customer created
   - ✅ Subscription active

### 3. Test Webhook
1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your endpoint
3. Check "Recent attempts"
4. ✅ Should see successful webhook deliveries (200 responses)

### 4. Test User Features
- ✅ Dashboard loads with correct tier
- ✅ AI features work
- ✅ Content creation works
- ✅ Subscription status displays correctly

---

## 🚨 Troubleshooting

### Issue: "Demo Mode Active" banner shows in production

**Cause:** Stripe price IDs not set  
**Fix:** Ensure ALL `VITE_STRIPE_PRICE_*` variables are set in Vercel

### Issue: Stripe checkout button spins forever

**Cause:** Backend environment variables missing  
**Fix:** 
1. Check Vercel logs: `vercel logs production`
2. Ensure `STRIPE_SECRET_KEY` is set
3. Ensure `VITE_APP_URL` is set to your production domain
4. Redeploy after adding variables

### Issue: Payment succeeds but subscription doesn't activate

**Cause:** Webhook not configured or failing  
**Fix:**
1. Check Stripe webhook attempts for errors
2. Verify webhook URL is correct: `https://your-domain.com/api/stripe-webhook`
3. Verify `STRIPE_WEBHOOK_SECRET` is set in Vercel
4. Check Vercel function logs for errors

### Issue: Console shows Stripe key as `undefined`

**Cause:** Frontend environment variable not set  
**Fix:** Add `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel, then redeploy

### Issue: API endpoints return 500 errors

**Cause:** Backend environment variables missing  
**Fix:**
1. Check Vercel function logs
2. Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
3. Ensure `STRIPE_SECRET_KEY` is set
4. Redeploy

---

## 📊 Environment Variables Summary Table

| Variable | Environment | Required | Purpose |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Backend | ✅ Yes | Database connection |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | ✅ Yes | Admin database access |
| `VITE_SUPABASE_URL` | Frontend | ✅ Yes | Client database connection |
| `VITE_SUPABASE_ANON_KEY` | Frontend | ✅ Yes | Client database auth |
| `STRIPE_SECRET_KEY` | Backend | ✅ Yes | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Backend | ✅ Yes | Webhook verification |
| `STRIPE_PRICE_*` | Backend | ✅ Yes | Subscription plans (5 vars) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Frontend | ✅ Yes | Stripe checkout |
| `VITE_STRIPE_PRICE_*` | Frontend | ✅ Yes | Display prices (5 vars) |
| `VITE_APP_URL` | Backend | ✅ Yes | Redirect URLs |
| `GROK_API_KEY` | Backend | ✅ Yes | AI features |
| `PERPLEXITY_API_KEY` | Backend | ✅ Yes | AI features |
| `VITE_GROK_API_KEY` | Frontend | ⚠️ Optional | Client AI calls |
| `VITE_PERPLEXITY_API_KEY` | Frontend | ⚠️ Optional | Client AI calls |
| `CRON_SECRET` | Backend | ⚠️ Recommended | Cron job security |
| `N8N_*` | Backend | ❌ Optional | Workflow automation |
| `VITE_N8N_*` | Frontend | ❌ Optional | Workflow automation |
| `MAILCHIMP_*` | Backend | ❌ Optional | Email marketing |

**Total Required:** 20 environment variables minimum for full Stripe functionality

---

## 🔐 Security Best Practices

### ✅ DO:
- Use `sk_live_` and `pk_live_` in production
- Use `sk_test_` and `pk_test_` in development/preview
- Set strong `CRON_SECRET`
- Enable Stripe webhook signature verification
- Use environment variables for all secrets

### ❌ DON'T:
- Never commit `.env` file
- Never expose `STRIPE_SECRET_KEY` client-side
- Never expose `SUPABASE_SERVICE_ROLE_KEY` client-side
- Never use `VITE_SKIP_AUTH=true` in production

---

## 📝 Quick Copy-Paste Template

Use this template when setting up Vercel environment variables:

```bash
# === CRITICAL - MUST SET ===

# Supabase Backend
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Supabase Frontend
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Stripe Backend
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ESSENTIALS_MONTHLY=
STRIPE_PRICE_ESSENTIALS_ANNUAL=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_ANNUAL=
STRIPE_PRICE_FOUNDER_ANNUAL=

# Stripe Frontend
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY=
VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL=
VITE_STRIPE_PRICE_PRO_MONTHLY=
VITE_STRIPE_PRICE_PRO_ANNUAL=
VITE_STRIPE_PRICE_FOUNDER_ANNUAL=

# App URL
VITE_APP_URL=

# AI APIs
GROK_API_KEY=
PERPLEXITY_API_KEY=

# === RECOMMENDED ===
CRON_SECRET=

# === OPTIONAL ===
VITE_GROK_API_KEY=
VITE_PERPLEXITY_API_KEY=
```

---

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ Application loads without errors
- ✅ Users can sign up/login
- ✅ Stripe checkout works (test with test card)
- ✅ Subscription activates after payment
- ✅ User tier updates correctly
- ✅ Dashboard shows correct subscription status
- ✅ AI features work
- ✅ No "Demo Mode" banner in production
- ✅ Webhooks deliver successfully (check Stripe dashboard)

---

## 📚 Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Vercel logs:** `vercel logs production`
2. **Check browser console:** Look for 🔵 and ❌ logs
3. **Check Stripe webhook logs:** Recent attempts tab
4. **Verify all environment variables are set**
5. **Redeploy after adding/changing variables**

---

**Status:** ✅ READY FOR DEPLOYMENT  
**Build:** ✅ Passing  
**Stripe:** ✅ Fully Integrated  
**Environment Variables:** ✅ Documented

Deploy with confidence! 🚀


