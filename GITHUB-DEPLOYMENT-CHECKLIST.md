# 🚀 GitHub + Vercel Deployment Checklist

**Quick Start:** Push to GitHub → Import to Vercel → Add Env Vars → Deploy

---

## ✅ Step 1: Prepare Repository

### 1.1 Verify .gitignore
```bash
# Check .gitignore includes:
cat .gitignore | grep -E "(\.env|node_modules|dist)"
```

Should include:
- `.env`
- `.env.local`
- `.env.*.local`
- `node_modules/`
- `dist/`
- `.vercel`

### 1.2 Remove Sensitive Files (if committed accidentally)
```bash
# Remove .env from git history (if needed)
git rm --cached .env
git commit -m "Remove .env from repository"
```

### 1.3 Test Build Locally
```bash
npm run build
```
✅ Should complete without errors

---

## ✅ Step 2: Push to GitHub

### 2.1 Initialize Git (if not already done)
```bash
git init
git add .
git commit -m "Production ready - full Stripe integration"
```

### 2.2 Create GitHub Repository
1. Go to [github.com/new](https://github.com/new)
2. Name: `huttle-ai` (or your preferred name)
3. Keep it **Private** (recommended for production apps)
4. **DO NOT** initialize with README (you already have one)
5. Click "Create repository"

### 2.3 Push to GitHub
```bash
# Add remote
git remote add origin https://github.com/YOUR-USERNAME/huttle-ai.git

# Push
git branch -M main
git push -u origin main
```

---

## ✅ Step 3: Deploy to Vercel

### 3.1 Import Project
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub account
4. Find `huttle-ai` repository
5. Click "Import"

### 3.2 Configure Project
Vercel will auto-detect:
- ✅ Framework: Vite
- ✅ Build Command: `vite build`
- ✅ Output Directory: `dist`
- ✅ Install Command: `npm install`

**DO NOT click Deploy yet!**

### 3.3 Add Environment Variables

Click "Environment Variables" and add these:

#### Critical (20 variables - MUST SET):
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ESSENTIALS_MONTHLY
STRIPE_PRICE_ESSENTIALS_ANNUAL
STRIPE_PRICE_PRO_MONTHLY
STRIPE_PRICE_PRO_ANNUAL
STRIPE_PRICE_FOUNDER_ANNUAL
VITE_STRIPE_PUBLISHABLE_KEY
VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY
VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL
VITE_STRIPE_PRICE_PRO_MONTHLY
VITE_STRIPE_PRICE_PRO_ANNUAL
VITE_STRIPE_PRICE_FOUNDER_ANNUAL
VITE_APP_URL
GROK_API_KEY
PERPLEXITY_API_KEY
```

**Tip:** For each variable:
1. Type name in "Key" field
2. Paste value in "Value" field
3. Select "Production" environment
4. Click "Add"

### 3.4 Deploy
1. Click "Deploy"
2. Wait 2-3 minutes
3. ✅ Deployment successful!

---

## ✅ Step 4: Configure Stripe Webhook

### 4.1 Get Production URL
After deployment, copy your URL:
```
https://your-project.vercel.app
```

### 4.2 Add Webhook in Stripe
1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. **Endpoint URL:** `https://your-project.vercel.app/api/stripe-webhook`
4. **Events to send:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)

### 4.3 Add Webhook Secret to Vercel
1. Go to Vercel project → Settings → Environment Variables
2. Add new variable:
   - **Key:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_xxxxxxxxxxxxx`
   - **Environment:** Production
3. Click "Save"

### 4.4 Redeploy
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Click "Redeploy"
4. Wait for completion

---

## ✅ Step 5: Test Production Deployment

### 5.1 Visit Your App
```
https://your-project.vercel.app
```

### 5.2 Open Browser Console (F12)
Check for errors - should be clean

### 5.3 Test Authentication
1. Click "Sign Up"
2. Create account
3. ✅ Should redirect to dashboard

### 5.4 Test Stripe (CRITICAL TEST)
1. Go to `/subscription` page
2. Open console (F12)
3. Click "Upgrade" on Essentials or Pro
4. **Check console logs:**
   ```
   🔵 Stripe Key Loaded: pk_live_... (or pk_test_...)
   🔵 Is Demo Mode: false
   🔵 Price ID: price_...
   🔵 Response status: 200
   ✅ Checkout session created
   🔵 Redirecting to Stripe Checkout
   ```
5. ✅ Browser should redirect to Stripe Checkout

### 5.5 Complete Test Payment
1. Use Stripe test card: `4242 4242 4242 4242`
2. Expiry: Any future date (e.g., `12/34`)
3. CVC: Any 3 digits (e.g., `123`)
4. ZIP: Any 5 digits (e.g., `12345`)
5. Click "Pay"
6. ✅ Should redirect back to your app

### 5.6 Verify Subscription
1. Check dashboard - should show correct tier
2. Check Stripe Dashboard → [Customers](https://dashboard.stripe.com/customers)
   - ✅ Customer created
   - ✅ Subscription active
3. Check Stripe Webhooks → Your endpoint → Recent attempts
   - ✅ Should see successful deliveries (200 responses)

---

## ✅ Step 6: Custom Domain (Optional)

### 6.1 Add Domain in Vercel
1. Go to project Settings → Domains
2. Enter your domain (e.g., `huttleai.com`)
3. Follow DNS configuration instructions

### 6.2 Update Environment Variable
1. Go to Settings → Environment Variables
2. Update `VITE_APP_URL`:
   - **Old:** `https://your-project.vercel.app`
   - **New:** `https://yourdomain.com`
