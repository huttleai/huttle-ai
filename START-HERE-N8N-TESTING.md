# 🚀 START HERE - n8n Workflow Testing

**All errors have been fixed!** Follow these steps to test your n8n workflows.

---

## ⚡ Quick Start (3 Steps)

### 1️⃣ Kill All Running Processes

You have multiple node/vite processes running that are causing port conflicts.

```bash
# Kill all stale processes
pkill -f "npm run dev"
pkill -f "vite"
pkill -f "node"
```

Or find and kill specific processes:
```bash
ps aux | grep node
kill -9 [PID]  # Replace [PID] with actual process ID
```

### 2️⃣ Verify Environment Variables

Make sure your `.env` file has these **REQUIRED** variables:

```bash
# n8n (REQUIRED for testing)
N8N_WEBHOOK_URL_GENERATOR=https://your-n8n-instance.app/webhook/ai-generator

# Supabase (REQUIRED for auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Note:** You do NOT need Stripe installed for n8n testing. The Stripe warnings you'll see are normal and expected.

### 3️⃣ Start the Server

```bash
npm run dev:local
```

**Expected output (this is GOOD):**
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

The Stripe warnings are **NORMAL** - ignore them! ✅

---

## 🧪 Test Your n8n Workflow

1. Open **http://localhost:5173** in your browser
2. Login with your Supabase account
3. Go to **AI Tools → Caption Generator**
4. Enter some text: `"healthy breakfast ideas"`
5. Click **"Generate"**
6. Open **Browser DevTools (F12) → Console tab**
7. Watch the logs in both **browser console** and **terminal**

### ✅ You Should See:

**Browser Console:**
- `🎯 [Frontend] generateWithN8n called...`
- `📤 [Frontend] Making fetch request...`
- `📥 [Frontend] Received response. Status: 200`

**Terminal:**
- `🚀 [n8n-generator] API route hit`
- `🔍 [n8n-generator] Checking N8N_WEBHOOK_URL_GENERATOR: FOUND`
- `🌐 [n8n-generator] Sending request to n8n webhook...`
- `✅ [n8n-generator] Returning success response`

---

## 🐛 Common Issues

### Issue: "N8N_WEBHOOK_URL_GENERATOR: MISSING"

**Fix:** Add the variable to `.env` and restart the server.

### Issue: "Auth validation failed"

**Fix:** Make sure you're logged in and Supabase credentials are correct.

### Issue: "Network error connecting to n8n"

**Fix:** Check your n8n instance is running and the webhook URL is correct. Test it:

```bash
curl -X POST https://your-n8n-instance.app/webhook/ai-generator \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","topic":"test","platform":"instagram","contentType":"caption","brandVoice":"engaging"}'
```

### Issue: Port already in use

**Fix:** Kill the processes using step 1️⃣ above.

---

## 📚 Full Documentation

For detailed troubleshooting and advanced options, see:
- **[N8N-TESTING-SETUP.md](N8N-TESTING-SETUP.md)** - Complete testing guide
- **[LOCAL-TESTING-SETUP.md](LOCAL-TESTING-SETUP.md)** - Original local dev setup
- **[DEBUG-N8N-CONNECTION.md](DEBUG-N8N-CONNECTION.md)** - Debug logs explanation

---

## ✅ What Was Fixed

1. **Local API Server Crash** - Fixed undefined variable error in `server/local-api-server.js`
2. **Missing Stripe Dependency** - Added graceful failure handling (server starts even without Stripe)
3. **Port Conflicts** - Provided cleanup instructions

---

## 🎉 You're Ready!

Run these commands and start testing:

```bash
# 1. Clean up
pkill -f "npm run dev"

# 2. Start fresh
npm run dev:local

# 3. Open browser
open http://localhost:5173
```

The debug logs will show you exactly where any issues occur. Share the logs if you need help!





