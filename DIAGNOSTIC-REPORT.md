# 🔍 Diagnostic Report - API Service Errors

**Date:** December 26, 2025  
**Issue:** 500 Internal Server Error on `/api/plan-builder-proxy` and 400 Bad Request on auth endpoints

---

## 🚨 Root Cause Analysis

### **Issue 1: 500 Error on `/api/plan-builder-proxy`**

**Error Log:**
```
3:56:31 PM [vite] http proxy error: /api/plan-builder-proxy
AggregateError [ECONNREFUSED]: 
    at internalConnectMultiple (node:net:1134:18)
    at afterConnectMultiple (node:net:1715:7)
```

**Root Cause:**
- Vite dev server (running on port 5190) is configured to proxy `/api` requests to `http://localhost:3001`
- **No server is running on port 3001** (the local API server is not started)
- `ECONNREFUSED` = connection refused = nothing listening on that port

**Current State:**
- ✅ `vercel dev` is running on port 3000 (terminal 22) - **CAN handle API routes**
- ✅ `npm run dev` is running on port 5190 (terminal 24) - **tries to proxy to 3001**
- ❌ Local API server is NOT running on port 3001
- ❌ Missing `.env` file with environment variables

---

## 🔧 Solutions

You have **THREE options** for running the application:

### **Option A: Use `vercel dev` (RECOMMENDED)**

**Pros:**
- ✅ Already running and configured
- ✅ Handles both frontend AND API routes automatically
- ✅ Loads environment variables from Vercel
- ✅ Most similar to production environment

**Steps:**
1. Stop the `npm run dev` server in terminal 24 (Ctrl+C)
2. Use the already-running `vercel dev` at **http://localhost:3000**
3. All API routes will work automatically

**Access:**
- Frontend: http://localhost:3000
- API routes: http://localhost:3000/api/plan-builder-proxy

---

### **Option B: Use Local API Server (for offline development)**

**Pros:**
- ✅ Works without internet connection
- ✅ Doesn't require Vercel CLI
- ✅ Faster startup time

**Steps:**

1. **Create `.env` file** (copy the content below):

```bash
# Create .env file in project root
touch .env
```

Add this content to `.env`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://khtaqmfhlmnwwzkpfgev.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_URL=https://khtaqmfhlmnwwzkpfgev.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# n8n Webhook URLs
VITE_N8N_PLAN_BUILDER_WEBHOOK=https://huttleai.app.n8n.cloud/webhook/plan-builder-async
VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK=https://huttleai.app.n8n.cloud/webhook-test/viral-blueprint

# API Configuration
VITE_API_URL=/api
LOCAL_API_PORT=3001

# Development Mode
NODE_ENV=development

# xAI Grok API
VITE_GROK_API_KEY=your_grok_api_key_here

# Perplexity API
VITE_PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Stripe API
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
VITE_STRIPE_PRICE_ESSENTIALS=price_xxx
VITE_STRIPE_PRICE_PRO=price_yyy
```

2. **Stop all running dev servers** (in all terminals, press Ctrl+C)

3. **Start with local API server:**

```bash
npm run dev:local
```

This will start:
- Local API server on port 3001 (now includes plan-builder-proxy and viral-blueprint-proxy)
- Vite frontend on port 5173
- Both will run concurrently

**Access:**
- Frontend: http://localhost:5173
- API routes: http://localhost:5173/api/plan-builder-proxy (proxied to 3001)

---

### **Option C: Run API server separately (for debugging)**

**Use this when you want to see detailed API logs:**

1. **Create `.env` file** (see Option B above)

2. **Terminal 1** - Start API server:
```bash
npm run dev:api
```

3. **Terminal 2** - Start frontend:
```bash
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- API server: http://localhost:3001
- API health check: http://localhost:3001/health

---

## 🛠️ What Was Fixed

### ✅ Updated Local API Server

**File:** `server/local-api-server.js`

**Added routes:**
- `/api/plan-builder-proxy` → Proxies Plan Builder requests to n8n
- `/api/viral-blueprint-proxy` → Proxies Viral Blueprint requests to n8n
- `/api/create-plan-builder-job` → Creates Plan Builder jobs in Supabase
- `/api/get-job-status` → Checks job status

**Before:**
- Local API server was missing these critical routes
- Requests would return 404 Not Found

**After:**
- All routes now available in local development
- Matches production Vercel serverless functions

---

## 🧪 Testing the Fix

### **Test 1: Check Server is Running**

**For Option A (vercel dev):**
```bash
curl http://localhost:3000/api/health || echo "Make sure vercel dev is running"
```

**For Option B/C (local API server):**
```bash
curl http://localhost:3001/health
```

**Expected response:**
```json
{"status":"ok","message":"Local API server is running"}
```

---

### **Test 2: Test Plan Builder Proxy**

**Frontend test:**
1. Open browser to http://localhost:3000 (or 5173)
2. Navigate to **AI Plan Builder** page
3. Fill out the form and click **Generate Plan**
4. Open browser console (F12)

**Expected console logs:**
```
[PlanBuilder] ====== WEBHOOK REQUEST DEBUG ======
[PlanBuilder] Using proxy endpoint: /api/plan-builder-proxy
[PlanBuilder] Job ID: <job_id>
[PlanBuilder] ====================================
[PlanBuilder] Attempt 1 of 3 - Triggering webhook...
[PlanBuilder] Response status: 200 OK
```

