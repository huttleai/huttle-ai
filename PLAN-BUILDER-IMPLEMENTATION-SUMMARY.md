# AI Plan Builder - Async Job Implementation Summary

## ✅ Completed Implementation

All code changes have been implemented. The AI Plan Builder now uses an asynchronous job pattern orchestrated by n8n.

### Files Created

1. **`docs/setup/supabase-jobs-schema.sql`**
   - Database schema for `jobs` and `job_notifications` tables
   - RLS policies for secure access
   - Indexes for performance

2. **`api/create-plan-builder-job.js`**
   - Vercel serverless function
   - Validates auth and subscription
   - Checks AI usage limits
   - Creates job record
   - Triggers n8n webhook

3. **`api/get-job-status.js`**
   - Vercel serverless function
   - Polls job status (fallback if Realtime fails)
   - Returns job data to frontend

4. **`src/services/planBuilderAPI.js`**
   - Frontend service for job management
   - `createPlanBuilderJob()` - Creates new jobs
   - `getJobStatus()` - Polls job status
   - `subscribeToJob()` - Realtime subscription

5. **`docs/setup/PLAN-BUILDER-ASYNC-SETUP.md`**
   - Complete setup guide
   - n8n workflow instructions
   - Troubleshooting tips

### Files Updated

1. **`src/pages/AIPlanBuilder.jsx`**
   - Now uses async job pattern
   - Shows loading state with progress bar
   - Subscribes to job updates via Realtime
   - Falls back to polling if Realtime fails
   - Integrates with BrandContext for niche/brand voice

2. **`src/config/supabase.js`**
   - Added `JOBS` and `JOB_NOTIFICATIONS` to TABLES constant

## 🔧 Manual Steps Required

### 1. Run Database Schema ⚠️ REQUIRED

**Action**: Execute the SQL file in Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `docs/setup/supabase-jobs-schema.sql`
3. Paste and run in SQL Editor
4. Verify tables `jobs` and `job_notifications` were created

### 2. Enable Supabase Realtime ⚠️ REQUIRED

**Action**: Enable replication for `jobs` table

1. Go to Supabase Dashboard → Database → Replication
2. Find `jobs` table
3. Toggle replication ON
4. This enables real-time updates to the frontend

### 3. Set Environment Variables ⚠️ REQUIRED

**Action**: Add these to `.env` and Vercel environment variables

```bash
# Backend service role key (get from Supabase Dashboard → Settings → API)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# n8n webhook URL (create workflow first, then update)
N8N_PLAN_BUILDER_WEBHOOK_URL=https://your-n8n-instance.com/webhook/plan-builder
```

**Note**: `SUPABASE_SERVICE_ROLE_KEY` is secret - only use in backend API routes, never expose to frontend.

### 4. Create n8n Workflow ⚠️ REQUIRED

**Action**: Build the n8n workflow as described in `docs/setup/PLAN-BUILDER-ASYNC-SETUP.md`

**Quick Summary**:
- Webhook trigger receives job creation
- Fetch job and user data from Supabase
- Call Grok 4.1 API for content calendar
- Call Perplexity API for trends (optional)
- Combine results into structured plan
- Update job status to "completed" with result
- Handle errors gracefully

**See**: `docs/setup/PLAN-BUILDER-ASYNC-SETUP.md` for detailed node-by-node instructions.

### 5. Test End-to-End Flow ⚠️ RECOMMENDED

**Action**: Verify everything works

1. Navigate to `/ai-plan-builder` in your app
2. Select goal, period, platforms
3. Click "Generate AI Plan"
4. Verify:
   - Job created in Supabase `jobs` table (status: "queued")
   - n8n workflow executes
   - Job status updates to "running" then "completed"
   - Plan appears in UI
   - Error handling works (test by breaking n8n webhook)

## 📋 Architecture Overview

```
Frontend (AIPlanBuilder.jsx)
    ↓
    Calls createPlanBuilderJob()
    ↓
Backend API (create-plan-builder-job.js)
    ↓
    Validates auth & usage limits
    Creates job in Supabase (status: "queued")
    Triggers n8n webhook
    Returns jobId immediately
    ↓
n8n Workflow
    ↓
    Fetches job & user data
    Calls Grok 4.1 API
    Calls Perplexity API (optional)
    Structures plan data
    Updates job (status: "completed", result: plan)
    ↓
Frontend (via Realtime subscription or polling)
    ↓
    Receives job update
    Displays plan in UI
```

## 🎯 Key Features

- ✅ **Non-blocking**: Frontend returns immediately with jobId
- ✅ **Real-time updates**: Supabase Realtime subscriptions
- ✅ **Polling fallback**: If Realtime fails, polls every 3 seconds
- ✅ **Usage tracking**: Checks limits before creating job
- ✅ **Error handling**: Failed jobs show error messages
- ✅ **Progress indication**: Loading state with progress bar

## 🔍 Verification Checklist

After completing manual steps, verify:

- [ ] `jobs` table exists in Supabase
- [ ] `job_notifications` table exists (optional)
- [ ] Realtime enabled for `jobs` table
- [ ] Environment variables set in `.env` and Vercel
- [ ] n8n workflow created and active
- [ ] n8n webhook URL matches environment variable
- [ ] Test job creation works
- [ ] Test job completion works
- [ ] Test error handling works

## 📚 Documentation

- **Setup Guide**: `docs/setup/PLAN-BUILDER-ASYNC-SETUP.md`
- **Database Schema**: `docs/setup/supabase-jobs-schema.sql`
- **API Routes**: `api/create-plan-builder-job.js`, `api/get-job-status.js`
- **Frontend Service**: `src/services/planBuilderAPI.js`

## 🆘 Need Help?

If you encounter issues:

1. Check `docs/setup/PLAN-BUILDER-ASYNC-SETUP.md` troubleshooting section
2. Verify all manual steps are completed
3. Check Supabase logs for RLS policy issues
4. Check n8n execution logs for workflow errors
5. Check browser console for frontend errors

---

**Status**: ✅ Code implementation complete. Manual setup required.











