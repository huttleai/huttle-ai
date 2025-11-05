# n8n Social Media Integration Setup Guide

This guide walks you through setting up automated social media posting using n8n workflows that integrate with Huttle AI.

## 🎯 What This Enables

- **Automated Posting**: Posts go directly to social platforms without manual copying/pasting
- **Multi-Platform**: Post to Instagram, Facebook, Twitter, LinkedIn, TikTok, and YouTube simultaneously
- **Real OAuth**: Secure authentication instead of simulation
- **Connection Management**: Track which platforms are connected per user
- **Error Handling**: Automatic retry and failure notifications

## 📋 Prerequisites

### 1. Supabase Database
You need a Supabase project with the n8n integration schema installed.

### 2. n8n Instance
Choose one of these options:

#### Option A: Self-Hosted (Free)
```bash
docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```
Access at: http://localhost:5678

#### Option B: n8n Cloud (Paid - $20/month)
Sign up at: https://n8n.io/cloud

### 3. Social Media Developer Accounts
You'll need developer access for each platform you want to automate:

- **Meta (Instagram & Facebook)**: https://developers.facebook.com
- **Twitter/X**: https://developer.twitter.com
- **LinkedIn**: https://www.linkedin.com/developers
- **TikTok**: https://developers.tiktok.com
- **YouTube**: https://console.cloud.google.com (Google Cloud)

---

## 🚀 Step-by-Step Setup

### Phase 1: Database Setup (5 minutes)

1. **Open Supabase SQL Editor**
   - Go to your Supabase Dashboard
   - Navigate to SQL Editor

2. **Run the Schema**
   - Open the file: `supabase-n8n-connections-schema.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click "Run"

3. **Verify Tables Created**
   - Check that these tables exist:
     - `social_connections`
     - `n8n_post_queue`

### Phase 2: Environment Configuration

Add these variables to your `.env` file:

```env
# n8n Integration (Required for automated posting)
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.app/webhook/post-to-social
VITE_N8N_CONNECTION_WEBHOOK_URL=https://your-n8n-instance.app/webhook/check-connections

# API Base URL (for Vercel deployment)
VITE_API_BASE_URL=https://your-app.vercel.app/api
```

### Phase 3: n8n Workflow Setup (30-45 minutes)

#### Step 1: Create Social Posting Workflow

1. **Create New Workflow**
   - Name: "Huttle AI Social Posting"
   - Add Webhook node as trigger

2. **Configure Webhook Trigger**
   ```
   HTTP Method: POST
   Path: /post-to-social
   Response Mode: When Last Node Finishes
   Response Data: All Entries
   ```

3. **Add Router Node**
   - Route based on `{{ $json.body.post.platforms }}`
   - Create branches for each platform

4. **Add Platform Nodes**
   For each platform, add the corresponding n8n node:
   - Instagram Business
   - Facebook Pages
   - Twitter
   - LinkedIn
   - TikTok
   - YouTube

5. **Configure Each Platform**
   - Click "Create New Credential" for each platform
   - Follow OAuth flow
   - Grant necessary permissions

6. **Add Response Node**
   ```json
   {
     "success": true,
     "postedPlatforms": {{ $json.body.post.platforms }},
     "timestamp": "{{ new Date().toISOString() }}"
   }
   ```

#### Step 2: Create Connection Status Workflow

1. **Create New Workflow**
   - Name: "Huttle AI Connection Status"
   - Add Webhook node as trigger

2. **Configure Webhook**
   ```
   HTTP Method: POST
   Path: /check-connections
   Response Mode: Response with Data
   ```

3. **Add Function Node** to check OAuth status:
   ```javascript
   // Check which credentials are configured
   const credentials = {
     instagram: !!this.getCredentials('instagramBusinessApi'),
     facebook: !!this.getCredentials('facebookGraphApi'),
     twitter: !!this.getCredentials('twitterOAuth2'),
     linkedin: !!this.getCredentials('linkedInOAuth2'),
     tiktok: !!this.getCredentials('tikTokForBusiness'),
     youtube: !!this.getCredentials('youTubeOAuth2')
   };

   return {
     platforms: credentials,
     configuredCount: Object.values(credentials).filter(Boolean).length
   };
   ```

4. **Add Response Node**
   ```json
   {
     "success": true,
     "connections": {{ $node["Function"].json.platforms }},
     "lastChecked": "{{ new Date().toISOString() }}"
   }
   ```

### Phase 4: Platform-Specific Setup

#### Meta (Instagram & Facebook)

1. **Create App**
   - Go to https://developers.facebook.com
   - Create new app
   - Choose "Business" type

2. **Enable APIs**
   - Instagram Basic Display API
   - Facebook Pages API

3. **Get Credentials**
   - App ID
   - App Secret
   - Configure OAuth redirect to n8n

4. **n8n Configuration**
   - Add Instagram Business node
   - Connect with OAuth credentials

#### Twitter/X

1. **Apply for Developer Account**
   - Go to https://developer.twitter.com
   - Apply for Elevated access ($100/month)
   - Wait for approval (1-2 days)

2. **Create App**
   - Project → Apps → Create App
   - Enable OAuth 2.0

3. **n8n Configuration**
   - Add Twitter node
   - Use OAuth 2.0 flow

#### LinkedIn

1. **Create App**
   - Go to https://www.linkedin.com/developers
   - Create new app

2. **Configure Permissions**
   - `w_member_social` (write posts)
   - `r_liteprofile` (read profile)

3. **n8n Configuration**
   - Add LinkedIn node
   - Configure OAuth credentials

#### TikTok

1. **Apply for Developer Access**
   - Go to https://developers.tiktok.com
   - Apply for TikTok for Business
   - Wait for approval

2. **Create App**
   - Enable video posting permissions

3. **n8n Configuration**
   - Add TikTok for Business node
   - Set up OAuth flow

#### YouTube

1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com
   - Create new project

2. **Enable YouTube Data API v3**
   - APIs & Services → Library
   - Search for "YouTube Data API v3"

3. **Create OAuth Credentials**
   - APIs & Services → Credentials
   - Create OAuth 2.0 Client ID

4. **n8n Configuration**
   - Add YouTube node
   - Configure OAuth credentials

### Phase 5: Testing

#### Test 1: Connection Status
```bash
# Test connection webhook
curl -X POST https://your-n8n-instance.app/webhook/check-connections \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:
```json
{
  "success": true,
  "connections": {
    "instagram": true,
    "facebook": true,
    "twitter": false,
    "linkedin": true,
    "tiktok": false,
    "youtube": true
  }
}
```

