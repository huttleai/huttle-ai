# Quick Start: Local Testing

## ✅ Bug Fixed!

The variable name bug has been fixed. You're ready to test!

---

## 📋 What You Need to Do

### Step 1: Verify Your `.env` File

Make sure you have a `.env` file in your project root with these variables:

```bash
# Required for API to work:
N8N_WEBHOOK_URL_GENERATOR=https://your-n8n-instance.app/webhook/ai-generator

# Required for authentication:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Required for frontend:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important:** Replace the placeholder values with your actual credentials.

### Step 2: Start the Development Servers

Run this single command:

```bash
npm run dev:local
```

This will start:
- ✅ Local API server on port **3001** (runs your serverless functions)
- ✅ Vite frontend on port **5173** (or next available port)

### Step 3: Test Your n8n Workflow

1. **Open your browser** to the URL shown in the terminal (likely `http://localhost:5173` or similar)

2. **Navigate to AI Tools** → Caption Generator (or Hook Builder)

3. **Enter some text** and click "Generate"

4. **Watch the logs:**
   - **Terminal:** Should show `🚀 [n8n-generator] API route hit` and other debug logs
   - **Browser Console (F12):** Should show frontend debug logs

5. **Check your n8n workflow** - it should receive the request!

---

## 🎯 What Success Looks Like

### Terminal Output:
```
🚀 Local API server running on http://localhost:3001
✅ API routes loaded
🚀 [n8n-generator] API route hit
🔍 [n8n-generator] Checking N8N_WEBHOOK_URL_GENERATOR: FOUND
📦 [n8n-generator] Request body received: {...}
🌐 [n8n-generator] Sending request to n8n webhook...
📥 [n8n-generator] Received response from n8n. Status: 200
```

### Browser Console:
```
🎯 [Frontend] generateWithN8n called with payload: {...}
📤 [Frontend] Making fetch request to: /api/ai/n8n-generator
📥 [Frontend] Received response. Status: 200 OK: true
✅ [Frontend] Response OK. Parsing JSON...
✅ [Frontend] Returning success result
```

---

## 🐛 If Something Goes Wrong

### Issue: "N8N_WEBHOOK_URL_GENERATOR: MISSING"
**Fix:** Add it to your `.env` file

### Issue: API server won't start
**Check:**
- Port 3001 is not already in use
- All required environment variables are set
- Run `npm install` if you get module errors

### Issue: Frontend can't reach API
**Check:**
- Both servers are running (look for two processes in terminal)
- Vite proxy is working (check Network tab in browser DevTools)

### Issue: Auth validation fails
**Check:**
- User is logged in
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Supabase project is active

---

## 📚 More Help

See `LOCAL-TESTING-SETUP.md` for detailed troubleshooting.

---

**Ready? Run `npm run dev:local` and test your workflow!** 🚀







