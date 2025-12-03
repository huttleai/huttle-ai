# Manual Setup Checklist for n8n Workflows

This checklist outlines the manual steps you need to complete to finish the social media analytics integration.

## ✅ Completed (Automated)

The following have been set up automatically in your codebase:

- ✅ Supabase database schemas created
  - `social_analytics` table for post-level metrics
  - `analytics_snapshots` table for aggregated data
  - `ai_insights` table for AI-generated insights
  - `content_gaps` table for content analysis
  - Updated `social_connections` table with analytics fields

- ✅ Vercel API endpoints created
  - `/api/fetch-analytics.js` - Trigger analytics fetch
  - `/api/get-analytics.js` - Retrieve stored analytics
  - `/api/generate-insights.js` - Generate AI insights

- ✅ Frontend integration complete
  - `src/services/analyticsAPI.js` - Analytics service layer
  - `src/pages/Analytics.jsx` - Real data integration
  - `src/pages/Dashboard.jsx` - Insights and content gaps
  - Daily Alerts feature implemented

---

## ⚠️ Manual Steps Required

The following steps require your manual intervention:

### 1. Supabase Setup (30 minutes)

**Required Actions:**
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Run these SQL schema files in order:
   - `docs/setup/supabase-n8n-connections-schema.sql`
   - `docs/setup/supabase-social-analytics-schema.sql`
4. Verify tables were created successfully

**How to verify:**
```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('social_connections', 'social_analytics', 'analytics_snapshots', 'ai_insights', 'content_gaps');
```

---

### 2. Platform Developer Accounts (1-2 hours)

You need to set up developer accounts for each social media platform:

#### Instagram & Facebook (Meta)
**URL:** https://developers.facebook.com

**Steps:**
1. Create a Meta Developer account
2. Click "Create App" → Choose "Business" type
3. Enable these APIs:
   - Instagram Basic Display API
   - Instagram Graph API
   - Facebook Pages API
4. Get your credentials:
   - App ID: `____________`
   - App Secret: `____________`
5. Add OAuth redirect URI: `https://your-n8n-instance/rest/oauth2-credential/callback`

**Permissions needed:**
- `instagram_basic`
- `instagram_manage_insights`
- `pages_read_engagement`
- `pages_show_list`

#### Twitter/X
**URL:** https://developer.twitter.com

**Steps:**
1. Apply for Developer Account (may take 1-2 days for approval)
2. Create a Project and App
3. Enable OAuth 2.0
4. Get your credentials:
   - API Key: `____________`
   - API Secret: `____________`
   - Bearer Token: `____________`
5. Add OAuth redirect URI

**Note:** Analytics require Elevated Access ($100/month) or Academic Research (free, approval required)

#### TikTok
**URL:** https://developers.tiktok.com

**Steps:**
1. Apply for TikTok for Business Developer access
2. Wait for approval (1-3 days)
3. Create an app
4. Enable permissions:
   - Video posting
   - Analytics access
5. Get credentials:
   - Client Key: `____________`
   - Client Secret: `____________`

#### YouTube
**URL:** https://console.cloud.google.com

**Steps:**
1. Create a Google Cloud Project
2. Enable these APIs:
   - YouTube Data API v3
   - YouTube Analytics API
3. Create OAuth 2.0 Credentials
4. Get credentials:
   - Client ID: `____________`
   - Client Secret: `____________`
5. Add authorized redirect URIs

---

### 3. n8n Setup (1-2 hours)

**Option A: n8n Cloud (Recommended for beginners)**
- Sign up at: https://n8n.io/cloud
- Cost: $20/month
- Benefits: Fully managed, automatic updates

**Option B: Self-hosted (Free)**
```bash
# Using Docker
docker run -d --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Access at: http://localhost:5678
```

**Configure Environment Variables in n8n:**

Go to Settings → Environment Variables and add:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Platform Credentials (from step 2 above)
INSTAGRAM_CLIENT_ID=your-instagram-app-id
INSTAGRAM_CLIENT_SECRET=your-instagram-app-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
TIKTOK_CLIENT_KEY=your-tiktok-client-key
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret
YOUTUBE_CLIENT_ID=your-youtube-client-id
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret

