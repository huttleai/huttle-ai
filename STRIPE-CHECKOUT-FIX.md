# Stripe Checkout Not Working - Fix Guide

## Problem Identified

Your console logs show:
```
⚠️ Auth check timed out after 5 seconds. Proceeding without session.
(anonymous) @ index-DVYL6Tz6.js:747
```

This means your app **cannot connect to Supabase**, so users appear as "anonymous" and cannot complete checkout.

## Root Cause

The Supabase connection is timing out, most likely because:
1. **Supabase environment variables are missing or incorrect in Vercel**
2. Supabase RLS policies are blocking the connection
3. Network/CORS issues

## Solution Steps

### Step 1: Verify Vercel Environment Variables

Go to your Vercel project dashboard and check that these variables are set:

#### Required Supabase Variables:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=https://your-project.supabase.co  # Same as VITE_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### Required Stripe Variables (you already set these):
```bash
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY=price_...
VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL=price_...
VITE_STRIPE_PRICE_PRO_MONTHLY=price_...
VITE_STRIPE_PRICE_PRO_ANNUAL=price_...
```

#### Other Required Variables:
```bash
VITE_APP_URL=https://your-app.vercel.app
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 2: How to Check Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your project (huttle-ai)
3. Go to **Settings** → **Environment Variables**
4. Verify ALL the variables listed above are present
5. Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly

### Step 3: Redeploy After Adding Variables

**IMPORTANT:** Environment variables only take effect after redeployment!

After adding/updating variables in Vercel:
1. Go to **Deployments** tab
2. Click the **three dots** (•••) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### Step 4: Test the Connection

After redeployment, open your app and check the browser console:

#### What You Should See (Success):
```
✅ Supabase connection OK
🔵 User authenticated: user@example.com
```

#### What You're Currently Seeing (Problem):
```
⚠️ Auth check timed out after 5 seconds
(anonymous)
```

### Step 5: Check Browser Network Tab

1. Open your deployed app: https://huttle-ai.vercel.app (or your URL)
2. Open DevTools (F12 or Right-click → Inspect)
3. Go to **Network** tab
4. Try to log in or load a page
5. Look for failed requests to Supabase (*.supabase.co)
6. Check if they show:
   - **CORS errors** (red text about "blocked by CORS policy")
   - **404 errors** (Supabase URL is wrong)
   - **401 errors** (Anon key is wrong)
   - **Timeout errors** (Connection issue)

## Quick Verification Command

If you have the Vercel CLI installed, you can check your environment variables:

```bash
vercel env ls
```

This will list all environment variables set in Vercel.

## What to Look For

### In Your Browser Console (F12):
1. Any error messages about Supabase
2. "Auth check timed out" message (this is the problem)
3. Any CORS or network errors

### In Vercel Deployment Logs:
1. Any errors during build about missing environment variables
2. Any runtime errors when the API endpoints are called

## Expected Behavior After Fix

Once Supabase connection is working, you should see:
1. No "Auth check timed out" message
2. User email shown in console logs (not "anonymous")
3. Stripe checkout redirect works correctly
4. Payment success page loads after payment

## Still Not Working?

If the issue persists after fixing Supabase variables:

### Check Supabase RLS Policies

Your `user_profile` table might have RLS policies that are blocking access.

1. Go to Supabase Dashboard
2. Go to **Authentication** → **Policies**
3. Check `user_profile` table policies
4. Ensure authenticated users can read their own profile

### Check CORS Settings

If you see CORS errors in the console:

1. Go to Supabase Dashboard
2. Go to **Settings** → **API**
3. Check **CORS Settings**
4. Make sure your Vercel URL is allowed

### Enable Detailed Logging

To get more information, you can temporarily add logging to the checkout flow.

Edit `src/services/stripeAPI.js` and add more detailed logs to the `createCheckoutSession` function (already present, but verify they're showing up).

## Next Steps

Please:
1. ✅ Check your Vercel environment variables (especially Supabase ones)
2. ✅ Redeploy if you add/update any variables
3. ✅ Check the browser console after redeployment
4. ✅ Let me know what errors you see (if any)

Share screenshots of:
- Your Vercel environment variables page (hide the actual keys, just show the names)
- Browser console when you try to upgrade
- Network tab showing any failed requests