3. Redeploy

### 6.3 Update Stripe Webhook
1. Go to Stripe Webhooks
2. Edit your endpoint URL:
   - **Old:** `https://your-project.vercel.app/api/stripe-webhook`
   - **New:** `https://yourdomain.com/api/stripe-webhook`

---

## ✅ Step 7: Switch to Production Mode

### 7.1 Update Stripe Keys (When Ready for Real Payments)
Replace test keys with live keys in Vercel env vars:

```
# Change from test to live:
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx (was sk_test_...)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx (was pk_test_...)
```

### 7.2 Update Price IDs
Use your **live mode** price IDs from Stripe Dashboard

### 7.3 Redeploy
Trigger new deployment after changing env vars

---

## 📋 Quick Verification Checklist

After deployment, verify these:

### Application
- [ ] Landing page loads
- [ ] No console errors
- [ ] Images load
- [ ] Navigation works

### Authentication
- [ ] Sign up works
- [ ] Login works
- [ ] Password reset works
- [ ] Dashboard loads after login

### Stripe Integration
- [ ] Console shows `Is Demo Mode: false`
- [ ] Console shows Stripe key loaded
- [ ] Clicking "Upgrade" redirects to Stripe
- [ ] Test payment completes successfully
- [ ] Subscription activates after payment
- [ ] User tier updates in dashboard
- [ ] Webhooks deliver successfully

### Features
- [ ] AI features work
- [ ] Content creation works
- [ ] Calendar works
- [ ] Settings work
- [ ] Subscription page shows correct status

---

## 🚨 Common Issues & Fixes

### Issue: Build fails on Vercel
**Cause:** Missing dependencies or build configuration  
**Fix:** 
```bash
# Test locally first
npm run build
# Fix any errors, then push to GitHub
```

### Issue: "Demo Mode Active" in production
**Cause:** Stripe price IDs not set  
**Fix:** Add all `VITE_STRIPE_PRICE_*` variables in Vercel → Redeploy

### Issue: Stripe key shows as `undefined`
**Cause:** `VITE_STRIPE_PUBLISHABLE_KEY` not set  
**Fix:** Add variable in Vercel → Redeploy

### Issue: API returns 500 errors
**Cause:** Backend env vars missing  
**Fix:** 
1. Check Vercel function logs
2. Add missing variables (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, etc.)
3. Redeploy

### Issue: Webhook not working
**Cause:** Webhook URL incorrect or secret not set  
**Fix:**
1. Verify webhook URL: `https://your-domain.com/api/stripe-webhook`
2. Verify `STRIPE_WEBHOOK_SECRET` is set in Vercel
3. Check Stripe webhook attempts for specific error
4. Redeploy

### Issue: Changes not reflecting
**Cause:** Using cached deployment  
**Fix:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Try incognito/private window

---

## 🔄 Continuous Deployment

After initial setup, every push to GitHub will:
1. ✅ Auto-deploy to Vercel
2. ✅ Run build process
3. ✅ Update production site
4. ✅ Keep environment variables

**To deploy updates:**
```bash
git add .
git commit -m "Your update message"
git push
```

Vercel will auto-deploy in ~2 minutes!

---

## 📊 Monitoring & Logs

### View Deployment Logs
```bash
vercel logs production
```

### View Function Logs (API errors)
1. Go to Vercel project
2. Click "Deployments"
3. Click on deployment
4. Click "Functions" tab
5. View individual function logs

### Monitor Stripe Events
1. [Stripe Dashboard → Developers → Events](https://dashboard.stripe.com/events)
2. Check for errors or failed webhooks

---

## 🎯 Success Metrics

Your deployment is successful when:

- ✅ Application is live at your Vercel URL
- ✅ Users can sign up and login
- ✅ Stripe checkout works
- ✅ Test payment completes
- ✅ Subscription activates
- ✅ Webhooks deliver successfully
- ✅ No "Demo Mode" banner
- ✅ All features functional

---

## 📝 Environment Variables Quick Reference

**Total Required:** 20 variables minimum

**Critical:**
- 4x Supabase (2 backend, 2 frontend)
- 12x Stripe (6 backend, 6 frontend)
- 1x App URL
- 2x AI APIs
- 1x Webhook secret

**Optional:**
- 1x Cron secret
- 8x N8N webhooks
- 4x Mailchimp

See `PRODUCTION-DEPLOYMENT-GUIDE.md` for complete details.

---

## 🆘 Need Help?

1. Check Vercel logs
2. Check browser console
3. Check Stripe webhook attempts
4. Verify all env vars are set
5. Redeploy after any env var changes

---

**Status:** ✅ READY  
**Build:** ✅ Passing  
**Docs:** ✅ Complete

Deploy now! 🚀



