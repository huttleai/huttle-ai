# N8n Connection Debugging Guide

**Date:** December 15, 2025  
**Issue:** Generate button in frontend not triggering n8n webhook  
**Status:** Debug logs added - ready for testing

---

## 🔍 What Was Changed

### 1. Backend API Debug Logs (`api/ai/n8n-generator.js`)

Added comprehensive debug logging throughout the entire request lifecycle:

#### Entry Point Logs
- ✅ `🚀 [n8n-generator] API route hit` - Confirms API endpoint is reached
- ✅ Request method and URL logged
- ✅ CORS preflight handling logged

#### Environment Variable Checks
- ✅ `N8N_WEBHOOK_URL_GENERATOR` - Shows FOUND or MISSING
- ✅ `SUPABASE_URL` - Shows FOUND or MISSING  
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Shows FOUND or MISSING

**Important:** The actual webhook URL is NOT logged for security reasons.

#### Request Processing Logs
- ✅ Request body received (shows which fields are present)
- ✅ Auth token validation status
- ✅ Required field validation (userId, topic, contentType, platform)
- ✅ User ID match verification

#### N8n Request Logs
- ✅ Webhook URL configuration status
- ✅ Fetch request initiation
- ✅ Response status from n8n
- ✅ Response parsing success/failure
- ✅ Response data summary (content length, hashtags, metadata)

#### Error Logs
- ✅ Auth validation failures
- ✅ Missing required fields
- ✅ N8n error responses with status codes
- ✅ Timeout errors
- ✅ Network/fetch errors
- ✅ General proxy errors with stack traces

### 2. Frontend Service Debug Logs (`src/services/n8nGeneratorAPI.js`)

Added comprehensive client-side logging:

#### Call Initiation
- ✅ `🎯 [Frontend] generateWithN8n called` - Shows payload summary
- ✅ Field validation logs (userId, topic, contentType, platform)

#### Request Preparation
- ✅ Auth header retrieval status
- ✅ Request body prepared (with topic preview)
- ✅ Target URL logged (`/api/ai/n8n-generator`)

#### Response Handling
- ✅ Response status and OK flag
- ✅ Response time in milliseconds
- ✅ JSON parsing status
- ✅ Result summary (content, hashtags, metadata)

#### Error Handling
- ✅ Error type detection (TIMEOUT, NETWORK, VALIDATION, UNKNOWN)
- ✅ Error details with name, message, and stack trace preview

---

## 🧪 How to Test

### Step 1: Restart Your Development Server

The serverless functions need to be restarted to pick up the new code:

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 2: Open Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Clear any existing logs

### Step 3: Click the Generate Button

Navigate to the Caption Generator (or Hook Builder) and click "Generate".

### Step 4: Watch the Logs

You should see a sequence of logs like this:

**Frontend (Browser Console):**
```
🎯 [Frontend] generateWithN8n called with payload: {...}
🔐 [Frontend] Getting auth headers...
✅ [Frontend] Auth headers obtained: {...}
📤 [Frontend] Making fetch request to: /api/ai/n8n-generator
📤 [Frontend] Request body: {...}
📥 [Frontend] Received response. Status: 200 OK: true
⏱️ [Frontend] Response time: 2547 ms
✅ [Frontend] Response OK. Parsing JSON...
✅ [Frontend] Result parsed: {...}
✅ [Frontend] Returning success result
```

**Backend (Terminal where server is running):**
```
🚀 [n8n-generator] API route hit
🚀 [n8n-generator] Request method: POST
🔍 [n8n-generator] Checking N8N_WEBHOOK_URL_GENERATOR: FOUND
🔍 [n8n-generator] Checking SUPABASE_URL: FOUND
🔍 [n8n-generator] Checking SUPABASE_SERVICE_ROLE_KEY: FOUND
📦 [n8n-generator] Request body received: {...}
🔐 [n8n-generator] Validating auth token...
✅ [n8n-generator] Auth validated for user: xxx-xxx-xxx
✅ [n8n-generator] Validating required fields...
✅ [n8n-generator] All required fields present
✅ [n8n-generator] User ID matches auth
📤 [n8n-generator] Prepared n8n payload: {...}
🌐 [n8n-generator] Sending request to n8n webhook...
📡 [n8n-generator] Making fetch request to n8n...
📥 [n8n-generator] Received response from n8n. Status: 200
✅ [n8n-generator] N8n response parsed successfully
📊 [n8n-generator] N8n response summary: {...}
✅ [n8n-generator] Returning success response to client
```

---

## 🚨 Common Issues & What to Look For

