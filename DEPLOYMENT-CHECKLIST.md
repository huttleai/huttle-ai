# Huttle AI - Deployment Checklist

## ✅ Pre-Deployment Verification

### Code Quality
- [x] ESLint passes with no errors
- [x] Build completes successfully (`npm run build`)
- [x] All routes are properly configured
- [x] All imports resolve correctly
- [x] No console errors in development mode

### Responsive Design
- [x] Mobile breakpoints tested (<768px)
- [x] Tablet breakpoints tested (768px-1023px)
- [x] Desktop breakpoints tested (≥1024px)
- [x] Touch targets are ≥44px
- [x] Modals work on all screen sizes
- [x] Forms are mobile-friendly
- [x] FloatingActionButton doesn't overlap content

### Professional Design
- [x] Consistent color scheme (huttle-primary #00bad3)
- [x] Consistent spacing using Tailwind scale
- [x] Loading states for all async operations
- [x] Error states are user-friendly
- [x] Typography hierarchy is consistent
- [x] Icons properly sized and aligned

## 🚀 Vercel Deployment Steps

### 1. Environment Variables Setup

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

#### Frontend Environment Variables (VITE_*)
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# n8n Webhooks
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.app/webhook/post-to-social
VITE_N8N_CONNECTION_WEBHOOK_URL=https://your-n8n-instance.app/webhook/check-connections
VITE_N8N_GENERATOR_WEBHOOK_URL=https://your-n8n-instance.app/webhook/ai-generator

# API Base URL (will be your Vercel URL)
VITE_API_BASE_URL=https://your-app.vercel.app/api

# AI APIs
VITE_GROK_API_KEY=your_grok_api_key_here
VITE_PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PRICE_ESSENTIALS=price_...
VITE_STRIPE_PRICE_PRO=price_...
```

#### Serverless Function Environment Variables (No VITE_ prefix)
```bash
# Supabase (Service Role Key for serverless functions)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# n8n Webhooks (for serverless functions)
N8N_WEBHOOK_URL=https://your-n8n-instance.app/webhook/post-to-social
N8N_CONNECTION_WEBHOOK_URL=https://your-n8n-instance.app/webhook/check-connections
N8N_WEBHOOK_URL_GENERATOR=https://your-n8n-instance.app/webhook/ai-generator

# Perplexity API (for social updates cron)
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

### 2. Deploy to Vercel

#### Option A: GitHub Integration (Recommended)
1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Vercel will auto-detect the Vite configuration
5. Add environment variables
6. Click "Deploy"

#### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Or deploy to production directly
vercel --prod
```

### 3. Post-Deployment Verification

After deployment, test these endpoints:

#### Frontend
- [ ] https://your-app.vercel.app/ (Main app loads)
- [ ] https://your-app.vercel.app/login (Login page)
- [ ] https://your-app.vercel.app/analytics (Analytics page)
- [ ] All navigation links work
- [ ] Supabase connection works

#### API Endpoints
Test with curl or Postman:

```bash
# Check connection status
curl -X POST https://your-app.vercel.app/api/check-connection-status \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'

# Update connection
curl -X POST https://your-app.vercel.app/api/update-connection \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "platform": "instagram",
    "action": "connect",
    "username": "testuser"
  }'

# Post to social (manual test - won't actually post without n8n)
curl -X POST https://your-app.vercel.app/api/post-to-social \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "postData": {
      "title": "Test Post",
      "caption": "Testing API",
      "platforms": ["instagram"]
    }
  }'
```

### 4. Verify Cron Job

Vercel cron jobs require a Pro plan. The biweekly social updates job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/update-social-media",
      "schedule": "0 0 */14 * *"
    }
  ]
}
```

**Note:** If on Vercel Free tier, you'll need to:
- Upgrade to Vercel Pro, OR
- Use an external cron service (cron-job.org, EasyCron), OR
- Trigger the endpoint manually every 2 weeks

Test cron endpoint manually:
```bash
curl https://your-app.vercel.app/api/update-social-media
```

## 🔗 n8n Integration Setup

### Prerequisites
- [ ] Vercel deployment complete (need production URLs)
- [ ] Supabase tables created (`supabase-n8n-connections-schema.sql`)
- [ ] n8n instance running (self-hosted or cloud)

### Steps

1. **Update Environment Variables in Vercel**
   - Add your n8n webhook URLs to Vercel environment variables
   - Redeploy after adding variables

2. **Create n8n Workflows**
   Follow the guide: `docs/guides/N8N-INTEGRATION-GUIDE.md`
   
   Required workflows:
   - Post to Social (handles multi-platform posting)
   - Check Connection Status (verifies OAuth credentials)

3. **Configure Webhooks in n8n**
   - Set webhook paths to match your configuration
   - Test webhook responses
   - Verify OAuth credentials work

4. **Test Integration**
   - Connect a platform in Settings page
   - Create a post and schedule it
   - Verify n8n workflow executes
   - Check Supabase `n8n_post_queue` table

