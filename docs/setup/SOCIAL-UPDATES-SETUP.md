# Social Updates - Centralized Biweekly Setup

## ✅ What Has Been Implemented

### 1. Frontend Changes
- ✅ Removed direct Perplexity API calls from `SocialUpdates.jsx`
- ✅ Now fetches from Supabase database instead
- ✅ Falls back to static data if Supabase is empty
- ✅ Filters to only show supported platforms (Facebook, Instagram, TikTok, X, YouTube)
- ✅ Excludes Threads and Snapchat
- ✅ Shows past 12 months of updates in descending order

### 2. Database Schema
- ✅ Created SQL schema file: `supabase-social-updates-schema.sql`
- ✅ Table: `social_updates` with proper structure
- ✅ RLS policies configured (public read, service role write)
- ✅ Indexes for performance

### 3. Serverless Function
- ✅ Created: `api/update-social-media.js` (Vercel serverless function)
- ✅ Fetches from Perplexity API
- ✅ Filters to only allowed platforms
- ✅ Stores in Supabase database
- ✅ Cleans up old entries (>12 months)

### 4. Vercel Configuration
- ✅ Created: `vercel.json` with biweekly cron schedule
- ✅ Scheduled to run every 14 days

## 📋 What You Need to Do Next

### Step 1: Run the SQL Schema in Supabase

1. Go to your Supabase Dashboard → SQL Editor
2. Open the file: `supabase-social-updates-schema.sql`
3. Copy and paste the entire SQL into the SQL Editor
4. Click "Run" to create the table and policies

### Step 2: Set Up Vercel (When Ready)

**Note:** Vercel cron jobs require a Pro plan ($20/month). If you don't have Pro, see alternatives below.

1. **Connect your repo to Vercel:**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Vercel will auto-detect the project

2. **Add Environment Variables in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add these three:
     ```
     PERPLEXITY_API_KEY=your_perplexity_key
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```
   - **Important:** Use the `service_role` key (not `anon` key) from Supabase Settings → API

3. **Deploy:**
   - Push your code to GitHub
   - Vercel will automatically deploy
   - The cron job will be active once deployed

4. **Test Manually:**
   - Visit: `https://your-app.vercel.app/api/update-social-media`
   - Should return success message
   - Check Supabase table to verify data was inserted

### Step 3: Verify It's Working

1. **Check Supabase:**
   - Go to Table Editor → `social_updates`
   - Should see entries after first run

2. **Check Frontend:**
   - Visit Social Updates page
   - Should fetch from Supabase (not calling Perplexity)
   - Console should show "Successfully fetched X updates from Supabase"

## 🔄 Alternative: If You Don't Have Vercel Pro

### Option A: GitHub Actions (Free)
Create `.github/workflows/update-social-media.yml`:

```yaml
name: Update Social Media
on:
  schedule:
    - cron: '0 0 */14 * *'  # Every 14 days
  workflow_dispatch:  # Allow manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: node scripts/update-social-media.js
        env:
          PERPLEXITY_API_KEY: ${{ secrets.PERPLEXITY_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

Then create `scripts/update-social-media.js` with the same logic from the serverless function.

### Option B: Third-Party Cron Service (Free/Paid)
- **cron-job.org** (free tier available)
- **EasyCron** (free tier available)
- Set up to call: `https://your-app.vercel.app/api/update-social-media`

### Option C: Supabase Edge Functions + PgCron
- Use Supabase Edge Functions with scheduled triggers
- More complex but free

## 📊 Cost Analysis

### Before (Current - WRONG):
- Every user visit = 1 Perplexity API call
- 1000 users/day = 1000 API calls
- Cost: ~$0.001 per call = $1/day = $30/month

### After (CORRECT):
- 1 Perplexity API call every 14 days (biweekly)
- Cost: ~$0.001 per call = $0.001/14 days = **~$0.02/month**

**Savings: 99.93% reduction in API costs!**

## 🧪 Testing Before Full Deployment

1. **Test the serverless function manually:**
   ```bash
   curl -X GET https://your-app.vercel.app/api/update-social-media
   ```

2. **Check Supabase table:**
   - Should see new entries
   - Verify platforms are correct
   - Check dates are recent

3. **Test frontend:**
   - Visit Social Updates page
   - Should see data from Supabase
   - Console should show Supabase fetch, not Perplexity

## ⚠️ Important Notes

1. **Never commit API keys** - They're in `.env` (already in `.gitignore`)

2. **Service Role Key is Secret** - Only use in serverless functions, never in frontend

3. **Initial Data Load** - Run the serverless function manually once to populate initial data

4. **Monitoring** - Set up alerts for:
   - Serverless function failures
   - Supabase connection issues
   - Missing updates (should have new data every 2 weeks)

## 📝 Files Created/Modified

### New Files:
- `supabase-social-updates-schema.sql` - Database schema
- `api/update-social-media.js` - Serverless function
- `vercel.json` - Vercel cron configuration
- `vercel-serverless-function.md` - Detailed setup guide
- `SOCIAL-UPDATES-SETUP.md` - This file

### Modified Files:
- `src/config/supabase.js` - Added `getSocialUpdates()` function
- `src/pages/SocialUpdates.jsx` - Changed to fetch from Supabase instead of Perplexity

### Next Steps Summary:
1. ✅ Run SQL schema in Supabase
2. ⏳ Deploy to Vercel (when ready)
3. ⏳ Add environment variables
4. ⏳ Test manually first
5. ⏳ Verify cron job runs every 14 days

