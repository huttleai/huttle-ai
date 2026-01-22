# n8n Workflow Setup Guide for Trend Deep Dive

## Quick Diagnosis

If the Deep Dive feature isn't working, check the browser console (F12) for these log messages:

### 1. Check if Workflow is Configured

Look for this log:
```
[N8N_WORKFLOW] Workflow configuration check: {
  workflowName: 'trend-deep-dive',
  isConfigured: true/false,
  webhookUrl: '...' or 'NOT SET',
  envVar: 'VITE_N8N_TREND_DEEP_DIVE_WEBHOOK'
}
```

**If `isConfigured: false` or `webhookUrl: 'NOT SET'`:**
- The environment variable is not set
- See "Environment Variable Setup" below

### 2. Check Workflow Call

Look for this log:
```
[N8N_WORKFLOW] Calling Trend Deep Dive webhook: {
  url: '...',
  method: 'POST',
  hasAuth: true/false,
  userId: '...',
  requestBody: {...}
}
```

**If you see this but no response:**
- The workflow URL might be incorrect
- The workflow might not be active in n8n
- Check n8n workflow execution logs

### 3. Check Response

Look for this log:
```
[N8N_WORKFLOW] Trend Deep Dive response received: {
  hasAnalysis: true/false,
  analysisLength: ...,
  contentIdeasCount: ...,
  ...
}
```

**If `hasAnalysis: false` or `analysisLength: 0`:**
- The workflow is running but not returning the expected data format
- See "Expected Response Format" below

## Environment Variable Setup

### For Local Development

1. Create or edit `.env.local` file in the project root:
```bash
VITE_N8N_TREND_DEEP_DIVE_WEBHOOK=https://your-n8n-instance.app/webhook/trend-deep-dive
```

2. Restart your dev server:
```bash
npm run dev
```

### For Production (Vercel)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables

2. Add:
   - **Name:** `VITE_N8N_TREND_DEEP_DIVE_WEBHOOK`
   - **Value:** `https://your-n8n-instance.app/webhook/trend-deep-dive`
   - **Environment:** Production, Preview, Development (select all)

3. Redeploy your application

## n8n Workflow Setup

### Step 1: Create the Workflow

1. Log into your n8n instance
2. Click "New Workflow"
3. Name it: "Trend Deep Dive"

### Step 2: Add Webhook Trigger

1. Add a **Webhook** node
2. Configure:
   - **HTTP Method:** POST
   - **Path:** `/webhook/trend-deep-dive` (or match your URL)
   - **Response Mode:** "When Last Node Finishes"
   - **Response Data:** "All Entries"

### Step 3: Add Processing Nodes

Your workflow should process the incoming data:

**Input Data Structure:**
```json
{
  "userId": "user-uuid",
  "trend": "fitness trends",
  "niche": "health and wellness",
  "platforms": ["Instagram", "TikTok", "X"],
  "brandData": {
    "brandVoice": "...",
    "targetAudience": "..."
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Step 4: Add AI/Research Nodes

Add nodes to:
1. Research the trend topic (using Perplexity, Google Search, etc.)
2. Analyze competitor content
3. Generate content ideas
4. Format the response

### Step 5: Format Response

The last node should return this structure:

```json
{
  "analysis": "Comprehensive textual analysis of the trend...",
  "contentIdeas": [
    "Idea 1: Create a video about...",
    "Idea 2: Post a carousel showing...",
    // or
    {
      "content": "Idea text...",
      "platform": "Instagram"
    }
  ],
  "competitorInsights": [
    "Competitor X is using...",
    "Trending approach: ..."
  ],
  "citations": [
    "https://source1.com",
    "https://source2.com"
  ],
  "metadata": {
    "processingTime": 45,
    "sourcesChecked": 10
  }
}
```

**Important Fields:**
- `analysis` - The main textual report (required for display)
- `contentIdeas` - Array of content ideas (required)
- `competitorInsights` - Array of insights (optional)
- `citations` - Array of source URLs (optional)

**Alternative Field Names (also supported):**
- `output` or `report` instead of `analysis`
- `ideas` instead of `contentIdeas`
- `insights` instead of `competitorInsights`
- `sources` instead of `citations`

### Step 6: Activate the Workflow

1. Click "Active" toggle in the top right
2. Copy the webhook URL
3. Use this URL in your environment variable

## Testing the Workflow

### Test in n8n

1. Click "Execute Workflow" button
2. Use this test payload:
```json
{
  "userId": "test-user",
  "trend": "AI content creation",
  "niche": "technology",
  "platforms": ["Instagram", "TikTok"],
  "brandData": {
    "brandVoice": "Professional and friendly",
    "targetAudience": "Small business owners"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

3. Check the output matches the expected format

### Test from Browser

1. Open browser console (F12)
2. Try Deep Dive in the app
3. Check console logs for:
   - Configuration status
   - Request details
   - Response details
   - Any errors

## Common Issues

### Issue: "Workflow not configured"
**Solution:** Set `VITE_N8N_TREND_DEEP_DIVE_WEBHOOK` environment variable

### Issue: "404 Not Found"
**Solution:** 
- Check webhook path matches n8n workflow path
- Ensure workflow is activated
- Verify the full URL is correct

### Issue: "500 Server Error"
**Solution:**
- Check n8n workflow execution logs
- Verify all nodes are configured correctly
- Check for API rate limits or errors

### Issue: "Timeout after 2 minutes"
**Solution:**
- Optimize workflow to run faster
- Consider breaking into smaller workflows
- Check for slow API calls in workflow

### Issue: "No analysis text displayed"
**Solution:**
- Ensure workflow returns `analysis` field (or `output`/`report`)
- Check that the field contains text, not empty string
- Verify response format matches expected structure

### Issue: "Only source links, no content"
**Solution:**
- The workflow is returning `citations` but not `analysis`
- Add a node to generate the textual analysis
- Ensure the analysis field is populated in the response

## Debugging Checklist

- [ ] Environment variable is set (`VITE_N8N_TREND_DEEP_DIVE_WEBHOOK`)
- [ ] Environment variable contains full URL (including `https://`)
- [ ] n8n workflow is created and activated
- [ ] Webhook path matches environment variable path
- [ ] Workflow returns expected JSON structure
- [ ] `analysis` field contains text (not empty)
- [ ] `contentIdeas` is an array with at least one item
- [ ] Browser console shows workflow is being called
- [ ] n8n execution logs show workflow is running
- [ ] No errors in n8n workflow execution

## Need Help?

Check these logs in browser console:
1. `[N8N_WORKFLOW] Workflow configuration check` - Shows if env var is set
2. `[N8N_WORKFLOW] Calling Trend Deep Dive webhook` - Shows the request
3. `[N8N_WORKFLOW] Trend Deep Dive response received` - Shows the response
4. `[N8N_WORKFLOW] getTrendDeepDive error` - Shows any errors

Also check n8n workflow execution history for detailed error messages.







