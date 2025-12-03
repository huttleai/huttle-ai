# AI Plan Builder - Async Job Architecture Setup Guide

This guide walks you through setting up the asynchronous job pattern for the AI Plan Builder feature.

## ✅ What's Already Done

The following files have been created/updated:

1. **Database Schema**: `docs/setup/supabase-jobs-schema.sql`
2. **Backend API Routes**:
   - `api/create-plan-builder-job.js` - Creates jobs and triggers n8n
   - `api/get-job-status.js` - Polls job status (fallback)
3. **Frontend Service**: `src/services/planBuilderAPI.js`
4. **Updated Component**: `src/pages/AIPlanBuilder.jsx` - Now uses async job pattern
5. **Config Update**: `src/config/supabase.js` - Added JOBS table reference

## 🔧 Manual Setup Steps

### Step 1: Run Database Schema in Supabase

1. Go to your Supabase Dashboard → SQL Editor
2. Open and run the file: `docs/setup/supabase-jobs-schema.sql`
3. Verify the tables were created:
   - `jobs` table
   - `job_notifications` table (optional)
4. Verify RLS policies are active:
   - Users can view/create their own jobs
   - Users can view/update their own notifications

### Step 2: Enable Supabase Realtime

1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for the `jobs` table
3. This allows the frontend to subscribe to job status updates in real-time

### Step 3: Set Environment Variables

Add these to your `.env` file (and Vercel environment variables):

```bash
# Existing Supabase variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# NEW: Backend service role key (for API routes)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NEW: n8n webhook URL for Plan Builder
N8N_PLAN_BUILDER_WEBHOOK_URL=https://your-n8n-instance.com/webhook/plan-builder

# Optional: API base URL (defaults to /api)
VITE_API_URL=https://your-domain.vercel.app/api
```

**Important**: 
- `SUPABASE_SERVICE_ROLE_KEY` should be kept secret (only used in backend API routes)
- Get it from Supabase Dashboard → Settings → API → Service Role Key

### Step 4: Create n8n Workflow

Create a new n8n workflow with the following structure:

#### Workflow Trigger: Webhook
- **Method**: POST
- **Path**: `/webhook/plan-builder` (or your custom path)
- **Response Mode**: Respond When Last Node Finishes

#### Node 1: Fetch Job from Supabase
- **Type**: Supabase
- **Operation**: Get
- **Table**: `jobs`
- **Filter**: `id = {{ $json.body.job_id }}`
- **Use Service Role Key**: Yes (to bypass RLS)

#### Node 2: Fetch User Profile & Brand Voice
- **Type**: Supabase
- **Operation**: Get
- **Table**: `user_profile`
- **Filter**: `user_id = {{ $json.user_id }}`
- **Use Service Role Key**: Yes

#### Node 3: Update Job Status to "running"
- **Type**: Supabase
- **Operation**: Update
- **Table**: `jobs`
- **Filter**: `id = {{ $json.body.job_id }}`
- **Data**: `{ "status": "running", "started_at": "{{ $now }}" }`
- **Use Service Role Key**: Yes

#### Node 4: Call Grok 4.1 API
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://api.x.ai/v1/chat/completions`
- **Headers**: 
  - `Authorization: Bearer YOUR_GROK_API_KEY`
  - `Content-Type: application/json`
- **Body**: Generate 7-14 day content calendar skeleton
- **Model**: `grok-4-1-fast-reasoning`

Example prompt structure:
```json
{
  "model": "grok-4-1-fast-reasoning",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert content strategist..."
    },
    {
      "role": "user",
      "content": "Generate a {{ $json.input.period }} content calendar for {{ $json.input.platforms.join(', ') }} with goal: {{ $json.input.goal }}. Niche: {{ $json.input.niche }}. Brand voice: {{ $json.user_profile.brand_voice_preference }}"
    }
  ],
  "temperature": 0.7
}
```

#### Node 5: Call Perplexity API (Optional but Recommended)
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://api.perplexity.ai/chat/completions`
- **Headers**:
  - `Authorization: Bearer YOUR_PERPLEXITY_API_KEY`
  - `Content-Type: application/json`
- **Body**: Get trend/competitor context for the niche

#### Node 6: Combine & Structure Plan Data
- **Type**: Code/Function
- **Language**: JavaScript
- **Code**: Combine Grok output + Perplexity insights into structured JSON

