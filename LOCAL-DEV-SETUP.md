# Local Development Setup

## 🚨 Important: API Routes in Local Development

**The Problem:** When you run `npm run dev` (Vite), the API routes in `/api` folder are **NOT available** because they are Vercel serverless functions that only work when:
1. Deployed to Vercel, OR
2. Running with `vercel dev` locally

**The Solution:** Use `vercel dev` for local development to run both frontend and API routes.

---

## ✅ Recommended: Use Vercel Dev

### Step 1: Make sure you're logged into Vercel CLI

```bash
vercel login
```

### Step 2: Link your project (if not already linked)

```bash
vercel link
```

This will ask you:
- Set up and develop? **Yes**
- Which scope? (select your account)
- Link to existing project? **Yes** (if you've deployed before) or **No** (to create new)
- What's your project's name? (enter your project name)

### Step 3: Run the dev server with API support

```bash
npm run dev:vercel
```

This runs `vercel dev` which:
- ✅ Runs your Vite frontend (React app)
- ✅ Runs all serverless functions in `/api` folder
- ✅ Loads environment variables from `.env` and Vercel
- ✅ Provides hot reload for both frontend and API

### Step 4: Access your app

- Frontend: http://localhost:5173 (or the port shown)
- API routes: http://localhost:5173/api/ai/n8n-generator (automatically proxied)

---

## 🔄 Alternative: Vite Dev (Frontend Only)

If you only need to work on frontend code and don't need API routes:

```bash
npm run dev
```

**Note:** API calls will fail with 404 errors. Use this only for pure frontend development.

---

## 🐛 Troubleshooting

### Issue: "vercel: command not found"

**Solution:** Install Vercel CLI globally:
```bash
npm install -g vercel
```

### Issue: "Project not linked"

**Solution:** Run `vercel link` in your project directory.

### Issue: Environment variables not loading

**Solution:** 
1. Make sure you have a `.env` file in the project root
2. Or run `vercel env pull` to pull environment variables from Vercel

### Issue: Port already in use

**Solution:** Vercel dev will automatically use the next available port. Check the terminal output for the actual port.

### Issue: API routes still not working

**Check:**
1. Are you using `npm run dev:vercel` (not `npm run dev`)?
2. Do you see "Ready! Available at http://localhost:XXXX" in terminal?
3. Check browser console for the debug logs we added
4. Check terminal for backend API logs (should see `🚀 [n8n-generator] API route hit`)

---

## 📝 Environment Variables for Local Dev

Create a `.env` file in the project root:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# n8n Webhooks (for serverless functions)
N8N_WEBHOOK_URL_GENERATOR=https://your-n8n-instance.app/webhook/ai-generator

# Other API keys...
```

**Important:** 
- Variables without `VITE_` prefix are for serverless functions (backend)
- Variables with `VITE_` prefix are for frontend (client-side)

---

## 🎯 Quick Start

```bash
# 1. Install dependencies (if not done)
npm install

# 2. Link to Vercel (first time only)
vercel link

# 3. Start dev server with API support
npm run dev:vercel

# 4. Open browser to the URL shown in terminal
# 5. Test the Generate button - you should see debug logs!
```

---

## 📊 Debug Logs

When using `npm run dev:vercel`, you'll see:

**Terminal (Backend):**
```
🚀 [n8n-generator] API route hit
🔍 [n8n-generator] Checking N8N_WEBHOOK_URL_GENERATOR: FOUND
...
```

**Browser Console (Frontend):**
```
🎯 [Frontend] generateWithN8n called with payload: {...}
📤 [Frontend] Making fetch request to: /api/ai/n8n-generator
...
```

If you don't see these logs, the API routes aren't running. Make sure you're using `npm run dev:vercel`!