### n8n Workflow URLs
After creating workflows, update these environment variables:
```bash
VITE_N8N_WEBHOOK_URL=https://your-n8n.app/webhook/post-to-social
VITE_N8N_CONNECTION_WEBHOOK_URL=https://your-n8n.app/webhook/check-connections
N8N_WEBHOOK_URL=https://your-n8n.app/webhook/post-to-social
N8N_CONNECTION_WEBHOOK_URL=https://your-n8n.app/webhook/check-connections
```

## 📊 Analytics Page

- [x] Analytics page created (`src/pages/Analytics.jsx`)
- [x] Route added to App.jsx
- [x] Navigation link added to Sidebar
- [x] Mobile responsive design
- [x] CSS-based charts (no external chart library needed)
- [x] Mock data with real post integration

The Analytics page will display:
- Total posts, views, engagement
- Engagement trend over time
- Platform breakdown
- Top performing posts
- AI usage statistics
- Insights and recommendations

## 🗄️ Database Setup

### Supabase Tables Required

Run these SQL files in Supabase SQL Editor:

1. **n8n Integration Tables**
   ```sql
   -- Run: supabase-n8n-connections-schema.sql
   ```
   Creates:
   - `social_connections` (tracks OAuth connections)
   - `n8n_post_queue` (queues posts for n8n)

2. **Social Updates Table**
   ```sql
   -- Run: docs/setup/supabase-social-updates-schema.sql
   ```
   Creates:
   - `social_updates` (stores platform update data)

3. **Content Library Tables** (if not already created)
   ```sql
   -- Run: docs/setup/supabase-content-library-schema.sql
   ```

4. **Scheduled Posts Table** (if not already created)
   ```sql
   -- Run: docs/setup/supabase-scheduled-posts-schema.sql
   ```

### Verify Tables Exist
In Supabase Dashboard → Table Editor, verify:
- [ ] `social_connections`
- [ ] `n8n_post_queue`
- [ ] `social_updates`
- [ ] `content_library_items`
- [ ] `scheduled_posts`
- [ ] `projects`
- [ ] `user_profiles`

## 🧪 Testing Checklist

### Functionality Tests
- [ ] User can sign up / log in
- [ ] All navigation links work
- [ ] Dashboard displays correctly
- [ ] Analytics page shows data
- [ ] Content Library loads
- [ ] Smart Calendar works
- [ ] AI Plan Builder generates content
- [ ] TrendLab features work
- [ ] Settings page loads
- [ ] Social Updates page displays updates

### Integration Tests
- [ ] Supabase connection works
- [ ] API endpoints respond correctly
- [ ] n8n webhooks (if configured)
- [ ] Image upload works
- [ ] Post scheduling works
- [ ] AI generation works (with API keys)

### Cross-Browser Tests
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (desktop)
- [ ] iOS Safari
- [ ] Android Chrome

### Performance
- [x] Build size: ~827 KB (acceptable)
- [ ] First load under 3 seconds
- [ ] Images optimized
- [ ] No memory leaks

## 📝 Post-Deployment Tasks

### 1. Update Your .env File Locally
After deployment, update your local `.env` with production URLs:
```bash
VITE_API_BASE_URL=https://your-app.vercel.app/api
```

### 2. Test Production Build Locally
```bash
npm run build
npm run preview
```

### 3. Monitor Deployment
- Vercel Dashboard → Functions → View logs
- Check for errors in function executions
- Monitor Supabase usage

### 4. Set Up Error Monitoring (Optional)
Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for usage tracking

## 🚨 Troubleshooting

### Build Fails
- Check all imports are correct
- Verify no TypeScript errors
- Run `npm run build` locally first

### Environment Variables Not Loading
- Ensure VITE_ prefix for frontend variables
- Redeploy after adding variables
- Check variable names match exactly

### API Endpoints Return 500
- Check Supabase credentials
- Verify SUPABASE_SERVICE_ROLE_KEY is set
- Check function logs in Vercel dashboard

### n8n Integration Not Working
- Verify webhook URLs are correct
- Check n8n workflows are activated
- Test webhooks manually with curl
- Check CORS settings if needed

### Cron Job Not Running
- Verify Vercel Pro plan (crons require Pro)
- Check cron syntax in vercel.json
- View execution logs in Vercel dashboard

## 🎉 Success Criteria

Your deployment is successful when:

1. ✅ App loads at your Vercel URL
2. ✅ All pages are accessible
3. ✅ User can sign up / log in
4. ✅ API endpoints respond correctly
5. ✅ Database operations work
6. ✅ Mobile experience is smooth
7. ✅ No console errors in production
8. ✅ n8n integration works (if configured)
9. ✅ Analytics page displays data
10. ✅ Build completes without warnings

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [n8n Documentation](https://docs.n8n.io)
- [Vite Documentation](https://vitejs.dev)
- [Project README](./README.md)
- [N8N Integration Guide](./docs/guides/N8N-INTEGRATION-GUIDE.md)

## 🔐 Security Notes

- Never commit `.env` files to git
- Use SUPABASE_SERVICE_ROLE_KEY only in serverless functions
- Keep n8n webhook URLs private
- Rotate API keys regularly
- Enable RLS (Row Level Security) in Supabase
- Use HTTPS for all endpoints

---

**Last Updated:** November 5, 2025
**App Version:** 1.0.0
**Deployment Status:** Ready for Production

