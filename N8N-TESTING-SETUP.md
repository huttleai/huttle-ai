# n8n Workflow Testing Setup - Quick Guide

**Status:** Ready to test n8n workflows in Cursor ✅  
**Date:** December 15, 2025

---

## ✅ Issues Fixed

1. **Local API Server Crash** - Fixed undefined variable error
2. **Missing Stripe Dependency** - Added graceful failure handling (Stripe not needed for n8n testing)
3. **Port Conflicts** - Instructions to clean up stale processes

---

## 🔧 Required Environment Variables

Before testing, verify your `.env` file contains these variables:

### ✅ Required for n8n Testing

```bash
# n8n Webhook Configuration (REQUIRED)
N8N_WEBHOOK_URL_GENERATOR=https://your-n8n-instance.app/webhook/ai-generator

# Supabase Authentication (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### ⚠️ Optional (Not needed for n8n testing)

```bash
# Stripe (only needed if testing subscriptions/payments)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Other AI APIs (only if you want alternatives to n8n)
GROK_API_KEY=xxx
PERPLEXITY_API_KEY=xxx

# Local Development
LOCAL_API_PORT=3001  # Optional, defaults to 3001
```

---

## 🚀 Quick Start Testing

### Step 1: Clean Up Running Processes

You have multiple `npm run dev` processes hogging ports. Kill them all:

```bash
# Find all node processes
ps aux | grep node

# Kill specific process IDs (example)
kill -9 3839 31349 33661

# Or kill all node processes (nuclear option)
pkill -f "npm run dev"
pkill -f "vite"
```

### Step 2: Start Fresh Development Server

```bash
npm run dev:local
```

**Expected Output:**
```
[0] 🚀 Local API server running on http://localhost:3001
[0] ✅ API routes loaded
[0] ⚠️  Stripe checkout route skipped: Cannot find package 'stripe'
[0] ⚠️  Stripe portal route skipped: Cannot find package 'stripe'
[0] ⚠️  Stripe webhook route skipped: Cannot find package 'stripe'
[0] ⚠️  Stripe subscription status route skipped: Cannot find package 'stripe'
[1] VITE v7.1.12  ready in 110 ms
[1] ➜  Local:   http://localhost:5173/
```

**Note:** The Stripe warnings are EXPECTED and NORMAL - you don't need Stripe for n8n testing.

### Step 3: Test n8n Workflow

1. **Open the app:** http://localhost:5173
2. **Login** with your Supabase account
3. **Navigate to:** AI Tools → Caption Generator
4. **Enter some text** (e.g., "healthy breakfast ideas")
5. **Click "Generate"** button
6. **Watch the console logs** in both:
   - Browser DevTools Console (F12)
   - Terminal where `npm run dev:local` is running

---

## 📊 Debug Logs to Watch For

### ✅ Success Flow

**Browser Console:**
```
🎯 [Frontend] generateWithN8n called with payload: {...}
🔐 [Frontend] Getting auth headers...
✅ [Frontend] Auth headers obtained: {...}
📤 [Frontend] Making fetch request to: /api/ai/n8n-generator
📥 [Frontend] Received response. Status: 200 OK: true
⏱️ [Frontend] Response time: 2547 ms
✅ [Frontend] Response OK. Parsing JSON...
✅ [Frontend] Result parsed: {...}
```

**Terminal Output:**
```
🚀 [n8n-generator] API route hit
🔍 [n8n-generator] Checking N8N_WEBHOOK_URL_GENERATOR: FOUND
📦 [n8n-generator] Request body received: {...}
✅ [n8n-generator] All required fields present
🌐 [n8n-generator] Sending request to n8n webhook...
📥 [n8n-generator] Received response from n8n. Status: 200
✅ [n8n-generator] Returning success response to client
```

### ❌ Common Errors and Solutions

#### Error: "N8N_WEBHOOK_URL_GENERATOR: MISSING"

**Terminal shows:**
```
🔍 [n8n-generator] Checking N8N_WEBHOOK_URL_GENERATOR: MISSING
❌ [n8n-generator] N8N_WEBHOOK_URL_GENERATOR environment variable not set
```

**Solution:**
1. Add `N8N_WEBHOOK_URL_GENERATOR` to your `.env` file
2. Restart the dev server: `Ctrl+C` then `npm run dev:local`

#### Error: "Auth validation failed"

**Terminal shows:**
```
❌ [n8n-generator] Auth validation failed
```

**Solution:**
1. Make sure you're logged in to the app
2. Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
3. Try logging out and back in

#### Error: "Network error connecting to n8n"

**Terminal shows:**
```
❌ [n8n-generator] Fetch error: connect ECONNREFUSED
```

**Solution:**
1. Verify your n8n instance is running
2. Check the webhook URL is correct (no typos)
3. Test the webhook directly with curl:
   ```bash
   curl -X POST https://your-n8n-instance.app/webhook/ai-generator \
     -H "Content-Type: application/json" \
     -d '{"userId":"test","topic":"test","platform":"instagram","contentType":"caption","brandVoice":"engaging"}'
   ```

#### Error: "Request timeout"

**Terminal shows:**
```
❌ [n8n-generator] N8n request timeout: (>60s)
```

**Solution:**
1. Check n8n workflow execution logs
2. Verify AI model in n8n is responding
3. Check n8n workflow has proper error handling

---

## 🧪 Testing Checklist

After starting the server, verify:

- [ ] API server starts on port 3001 without crashes
- [ ] Frontend starts on port 5173
- [ ] No errors in terminal (Stripe warnings are OK)
- [ ] You can access http://localhost:5173
- [ ] You can login successfully
- [ ] Caption Generator page loads
- [ ] Clicking "Generate" shows console logs
- [ ] Request reaches n8n webhook
- [ ] Generated content appears in the UI

---

## 🔍 Troubleshooting Commands

### Check if ports are in use
```bash
lsof -i :3001  # Check API server port
lsof -i :5173  # Check Vite port
```

### Kill process on specific port
```bash
kill -9 $(lsof -ti:3001)
kill -9 $(lsof -ti:5173)
```

### View environment variables (debug)
```bash
# Check if .env file exists
ls -la .env

