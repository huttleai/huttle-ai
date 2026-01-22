# Local Testing Setup (Without Vercel)

## 🎯 Quick Start

This setup lets you test your n8n workflow locally in Cursor **without** needing Vercel CLI.

### Step 1: Make sure environment variables are set

Create or check your `.env` file in the project root:

```bash
# Supabase (required for auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# n8n Webhook (required for API to work)
N8N_WEBHOOK_URL_GENERATOR=https://your-n8n-instance.app/webhook/ai-generator

# Other API keys if needed...
```

### Step 2: Start the development servers

Run this single command to start both the frontend and API server:

```bash
npm run dev:local
```

This will:
- ✅ Start the local API server on `http://localhost:3001`
- ✅ Start the Vite frontend on `http://localhost:5173`
- ✅ Proxy all `/api/*` requests from frontend to the API server

### Step 3: Test your n8n workflow

1. Open http://localhost:5173 in your browser
2. Navigate to the Caption Generator (AI Tools)
3. Enter some text and click "Generate"
4. Check the logs:

**Terminal Output:**
```
🚀 Local API server running on http://localhost:3001
✅ API routes loaded
🚀 [n8n-generator] API route hit
🔍 [n8n-generator] Checking N8N_WEBHOOK_URL_GENERATOR: FOUND
...
```

**Browser Console:**
```
🎯 [Frontend] generateWithN8n called with payload: {...}
📤 [Frontend] Making fetch request to: /api/ai/n8n-generator
📥 [Frontend] Received response. Status: 200 OK: true
...
```

---

## 🛠️ How It Works

1. **Local API Server** (`server/local-api-server.js`):
   - Runs on port 3001
   - Loads your Vercel serverless functions
   - Handles requests from the frontend

2. **Vite Dev Server**:
   - Runs on port 5173
   - Serves your React frontend
   - Proxies `/api/*` requests to the local API server

3. **Concurrently**:
   - Runs both servers at the same time
   - Shows logs from both in one terminal

---

## 📝 Available Commands

```bash
# Start both frontend and API (recommended)
npm run dev:local

# Start only the API server
npm run dev:api

# Start only the frontend (API won't work)
npm run dev:frontend

# Use Vercel dev (if you want Vercel features)
npm run dev:vercel

# Original Vite only (no API support)
npm run dev
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'express'"

**Solution:** Run `npm install` to install dependencies.

### Issue: Port 3001 already in use

**Solution:** Change the port in `.env`:
```bash
LOCAL_API_PORT=3002
```

Then update `vite.config.js` proxy target to match.

### Issue: API routes return 404

**Check:**
1. Is the API server running? (Look for "🚀 Local API server running")
2. Check terminal for errors loading routes
3. Verify your `.env` file has all required variables

### Issue: "N8N_WEBHOOK_URL_GENERATOR: MISSING"

**Solution:** Add it to your `.env` file:
```bash
N8N_WEBHOOK_URL_GENERATOR=https://your-n8n-webhook-url
```

### Issue: Auth validation fails

**Check:**
1. `SUPABASE_URL` is set in `.env`
2. `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
3. User is logged in the frontend
4. Supabase project is active

---

## 🔍 Debug Logs

All the debug logs we added will work with this setup:

**Frontend logs** (Browser Console):
- 🎯 Function called
- 📤 Request sent
- 📥 Response received

**Backend logs** (Terminal):
- 🚀 API route hit
- 🔍 Environment variables checked
- 📦 Request body received
- 🌐 N8n request sent
- ✅ Response received

---

## ✅ Verification Checklist

After starting `npm run dev:local`, you should see:

- [ ] "🚀 Local API server running on http://localhost:3001"
- [ ] "✅ API routes loaded"
- [ ] Vite dev server starts on port 5173
- [ ] Browser opens to http://localhost:5173
- [ ] Clicking "Generate" shows logs in both terminal and browser console
- [ ] N8n webhook receives the request

---

## 🚀 Next Steps

Once testing is complete locally:

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Set environment variables in Vercel Dashboard:**
   - Go to your Vercel project → Settings → Environment Variables
   - Add all the variables from your `.env` file (without `VITE_` prefix for serverless functions)

3. **Test in production:**
   - Your API routes will work automatically on Vercel
   - No code changes needed!

---

## 💡 Tips

- Keep the terminal open to see all logs
- Use browser DevTools Network tab to inspect API requests
- Check the terminal for backend errors if frontend fails
- All debug logs will help identify issues quickly

---

**Ready to test!** Run `npm run dev:local` and click that Generate button! 🎉