**API logs (in terminal):**
```
[plan-builder-proxy] API route hit
[plan-builder-proxy] Request method: POST
[plan-builder-proxy] Forwarding request to n8n: https://huttleai.app.n8n.cloud/webhook/plan-builder-async
[plan-builder-proxy] Job ID: <job_id>
[plan-builder-proxy] n8n response status: 200 OK
```

---

### **Test 3: Verify Authentication**

**Check user profile loading:**
1. Open browser DevTools → Network tab
2. Reload the page
3. Look for requests to Supabase API

**Expected:**
- ✅ Successful authentication session retrieval
- ✅ User profile loaded
- ✅ No 400 Bad Request errors

**If you see 400 errors:**
- Check that `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Verify Supabase project is accessible
- Check browser console for detailed error messages

---

## 📋 Environment Variables Checklist

Make sure you have these in your `.env` file:

### **Required for Basic Functionality:**
- ✅ `VITE_SUPABASE_URL` - Your Supabase project URL
- ✅ `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (for client)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server)

### **Required for Plan Builder:**
- ✅ `VITE_N8N_PLAN_BUILDER_WEBHOOK` - n8n webhook for Plan Builder
- ✅ `VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK` - n8n webhook for Viral Blueprint

### **Optional (for full feature set):**
- ⚠️ `VITE_GROK_API_KEY` - xAI Grok API for content generation
- ⚠️ `VITE_PERPLEXITY_API_KEY` - Perplexity API for trend discovery
- ⚠️ `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe for payments

---

## 🚀 Recommended Next Steps

### **Step 1: Choose your development mode**

I recommend **Option A** (`vercel dev`) because:
- You already have it running
- It's the closest to production
- Automatically handles all API routes
- Loads environment variables from Vercel

### **Step 2: Create `.env` file**

Even with `vercel dev`, create a `.env` file for:
- Local overrides of environment variables
- Sensitive keys you don't want in Vercel
- Development-specific settings

You can create the file manually or run:
```bash
# Pull environment variables from Vercel
vercel env pull
```

### **Step 3: Stop conflicting servers**

Since you have `vercel dev` on port 3000, stop the `npm run dev` on port 5190:
1. Go to terminal 24
2. Press Ctrl+C
3. Use `vercel dev` at http://localhost:3000

### **Step 4: Test the application**

1. Open http://localhost:3000
2. Navigate to AI Plan Builder
3. Try generating a plan
4. Check console and terminal logs

---

## 🐛 Common Issues & Solutions

### **Issue: "ECONNREFUSED" errors**

**Cause:** No server running on the expected port

**Solution:**
- Check which port your server is running on
- Make sure you're accessing the correct URL
- If using Vite dev server, make sure local API server is running on 3001

---

### **Issue: "404 Not Found" on API routes**

**Cause:** Using `npm run dev` without local API server

**Solution:**
- Use `npm run dev:local` (starts both frontend and API)
- OR use `vercel dev` (handles both automatically)

---

### **Issue: "n8n webhook not registered"**

**Cause:** n8n workflow not activated in test mode

**Solution:**
1. Log into n8n: https://huttleai.app.n8n.cloud
2. Open the Plan Builder workflow
3. Click "Execute workflow" button to activate test mode
4. Try again within 2 minutes

---

### **Issue: Environment variables not loading**

**Cause:** Missing or incorrect `.env` file

**Solution:**
- Create `.env` file in project root
- Use the template provided above
- Restart the dev server after creating `.env`

---

## 📊 Service Status Summary

### **Servers Currently Running:**
- ✅ `vercel dev` on port 3000 (terminal 22) - **READY TO USE**
- ⚠️ `npm run dev` on port 5190 (terminal 24) - **STOP THIS (causes conflicts)**

### **Servers NOT Running:**
- ❌ Local API server on port 3001 - **START IF USING OPTION B/C**

### **API Routes Status:**
- ✅ `/api/plan-builder-proxy` - Available in `vercel dev` and updated local API server
- ✅ `/api/viral-blueprint-proxy` - Available in `vercel dev` and updated local API server
- ✅ `/api/create-plan-builder-job` - Available in both
- ✅ `/api/get-job-status` - Available in both

---

## 📝 Summary

**What was wrong:**
1. Vite dev server trying to proxy to port 3001, but nothing running there
2. Local API server missing plan-builder-proxy and viral-blueprint-proxy routes
3. No `.env` file with required environment variables

**What was fixed:**
1. ✅ Updated local API server to include missing routes
2. ✅ Documented three different development modes
3. ✅ Provided `.env` template with all required variables
4. ✅ Created comprehensive testing and troubleshooting guide

**Recommended action:**
- **Stop the `npm run dev` server on port 5190**
- **Use the already-running `vercel dev` on port 3000**
- **Create `.env` file with your API keys**
- **Test the Plan Builder feature**

---

## 🎯 Quick Start Command

**Recommended (use vercel dev):**
```bash
# In terminal 24, stop npm run dev (Ctrl+C)
# Then use the already-running vercel dev at:
open http://localhost:3000
```

**Alternative (use local API server):**
```bash
# Stop all servers first (Ctrl+C in each terminal)
# Then run:
npm run dev:local
open http://localhost:5173
```

---

**Need help?** Check the logs in the terminal and browser console. All requests are logged with `[plan-builder-proxy]` prefix for easy debugging.



