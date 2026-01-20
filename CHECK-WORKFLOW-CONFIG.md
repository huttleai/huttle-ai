# Quick Workflow Configuration Check

## Step 1: Check Browser Console

1. Open your app in the browser
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Try to run a Deep Dive analysis
5. Look for these log messages:

### ✅ If Workflow is Configured:
```
[N8N_WORKFLOW] Workflow configuration check: {
  workflowName: 'trend-deep-dive',
  isConfigured: true,
  webhookUrl: 'https://your-n8n.app/webhook/trend-deep-dive',
  envVar: 'VITE_N8N_TREND_DEEP_DIVE_WEBHOOK'
}
```

### ❌ If Workflow is NOT Configured:
```
[N8N_WORKFLOW] Workflow configuration check: {
  workflowName: 'trend-deep-dive',
  isConfigured: false,
  webhookUrl: 'NOT SET',
  envVar: 'VITE_N8N_TREND_DEEP_DIVE_WEBHOOK'
}
```

**If you see `isConfigured: false` or `webhookUrl: 'NOT SET'`:**
→ You need to set the environment variable (see Step 2)

## Step 2: Set Environment Variable

### For Local Development:

1. Check if `.env.local` exists in your project root
2. If not, create it:
   ```bash
   touch .env.local
   ```
3. Add this line:
   ```bash
   VITE_N8N_TREND_DEEP_DIVE_WEBHOOK=https://your-n8n-instance.app/webhook/trend-deep-dive
   ```
4. Replace `https://your-n8n-instance.app/webhook/trend-deep-dive` with your actual n8n webhook URL
5. **Restart your dev server** (important!)

### For Production (Vercel):

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Key:** `VITE_N8N_TREND_DEEP_DIVE_WEBHOOK`
   - **Value:** Your n8n webhook URL
   - **Environment:** Select all (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application

## Step 3: Verify n8n Workflow

1. Log into your n8n instance
2. Find the "Trend Deep Dive" workflow
3. Check that:
   - ✅ Workflow is **Active** (toggle in top right)
   - ✅ Webhook path matches your environment variable path
   - ✅ Webhook is set to **POST** method
   - ✅ Response mode is "When Last Node Finishes"

## Step 4: Test the Workflow

### Test in n8n:
1. Click "Execute Workflow" in n8n
2. Use test data:
   ```json
   {
     "userId": "test",
     "trend": "fitness trends",
     "niche": "health",
     "platforms": ["Instagram"],
     "brandData": {},
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```
3. Check that it returns:
   ```json
   {
     "analysis": "Some analysis text...",
     "contentIdeas": ["Idea 1", "Idea 2"],
     "competitorInsights": [],
     "citations": []
   }
   ```

### Test in Browser:
1. Open browser console (F12)
2. Try Deep Dive in the app
3. Check for:
   - `[N8N_WORKFLOW] Calling Trend Deep Dive webhook` - Shows the request
   - `[N8N_WORKFLOW] Trend Deep Dive response received` - Shows the response
   - Any error messages

## Common Issues & Solutions

### Issue: "Workflow not configured"
**Check:**
- [ ] Environment variable is set
- [ ] Variable name is exactly: `VITE_N8N_TREND_DEEP_DIVE_WEBHOOK`
- [ ] Dev server was restarted after adding variable
- [ ] For production: Variable is set in Vercel and app is redeployed

### Issue: "404 Not Found"
**Check:**
- [ ] n8n workflow is activated
- [ ] Webhook path in n8n matches the URL in environment variable
- [ ] Full URL includes `https://` and domain

### Issue: "No analysis text displayed"
**Check:**
- [ ] n8n workflow returns `analysis` field (or `output`/`report`)
- [ ] The field contains actual text (not empty)
- [ ] Check browser console for response structure

### Issue: "Only source links, no content"
**Check:**
- [ ] Workflow is generating `analysis` text
- [ ] Response includes `analysis` field, not just `citations`
- [ ] Check n8n workflow execution logs

## Still Not Working?

1. **Check browser console** for detailed error messages
2. **Check n8n execution logs** for workflow errors
3. **Verify environment variable** is loaded:
   - In browser console, run: `console.log(import.meta.env.VITE_N8N_TREND_DEEP_DIVE_WEBHOOK)`
   - Should show your webhook URL (not undefined)

## Quick Test Command

Run this in browser console to test the workflow directly:

```javascript
fetch(import.meta.env.VITE_N8N_TREND_DEEP_DIVE_WEBHOOK, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'test',
    trend: 'test trend',
    niche: 'test niche',
    platforms: ['Instagram'],
    brandData: {},
    timestamp: new Date().toISOString()
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

This will show you the raw response from your n8n workflow.






