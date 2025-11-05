# Supabase & n8n Setup Guide

## 📦 Required Package Installation

```bash
npm install @supabase/supabase-js
```

If you encounter permission errors, run:
```bash
sudo chown -R $(whoami) "/Users/$(whoami)/.npm"
npm install @supabase/supabase-js
```

## 🔑 Environment Variables

Add these to your `.env` file:

```env
# AI APIs (Already configured)
VITE_PERPLEXITY_API_KEY=your_perplexity_key
VITE_GROK_API_KEY=your_grok_key

# Supabase Configuration (NEW)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# n8n Webhooks (Optional - for automation)
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
```

---

## 🗄️ Supabase Database Setup

### 1. Create a Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Copy your Project URL and Anon Key

### 2. Create Required Tables

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'essentials', 'pro')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated content table
CREATE TABLE public.generated_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('caption', 'hashtag', 'hook', 'cta', 'scored')),
  content TEXT NOT NULL,
  metadata JSONB,
  tool TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trend forecasts table
CREATE TABLE public.trend_forecasts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  niche TEXT NOT NULL,
  forecast_data JSONB NOT NULL,
  timeline JSONB,
  post_ideas TEXT[],
  citations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- User activity table (for usage tracking and burnout detection)
CREATE TABLE public.user_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled posts table
CREATE TABLE public.scheduled_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  platform TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('scheduled', 'published', 'failed', 'cancelled')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_content_user_id ON public.generated_content(user_id);
CREATE INDEX idx_content_type ON public.generated_content(type);
CREATE INDEX idx_forecasts_user_id ON public.trend_forecasts(user_id);
CREATE INDEX idx_forecasts_expires ON public.trend_forecasts(expires_at);
CREATE INDEX idx_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_activity_feature ON public.user_activity(feature);
CREATE INDEX idx_activity_created ON public.user_activity(created_at);
CREATE INDEX idx_posts_user_id ON public.scheduled_posts(user_id);
CREATE INDEX idx_posts_scheduled ON public.scheduled_posts(scheduled_for);
```

### 3. Set Up Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Content policies
CREATE POLICY "Users can manage own content" ON public.generated_content
  FOR ALL USING (auth.uid() = user_id);

-- Forecast policies
CREATE POLICY "Users can manage own forecasts" ON public.trend_forecasts
  FOR ALL USING (auth.uid() = user_id);

-- Activity policies
CREATE POLICY "Users can view own activity" ON public.user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can track activity" ON public.user_activity
  FOR INSERT WITH CHECK (true);

-- Scheduled posts policies
CREATE POLICY "Users can manage own posts" ON public.scheduled_posts
  FOR ALL USING (auth.uid() = user_id);
```

### 4. Insert Demo Data (Optional)

```sql
-- Create a demo free tier user (for testing without auth)
INSERT INTO public.users (id, email, full_name)
VALUES ('demo-user-123'::uuid, 'demo@huttle.ai', 'Demo User');

INSERT INTO public.subscriptions (user_id, tier, status)
VALUES ('demo-user-123'::uuid, 'free', 'active');
```

---

## 🔄 n8n Setup (Optional but Recommended)

### What is n8n?

n8n is a workflow automation tool that connects Huttle AI to external services for:
- Scheduled trend monitoring
- Email/Slack notifications for burnout warnings
- Automated content gap reminders
- Social media posting automation

### Quick Setup

1. **Self-Hosted (Free):**
   ```bash
   docker run -it --rm \
     --name n8n \
     -p 5678:5678 \
     -v ~/.n8n:/home/node/.n8n \
     n8nio/n8n
   ```
   Access at `http://localhost:5678`

2. **Cloud (Paid):**
   - Sign up at https://n8n.io
   - Get your webhook URL

### Create Webhooks

Create these webhook endpoints in n8n:

1. **Trend Alert Webhook:**
   - URL: `/webhook/trend-alert`
   - Trigger: When trends spike in user's niche
   - Actions: Send email/Slack notification

2. **Burnout Warning Webhook:**
   - URL: `/webhook/burnout-warning`
   - Trigger: When user activity exceeds healthy limits
   - Actions: Send gentle reminder to rest

