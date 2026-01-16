# Quick Checkout Debug Guide

## The Issue

Your Stripe checkout is failing because your app can't connect to Supabase, causing users to appear as "anonymous."

## Root Cause

**Environment variables are not set correctly in Vercel.**

## Immediate Actions

### 1. Open Vercel Dashboard
Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

### 2. Verify These Variables Exist

**Critical - Must Have:**
- ✅ `VITE_SUPABASE_URL` 
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_URL` (same as VITE_SUPABASE_URL)
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `VITE_APP_URL` (your Vercel app URL)
- ✅ `STRIPE_SECRET_KEY`
- ✅ `VITE_STRIPE_PUBLISHABLE_KEY`

**You Already Updated (Good):**
- ✅ `VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY`
- ✅ `VITE_STRIPE_PRICE_PRO_MONTHLY`
- ✅ `VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL` (if using annual)
- ✅ `VITE_STRIPE_PRICE_PRO_ANNUAL` (if using annual)

### 3. After Confirming Variables Are Set

**REDEPLOY YOUR APP:**
1. Vercel Dashboard → Deployments tab
2. Click **•••** (three dots) on latest deployment
3. Click **Redeploy**
4. ✅ **Enable "Use existing Build Cache"** to speed it up
5. Wait for deployment to complete (~2-3 minutes)

### 4. Test Again

After redeployment:
1. Open your app in **Incognito/Private window** (fresh session)
2. Log in to your account
3. Try to upgrade your plan
4. Open browser console (F12)
5. Look for:
   - ✅ "User authenticated" message (good)
   - ❌ "Auth check timed out" message (bad - still not fixed)

## What You Updated vs. What's Missing

| Variable | You Updated? | In Vercel? | Notes |
|----------|-------------|-----------|-------|
| `VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY` | ✅ Yes | ✅ Should be | You mentioned this |
| `VITE_STRIPE_PRICE_PRO_MONTHLY` | ✅ Yes | ✅ Should be | You mentioned this |
| `VITE_SUPABASE_URL` | ❓ Unknown | ❓ Unknown | **CRITICAL - CHECK THIS** |
| `VITE_SUPABASE_ANON_KEY` | ❓ Unknown | ❓ Unknown | **CRITICAL - CHECK THIS** |
| `SUPABASE_SERVICE_ROLE_KEY` | ❓ Unknown | ❓ Unknown | **CRITICAL - CHECK THIS** |
| `VITE_APP_URL` | ❓ Unknown | ❓ Unknown | **CRITICAL - CHECK THIS** |

## How to Check If It's Fixed

### Before Fix (What You're Seeing Now):
```
Console output:
⚠️ Auth check timed out after 5 seconds. Proceeding without session.
(anonymous) @ index-DVYL6Tz6.js:747
🔵 [Subscription] Starting upgrade for plan: pro
🔵 [Subscription] Current tier: free
```

### After Fix (What You Should See):
```
Console output:
✅ Supabase connection OK
🔵 User: user@example.com
🔵 [Subscription] Starting upgrade for plan: pro
🔵 Redirecting to Stripe Checkout: https://checkout.stripe.com/...
[Browser redirects to Stripe payment page]
```

## Most Likely Issue

Based on your console logs, **the Supabase environment variables are missing in Vercel**.

Your Stripe price IDs are working (you see them in the logs), but authentication is failing, which prevents the checkout from completing.

## If Still Not Working After Redeploy

Share with me:
1. Screenshot of your Vercel environment variables page (hide the values, just show the variable names)
2. Console output from your browser after redeployment
3. Any error messages from the Network tab

## Emergency Workaround (Not Recommended for Production)

If you need to test Stripe immediately while debugging Supabase:

You could temporarily enable demo mode, but this would bypass authentication entirely and is **NOT suitable for production**. Don't do this unless absolutely necessary for testing.

## Contact Points

- Vercel Support: https://vercel.com/support
- Supabase Dashboard: https://app.supabase.com
- Stripe Dashboard: https://dashboard.stripe.com

---

**Summary:** The checkout is failing because Supabase can't authenticate users. This is almost certainly because `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set in Vercel. Add them, redeploy, and test again.