#### Test 2: Post Submission
```bash
# Test posting webhook
curl -X POST https://your-n8n-instance.app/webhook/post-to-social \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user-123",
    "post": {
      "id": "test-post-1",
      "title": "Test Post",
      "caption": "This is a test post from Huttle AI!",
      "platforms": ["instagram", "twitter"],
      "hashtags": "#test #huttleai"
    }
  }'
```

#### Test 3: Huttle AI Integration
1. Start your Huttle AI app
2. Go to Settings page
3. You should see "n8n Ready" indicator
4. Try connecting a platform
5. Try creating and posting content

---

## 🔧 Troubleshooting

### n8n Webhooks Not Working

**Problem**: Webhooks return 404 errors
**Solution**:
- Ensure workflows are activated (toggle on)
- Check webhook paths match exactly
- Verify n8n instance is running

### OAuth Connections Failing

**Problem**: "Invalid redirect URI" errors
**Solution**:
- In each platform's developer console, add your n8n instance URL as a valid redirect URI
- Example: `https://your-n8n-instance.app/rest/oauth2-credential/callback`

### Posts Not Appearing

**Problem**: Posts are sent but don't appear on platforms
**Solution**:
- Check n8n workflow execution logs
- Verify OAuth permissions include posting rights
- Some platforms require business verification

### Database Connection Issues

**Problem**: Huttle AI can't update connection status
**Solution**:
- Verify Supabase credentials are correct
- Check that schema was installed properly
- Ensure user has proper permissions

---

## 📊 Monitoring & Analytics

### Workflow Execution Logs
- In n8n, go to "Executions" tab
- View success/failure rates
- Debug failed posts

### Database Queries
Check posting activity:
```sql
-- Recent posts
SELECT status, platforms, created_at
FROM n8n_post_queue
ORDER BY created_at DESC
LIMIT 10;

-- Connection status
SELECT platform, is_connected, last_verified
FROM social_connections
WHERE user_id = 'your-user-id';
```

### Error Handling
- Failed posts are automatically retried
- Check `error_message` column for details
- Manual retry available in Huttle AI interface

---

## 🎯 What Happens Next

### Immediate Benefits
- ✅ Real OAuth instead of simulation
- ✅ Automated multi-platform posting
- ✅ Connection status tracking
- ✅ Error handling and retries

### Future Enhancements
- 📅 Scheduled posting via n8n
- 📊 Posting analytics and performance tracking
- 🤖 AI-powered optimal posting times
- 📈 Engagement monitoring and insights

---

## 📞 Support

If you encounter issues:

1. **Check n8n Logs**: Workflow executions show detailed error messages
2. **Verify Credentials**: Ensure all OAuth credentials are properly configured
3. **Test Webhooks**: Use curl commands to test webhook connectivity
4. **Database Queries**: Check Supabase for connection status issues

For n8n-specific help: https://docs.n8n.io
For platform API help: Check each platform's developer documentation

---

**🎉 Setup Complete!**

Your Huttle AI app now has full social media automation capabilities through n8n. Users can connect their accounts once and enjoy seamless multi-platform posting.