# Optional
GROK_API_KEY=your-grok-api-key
```

---

### 4. Create n8n Workflows (2-3 hours)

Follow the detailed guides in `docs/n8n/N8N-WORKFLOW-GUIDES.md` to create:

**Workflow 1: OAuth Connection Enhancement**
- ⬜ Created workflow
- ⬜ Configured platform OAuth nodes
- ⬜ Tested with at least one platform
- ⬜ Activated workflow
- Webhook URL: `____________`

**Workflow 2: Fetch Analytics from Platforms**
- ⬜ Created workflow
- ⬜ Configured all 5 platforms
- ⬜ Tested data fetching
- ⬜ Verified data stored in Supabase
- ⬜ Activated workflow
- Webhook URL: `____________`

**Workflow 3: Daily Analytics Sync**
- ⬜ Created workflow
- ⬜ Set cron schedule (2:00 AM daily)
- ⬜ Tested manually
- ⬜ Activated workflow

**Workflow 4: Generate AI Insights**
- ⬜ Created workflow
- ⬜ Configured Grok API (optional)
- ⬜ Tested insight generation
- ⬜ Verified insights stored in database
- ⬜ Activated workflow
- Webhook URL: `____________`

---

### 5. Update Environment Variables (5 minutes)

Update your app's `.env` file with n8n webhook URLs:

```env
# Add these to your existing .env file:
VITE_N8N_CONNECTION_WEBHOOK_URL=https://your-n8n-instance/webhook/social-connect
N8N_ANALYTICS_WEBHOOK_URL=https://your-n8n-instance/webhook/fetch-analytics
N8N_INSIGHTS_WEBHOOK_URL=https://your-n8n-instance/webhook/generate-insights

# Existing variables
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=https://your-app.vercel.app/api
```

---

### 6. Deploy to Vercel (15 minutes)

**If not already deployed:**

1. Push code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Add environment variables (same as `.env` file)
5. Deploy

**Update existing deployment:**

```bash
# Commit changes
git add .
git commit -m "Add social media analytics integration"
git push origin main

# Vercel will auto-deploy
# Or manually: vercel --prod
```

---

### 7. Testing (30 minutes)

**Test Connection Flow:**
1. Go to Settings page in your app
2. Click "Connect" on a platform (start with one)
3. Complete OAuth flow
4. Verify connection shows as "Connected"
5. Check Supabase `social_connections` table

**Test Analytics Fetch:**
1. Go to Analytics page
2. Click "Refresh" button
3. Wait 1-2 minutes
4. Check Supabase `social_analytics` table for new data
5. Verify Analytics page displays real data

**Test Insights Generation:**
1. Wait for daily sync to run OR
2. Manually trigger via n8n workflow
3. Check Dashboard for AI-Powered Insights
4. Verify Content Gap Analysis shows real gaps

**Test Daily Alerts:**
1. Check Dashboard "Daily Alerts" section
2. Verify alerts are based on real metrics
3. Test alert actions

---

## Troubleshooting Guide

### Issue: OAuth connection fails

**Solution:**
- Verify redirect URIs match exactly in platform developer console
- Check OAuth credentials are correct in n8n
- Ensure required permissions/scopes are enabled

### Issue: Analytics not fetching

**Solution:**
- Check n8n workflow is activated
- Verify `N8N_ANALYTICS_WEBHOOK_URL` is correct in `.env`
- Check n8n execution logs for errors
- Verify platform API credentials are valid

### Issue: Data not showing in app

**Solution:**
- Check Supabase tables have data: `SELECT * FROM social_analytics LIMIT 10;`
- Verify RLS policies allow authenticated users to read
- Check browser console for API errors
- Ensure user is logged in

### Issue: Rate limiting errors

**Solution:**
- Add Wait nodes between API calls in n8n
- Reduce frequency of daily sync
- Implement caching in API endpoints

---

## Success Criteria

You'll know everything is working when:

- ✅ You can connect at least one social media account
- ✅ Connection status shows correctly in Settings
- ✅ Analytics page displays real metrics (not mock data)
- ✅ Dashboard shows AI-generated insights
- ✅ Content Gap Analysis identifies real gaps
- ✅ Daily Alerts reflect actual performance
- ✅ Data updates daily automatically

---

## Estimated Time Commitment

- **First-time setup:** 5-7 hours
- **Subsequent platforms:** 30-45 minutes each
- **Ongoing maintenance:** ~1 hour/month

---

## Support Resources

**n8n Documentation:**
- https://docs.n8n.io

**Platform API Docs:**
- Instagram: https://developers.facebook.com/docs/instagram-api
- Facebook: https://developers.facebook.com/docs/graph-api
- Twitter: https://developer.twitter.com/en/docs/twitter-api
- TikTok: https://developers.tiktok.com/doc/overview
- YouTube: https://developers.google.com/youtube/v3

**Supabase Docs:**
- https://supabase.com/docs

**Vercel Docs:**
- https://vercel.com/docs

---

## Next Steps After Setup

Once everything is working:

1. Monitor n8n execution logs for the first week
2. Adjust rate limits if needed
3. Add more platforms as you get comfortable
4. Customize insights based on your needs
5. Set up alerts for critical thresholds
6. Consider adding more advanced analytics features

---

**Need Help?**

Refer to the detailed guides:
- `docs/n8n/N8N-WORKFLOW-GUIDES.md` - Step-by-step workflow creation
- `docs/guides/N8N-INTEGRATION-GUIDE.md` - Complete integration guide
- `docs/setup/SOCIAL-UPDATES-SETUP.md` - Additional setup information