# View .env contents (be careful - contains secrets!)
cat .env | grep -v "SECRET\|KEY"  # Shows non-secret vars only
```

### Test n8n webhook directly
```bash
curl -X POST $N8N_WEBHOOK_URL_GENERATOR \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "topic": "healthy breakfast recipes",
    "platform": "instagram",
    "contentType": "caption",
    "brandVoice": "engaging",
    "timestamp": "2025-12-15T12:00:00Z"
  }'
```

---

## 📝 Next Steps After Successful Testing

Once n8n workflows are working:

1. **Test other AI tools:**
   - Hook Builder
   - Hashtag Generator
   - CTA Suggester

2. **Test on different platforms:**
   - Instagram
   - X (Twitter)
   - TikTok
   - LinkedIn
   - YouTube

3. **Monitor n8n workflow logs:**
   - Check execution history
   - Review response times
   - Track success/failure rates

4. **Deploy to production:**
   - Push code to GitHub
   - Deploy to Vercel
   - Add environment variables in Vercel Dashboard
   - Test in production environment

---

## 🆘 Still Having Issues?

If you're still getting errors after following this guide:

1. **Copy the error logs** from both browser console and terminal
2. **Check which step fails** using the emoji indicators (🚀 ✅ ❌)
3. **Look for the last successful log** before the error
4. **Share the error details** - the debug logs will pinpoint the exact issue

The comprehensive debug logging added to the code will show you exactly where the request flow breaks down.

---

**🎉 Ready to Test!**

Run `npm run dev:local` and start generating content with your n8n workflows!