3. **Content Gap Reminder:**
   - URL: `/webhook/content-gap-reminder`
   - Trigger: Weekly content gap analysis
   - Actions: Email with content suggestions

4. **Schedule Monitoring:**
   - URL: `/webhook/schedule-monitoring`
   - Trigger: User sets up daily/weekly trend monitoring
   - Actions: Store preferences, trigger daily checks

### n8n Workflow Example (Trend Alert)

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "trend-alert",
        "responseMode": "onReceived"
      }
    },
    {
      "name": "Send Email",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "={{$json[\"user\"][\"email\"]}}",
        "subject": "🔥 New Trend Alert in {{$json[\"data\"][\"niche\"]}}!",
        "text": "{{$json[\"data\"][\"trendName\"]}} is surging with +{{$json[\"data\"][\"velocity\"]}}% growth!"
      }
    }
  ]
}
```

---

## 🎯 Feature-Specific Setup

### Trend Forecaster
- **Supabase:** Stores forecasts in `trend_forecasts` table
- **n8n:** Can schedule daily refreshes and send alerts
- **Tier:** Essentials & Pro only

### Burnout Risk Gauge
- **Supabase:** Tracks activity in `user_activity` table
- **n8n:** Sends warnings when thresholds exceeded
- **Tier:** All tiers

### Content Gap Analysis
- **Supabase:** Compares saved content vs. trends
- **n8n:** Weekly reminders for missing formats
- **Tier:** Pro only for full scans

---

## 🧪 Testing Your Setup

### 1. Test Supabase Connection

```javascript
// In browser console after starting app
import { supabase } from './src/config/supabase';

// Test connection
const { data, error } = await supabase
  .from('users')
  .select('*')
  .limit(1);

console.log('Supabase connected:', !error, data);
```

### 2. Test Subscription System

1. Navigate to AI Power Tools
2. Try generating a caption
3. Check console for usage tracking
4. Verify tier limits are enforced

### 3. Test n8n Webhooks

```bash
# Test trend alert webhook
curl -X POST https://your-n8n-instance.com/webhook/trend-alert \
  -H "Content-Type: application/json" \
  -d '{"userId": "demo-user-123", "data": {"trendName": "Test Trend", "velocity": "+45%"}}'
```

---

## 🔒 Security Best Practices

1. **Never commit .env file** - Already in `.gitignore`
2. **Use RLS policies** - Prevents unauthorized data access
3. **Rotate API keys** regularly
4. **Use Supabase service role** only for admin tasks
5. **Validate n8n webhooks** with signatures

---

## 📊 Usage Monitoring

### View Current Usage (Supabase SQL)

```sql
-- Check user's monthly usage
SELECT 
  feature,
  COUNT(*) as usage_count,
  DATE_TRUNC('month', created_at) as month
FROM public.user_activity
WHERE user_id = 'demo-user-123'::uuid
  AND created_at >= DATE_TRUNC('month', NOW())
GROUP BY feature, month
ORDER BY usage_count DESC;
```

### Set Up Usage Alerts (n8n)

Create a scheduled workflow that checks usage and alerts when limits are reached.

---

## 🆘 Troubleshooting

### Supabase Connection Fails
- ✅ Check `.env` variables are correct
- ✅ Verify Supabase project is active
- ✅ Check RLS policies aren't blocking requests
- ✅ Ensure anon key has correct permissions

### n8n Webhooks Don't Trigger
- ✅ Verify webhook URL is correct
- ✅ Check n8n workflow is activated
- ✅ Look at n8n execution logs
- ✅ Test with curl command first

### Tier Restrictions Not Working
- ✅ Check `subscriptions` table has user record
- ✅ Verify tier value is correct (`free`, `essentials`, `pro`)
- ✅ Clear localStorage and refresh
- ✅ Check browser console for errors

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **n8n Docs:** https://docs.n8n.io
- **Huttle AI Docs:** See `AI-FEATURES-GUIDE.md`

---

**Setup Complete! 🎉**

Once configured, all AI Power Tools will automatically:
- Track usage in Supabase
- Enforce tier limits
- Send alerts via n8n
- Store content for cross-page workflows