Expected output structure:
```json
{
  "goal": "Grow followers",
  "period": "7 days",
  "platforms": ["Instagram", "TikTok"],
  "totalPosts": 14,
  "contentMix": {
    "educational": 60,
    "entertaining": 30,
    "promotional": 10
  },
  "schedule": [
    {
      "day": 1,
      "date": "2024-01-15",
      "posts": [
        {
          "time": "09:00",
          "type": "Educational Post",
          "theme": "Industry Tips",
          "platform": "Instagram",
          "suggestedCaption": "...",
          "suggestedHashtags": ["..."],
          "angle": "..."
        }
      ]
    }
  ]
}
```

#### Node 7: Update Job Status to "completed"
- **Type**: Supabase
- **Operation**: Update
- **Table**: `jobs`
- **Filter**: `id = {{ $json.body.job_id }}`
- **Data**: 
```json
{
  "status": "completed",
  "completed_at": "{{ $now }}",
  "result": "{{ $json.structuredPlan }}"
}
```
- **Use Service Role Key**: Yes

#### Node 8: Error Handling (Catch Node)
- **Type**: Supabase
- **Operation**: Update
- **Table**: `jobs`
- **Filter**: `id = {{ $json.body.job_id }}`
- **Data**:
```json
{
  "status": "failed",
  "completed_at": "{{ $now }}",
  "error": "{{ $json.error.message }}"
}
```
- **Use Service Role Key**: Yes

### Step 5: Test the Flow

1. **Test Job Creation**:
   - Navigate to `/ai-plan-builder` in your app
   - Select goal, period, and platforms
   - Click "Generate AI Plan"
   - Verify a job is created in Supabase `jobs` table with status "queued"

2. **Test n8n Webhook**:
   - Check n8n workflow execution logs
   - Verify job status updates to "running" then "completed"
   - Verify `result` JSON contains the plan data

3. **Test Frontend Updates**:
   - Verify the UI shows loading state with progress bar
   - Verify plan appears when job completes
   - Test error handling (temporarily break n8n webhook)

### Step 6: Monitor & Debug

**Supabase Dashboard**:
- Check `jobs` table for job statuses
- Monitor `user_activity` table for usage tracking
- Check RLS policies are working correctly

**n8n Dashboard**:
- Monitor workflow executions
- Check for errors in node execution
- Verify API calls to Grok/Perplexity are successful

**Frontend Console**:
- Check for API errors
- Verify Realtime subscriptions are working
- Check polling fallback if Realtime fails

## 🔍 Troubleshooting

### Jobs stuck in "queued" status
- Check n8n webhook URL is correct
- Verify n8n workflow is active and receiving webhooks
- Check n8n execution logs for errors

### Frontend not updating
- Verify Supabase Realtime is enabled for `jobs` table
- Check browser console for subscription errors
- Verify polling fallback is working (check network tab)

### Usage limits not working
- Verify `user_activity` table has correct structure
- Check `feature` column matches 'aiPlanBuilder'
- Verify subscription tier lookup is working

### n8n can't update jobs
- Ensure n8n uses Supabase Service Role Key (not anon key)
- Verify RLS policy allows service role updates
- Check Supabase connection in n8n nodes

## 📝 Expected Plan Result Structure

The `result` JSON in the `jobs` table should match this structure:

```typescript
{
  goal: string;              // e.g., "Grow followers"
  period: string;            // e.g., "7 days"
  platforms: string[];       // e.g., ["Instagram", "TikTok"]
  totalPosts: number;        // e.g., 14
  contentMix: {
    educational: number;     // percentage
    entertaining: number;     // percentage
    promotional: number;     // percentage
  };
  schedule: Array<{
    day: number;             // 1-7 or 1-14
    date?: string;            // ISO date string (optional)
    posts: Array<{
      time: string;          // "09:00" format
      type: string;          // e.g., "Educational Post"
      theme: string;          // e.g., "Industry Tips"
      platform: string;       // e.g., "Instagram"
      suggestedCaption?: string;
      suggestedHashtags?: string[];
      angle?: string;
    }>;
  }>;
}
```

## 🚀 Next Steps

1. Run the database schema
2. Set environment variables
3. Create and test the n8n workflow
4. Test end-to-end flow
5. Monitor for any issues

Once everything is set up, the AI Plan Builder will work asynchronously, allowing users to continue using the app while their plans are generated in the background!