### Issue 1: API Route Not Hit
**Symptoms:** No `🚀 [n8n-generator] API route hit` log in terminal

**Possible Causes:**
- Frontend not calling the correct endpoint
- Build issue - restart dev server
- Serverless function not deployed locally

**Check:**
- Look for frontend logs showing the fetch URL
- Verify you see `📤 [Frontend] Making fetch request to: /api/ai/n8n-generator`

### Issue 2: Environment Variable Missing
**Symptoms:** `🔍 [n8n-generator] Checking N8N_WEBHOOK_URL_GENERATOR: MISSING`

**Solution:**
1. Check if `.env` file exists in project root
2. Verify `N8N_WEBHOOK_URL_GENERATOR=https://your-n8n-webhook-url` is present
3. Restart the dev server after adding the variable
4. For Vercel deployment, add it in Vercel Dashboard → Settings → Environment Variables

### Issue 3: Auth Token Invalid
**Symptoms:** `❌ [n8n-generator] Auth validation failed`

**Possible Causes:**
- User not logged in
- Session expired
- Supabase configuration issue

**Check:**
- Look for `🔐 [Frontend] Auth headers obtained: { hasAuthorization: false }`
- Verify user is logged in
- Check Supabase credentials in environment variables

### Issue 4: N8n Webhook Not Responding
**Symptoms:** 
- `📡 [n8n-generator] Making fetch request to n8n...`
- But no `📥 [n8n-generator] Received response` after

**Possible Causes:**
- N8n webhook URL is incorrect
- N8n instance is down
- Network connectivity issue
- Webhook timeout (>60 seconds)

**Solution:**
1. Verify the n8n webhook URL is correct
2. Test the webhook directly with curl:
   ```bash
   curl -X POST https://your-n8n-webhook-url \
     -H "Content-Type: application/json" \
     -d '{"userId":"test","topic":"test","platform":"instagram","contentType":"caption"}'
   ```
3. Check n8n workflow is active and running
4. Look for `❌ [n8n-generator] N8n request timeout` after 60 seconds

### Issue 5: Request Body Missing Fields
**Symptoms:** `❌ [n8n-generator] Missing userId` (or other field)

**Check Frontend Logs:**
- Look for `📤 [Frontend] Request body: {...}` 
- Verify all required fields are present: userId, topic, platform, contentType

---

## 📋 Required Environment Variables

### Backend (Serverless Functions)
```bash
# In .env file or Vercel environment variables
N8N_WEBHOOK_URL_GENERATOR=https://your-n8n-instance.app/webhook/ai-generator
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Frontend
```bash
# In .env file (with VITE_ prefix for Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 🔄 Request Flow

Understanding the complete flow helps identify where issues occur:

1. **User clicks "Generate" button** in AITools.jsx or TrendLab.jsx
2. **Frontend calls** `generateWithN8n()` in `src/services/n8nGeneratorAPI.js`
3. **Frontend gets auth headers** from Supabase session
4. **Frontend makes fetch** to `/api/ai/n8n-generator`
5. **Backend receives request** in `api/ai/n8n-generator.js`
6. **Backend validates** environment variables
7. **Backend validates** auth token with Supabase
8. **Backend validates** request body fields
9. **Backend proxies** request to n8n webhook
10. **N8n processes** the request (AI generation)
11. **N8n returns** response to backend
12. **Backend forwards** response to frontend
13. **Frontend displays** generated content to user

---

## 📝 Next Steps After Testing

Once you run the test:

1. **Copy the logs** from both browser console and terminal
2. **Share them** with me so I can identify the exact failure point
3. **Look for** the last successful log message before any errors
4. **Check for** any red ❌ emoji logs which indicate failures

The logs will tell us exactly where the request is failing:
- Is the API route being hit?
- Are environment variables configured?
- Is authentication working?
- Is the request reaching n8n?
- Is n8n responding?

---

## 🛠️ Rollback Plan

If these changes cause any issues, you can rollback by:

1. Remove the debug logs (search for `console.log` in both files)
2. Or revert the files to their previous versions using git:
   ```bash
   git checkout HEAD -- api/ai/n8n-generator.js src/services/n8nGeneratorAPI.js
   ```

---

## ✅ Ready to Test

**Your action items:**
1. ✅ Restart your dev server: `npm run dev`
2. ✅ Open browser console (F12)
3. ✅ Click "Generate" button
4. ✅ Copy the logs from console and terminal
5. ✅ Share the logs with me for analysis

The debug logs will give us complete visibility into the request flow and help us identify exactly where and why it's failing silently.









