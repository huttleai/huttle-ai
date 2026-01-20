# Vercel Environment Variables Checklist

## How to Check Your Vercel Environment Variables

### Step 1: Access Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click on your project (huttle-ai or whatever it's named)
3. Click **Settings** (left sidebar)
4. Click **Environment Variables**

### Step 2: Verify Each Variable

Copy this checklist and mark each one as you verify it:

## ✅ Supabase Variables (CRITICAL - These are likely missing!)

- [ ] **VITE_SUPABASE_URL**
  - Should look like: `https://xxxxxxxxxxxxx.supabase.co`
  - Get it from: Supabase Dashboard → Settings → API → Project URL
  
- [ ] **VITE_SUPABASE_ANON_KEY**
  - Should start with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Get it from: Supabase Dashboard → Settings → API → Project API keys → anon/public
  
- [ ] **SUPABASE_URL**
  - Same value as VITE_SUPABASE_URL above
  
- [ ] **SUPABASE_SERVICE_ROLE_KEY**
  - Should start with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Get it from: Supabase Dashboard → Settings → API → Project API keys → service_role
  - ⚠️ **KEEP THIS SECRET** - Never commit to git or share publicly

## ✅ Stripe Variables (You Already Set These)

- [ ] **STRIPE_SECRET_KEY**
  - Should start with: `sk_live_...` (production) or `sk_test_...` (test mode)
  
- [ ] **VITE_STRIPE_PUBLISHABLE_KEY**
  - Should start with: `pk_live_...` (production) or `pk_test_...` (test mode)
  
- [ ] **VITE_STRIPE_PRICE_ESSENTIALS_MONTHLY**
  - Should start with: `price_`
  - Your new Essentials monthly price ID
  
- [ ] **VITE_STRIPE_PRICE_PRO_MONTHLY**
  - Should start with: `price_`
  - Your new Pro monthly price ID
  
- [ ] **VITE_STRIPE_PRICE_ESSENTIALS_ANNUAL** (if offering annual)
  - Should start with: `price_`
  
- [ ] **VITE_STRIPE_PRICE_PRO_ANNUAL** (if offering annual)
  - Should start with: `price_`
  
- [ ] **STRIPE_WEBHOOK_SECRET**
  - Should start with: `whsec_`
  - Get it from: Stripe Dashboard → Developers → Webhooks → Your webhook endpoint

## ✅ App Configuration

- [ ] **VITE_APP_URL**
  - Should be: Your Vercel app URL (e.g., `https://huttle-ai.vercel.app`)
  - Or your custom domain if you have one

## ✅ Optional Variables (Nice to Have)

- [ ] **VITE_N8N_WEBHOOK_URL** (if using n8n)
- [ ] **VITE_GROK_API_KEY** (if using Grok AI)
- [ ] **VITE_PERPLEXITY_API_KEY** (if using Perplexity AI)

---

## After Checking All Variables

### If ANY Supabase Variables Are Missing:

1. **Get them from Supabase:**
   - Go to https://app.supabase.com
   - Select your project
   - Go to Settings → API
   - Copy the values

2. **Add them to Vercel:**
   - In Vercel Environment Variables page
   - Click **Add New**
   - Enter variable name (e.g., `VITE_SUPABASE_URL`)
   - Enter the value
   - Select environments: Production, Preview, Development (all three)
   - Click **Save**

3. **Repeat for each missing variable**

4. **REDEPLOY:**
   - Go to Deployments tab
   - Click ••• on latest deployment
   - Click Redeploy
   - Wait for completion

### If All Variables Are Present:

1. **Check the values are correct:**
   - URLs should be valid (no typos)
   - Keys should be complete (not truncated)
   - No extra spaces before/after values

2. **Redeploy anyway:**
   - Sometimes Vercel needs a fresh deployment to pick up changes
   - Go to Deployments → Redeploy

---

## Quick Test After Redeployment

1. Open your app in a new incognito window
2. Open browser console (F12)
3. Log in to your account
4. Check console for:
   - ✅ No "Auth check timed out" message
   - ✅ Your email appears in logs
   - ✅ No Supabase connection errors

5. Try to upgrade your plan
6. Should redirect to Stripe checkout

---

## What to Share If Still Not Working

If you've verified all variables and redeployed but it still doesn't work:

1. **Screenshot of Vercel Environment Variables page**
   - Hide the actual values (just show the variable names)
   
2. **Browser console output**
   - Copy/paste the console logs when you try to upgrade
   
3. **Network tab errors**
   - F12 → Network tab
   - Try to upgrade
   - Look for any red (failed) requests
   - Click on them and share the error details

---

## Expected Timeline

- Adding variables: 2-5 minutes
- Redeployment: 2-3 minutes
- Testing: 1-2 minutes
- **Total: ~10 minutes to fix**

The issue is almost certainly missing Supabase environment variables in Vercel. Once you add them and redeploy, checkout should work immediately.



