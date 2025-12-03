# n8n Workflow Setup Guides

This document provides step-by-step instructions for setting up n8n workflows for Huttle AI social media analytics integration.

## Prerequisites

Before setting up these workflows, ensure you have:

1. **n8n Instance**: Running either locally or on n8n Cloud
2. **Supabase Project**: With analytics schema installed
3. **Platform Developer Accounts**: For Instagram, Facebook, Twitter, TikTok, YouTube
4. **Environment Variables**: Configure in your n8n instance:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`

---

## Workflow 1: OAuth Connection Enhancement

**Purpose**: Handle OAuth authentication and fetch initial account data

### Steps to Create:

1. **Open n8n** and click "Create Workflow"
2. **Add Webhook Trigger**:
   - Path: `/social-connect`
   - Method: POST
   - Response Mode: "When Last Node Finishes"

3. **Add Function Node** (Extract Platform):
   ```javascript
   const platform = $input.item.json.platform.toLowerCase();
   const userId = $input.item.json.userId;
   
   return {
     platform,
     userId,
     timestamp: new Date().toISOString()
   };
   ```

4. **Add Switch Node** (Route by Platform):
   - Mode: Expression
   - Value: `{{$json.platform}}`
   - Outputs: instagram, facebook, twitter, tiktok, youtube

5. **For Each Platform Branch**:

   **Instagram Branch**:
   - Add "Instagram Business" node
   - Credential: Create OAuth2 credentials
   - Operation: "Get User"
   - Fields to retrieve: username, followers_count, profile_picture_url

   **Facebook Branch**:
   - Add "Facebook Graph API" node
   - Operation: "Get Page"
   - Fields: name, followers_count, fan_count

   **Twitter Branch**:
   - Add "Twitter" node
   - Operation: "Get User"
   - Fields: username, followers_count, verified

   **TikTok Branch**:
   - Add "HTTP Request" node
   - URL: `https://open-api.tiktok.com/user/info/`
   - Authentication: OAuth 2.0
   - Fields: username, follower_count

   **YouTube Branch**:
   - Add "YouTube" node
   - Operation: "Get Channel"
   - Fields: title, subscriberCount, videoCount

6. **Add Function Node** (Format Response):
   ```javascript
   const platformData = $input.first().json;
   
   return {
     platform: $json.platform,
     userId: $json.userId,
     platform_username: platformData.username || platformData.name || platformData.title,
     platform_user_id: platformData.id,
     followers: platformData.followers_count || platformData.follower_count || platformData.subscriberCount || 0,
     connected_at: new Date().toISOString()
   };
   ```

7. **Add HTTP Request Node** (Update Supabase):
   - Method: POST
   - URL: `{{$env.SUPABASE_URL}}/rest/v1/social_connections`
   - Headers:
     - `apikey`: `{{$env.SUPABASE_SERVICE_KEY}}`
     - `Authorization`: `Bearer {{$env.SUPABASE_SERVICE_KEY}}`
     - `Content-Type`: `application/json`
     - `Prefer`: `resolution=merge-duplicates`
   - Body:
     ```json
     {
       "user_id": "{{$json.userId}}",
       "platform": "{{$json.platform}}",
       "is_connected": true,
       "platform_username": "{{$json.platform_username}}",
       "platform_user_id": "{{$json.platform_user_id}}",
       "connected_at": "{{$json.connected_at}}",
       "last_verified": "{{$json.connected_at}}"
     }
     ```

8. **Add Response Node**:
   ```json
   {
     "success": true,
     "platform": "{{$json.platform}}",
     "username": "{{$json.platform_username}}",
     "message": "Successfully connected {{$json.platform}}"
   }
   ```

9. **Save and Activate Workflow**

---

## Workflow 2: Fetch Analytics from Platforms

**Purpose**: Fetch post metrics and account analytics from each platform

### Using n8n AI Workflow Builder:

1. **Click "AI Workflow Builder"**
2. **Provide this prompt**:

> "Create a workflow that:
> 1. Receives a webhook with userId, platforms array, and dateRange
> 2. For each platform, queries Supabase to get the user's connection details
> 3. Uses platform-specific API nodes to fetch:
>    - Recent posts (last 7-30 days based on dateRange)
>    - For each post: likes, comments, shares, views, reach, impressions
>    - Account-level metrics: followers, posts count
> 4. Transforms the data into a standard format
> 5. Stores results in Supabase social_analytics table
> 6. Creates a daily snapshot in analytics_snapshots table
> 7. Returns success status"

3. **Review Generated Workflow** and make adjustments:
   - Ensure OAuth credentials are configured for each platform
   - Verify Supabase HTTP requests use correct headers
   - Test each branch individually

### Manual Setup (if not using AI):

1. **Add Webhook Trigger**:
   - Path: `/fetch-analytics`
   - Method: POST

2. **Add Function Node** (Parse Request):
   ```javascript
   const { userId, platforms, dateRange } = $input.item.json;
   const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
   const startDate = new Date();
   startDate.setDate(startDate.getDate() - daysAgo);
   
   return platforms.map(platform => ({
     userId,
     platform,
     startDate: startDate.toISOString(),
     endDate: new Date().toISOString()
   }));
   ```

3. **Add Loop Over Items** node

4. **For Each Platform, Add Platform-Specific Branch**:

   **Instagram Analytics**:
   - Node: "Instagram Business API"
   - Operation: "Get Media Insights"
   - Metrics: impressions, reach, engagement, saves, comments, likes

   **Facebook Analytics**:
   - Node: "Facebook Graph API"
   - Operation: "Get Post Insights"
   - Metrics: impressions, reach, reactions, comments, shares

   **Twitter Analytics**:
   - Node: "HTTP Request"
   - URL: `https://api.twitter.com/2/tweets/{id}`
   - Query params: `tweet.fields=public_metrics`

   **TikTok Analytics**:
   - Node: "HTTP Request"
   - URL: `https://open-api.tiktok.com/video/analytics/`

   **YouTube Analytics**:
   - Node: "YouTube Analytics"
   - Report: Video performance
   - Metrics: views, likes, comments, shares, watchTime

5. **Add Function Node** (Transform Data):
   ```javascript
   const post = $input.first().json;
   
   return {
     user_id: $json.userId,
     platform: $json.platform,
     platform_post_id: post.id,
     views: post.views || post.impressions || 0,
     likes: post.likes || post.like_count || 0,
     comments: post.comments || post.comment_count || 0,
     shares: post.shares || post.share_count || 0,
     saves: post.saves || 0,
     reach: post.reach || 0,
     impressions: post.impressions || 0,
     engagement_rate: calculateEngagementRate(post),
     platform_metrics: post,
     post_date: post.timestamp || post.created_at,
     fetched_at: new Date().toISOString()
   };
   ```

6. **Add HTTP Request Node** (Store in Supabase):
   - Method: POST
   - URL: `{{$env.SUPABASE_URL}}/rest/v1/social_analytics`
   - Insert analytics data

7. **Add Aggregation Node** (Create Snapshot):
   - Calculate daily totals per platform
   - Store in `analytics_snapshots` table

8. **Save and Activate**

---

## Workflow 3: Daily Analytics Sync

**Purpose**: Automatically sync analytics every day

### Setup:

1. **Add Cron Trigger**:
   - Expression: `0 2 * * *` (Daily at 2:00 AM)

2. **Add HTTP Request Node** (Get Active Users):
   - URL: `{{$env.SUPABASE_URL}}/rest/v1/social_connections`
   - Query: `?select=user_id,platform&is_connected=eq.true&analytics_enabled=eq.true`

3. **Add Loop Over Items** (Each User):

4. **Add HTTP Request Node** (Trigger Analytics Fetch):
   - Method: POST
   - URL: `http://your-n8n-instance/webhook/fetch-analytics`
   - Body: `{ "userId": "{{$json.user_id}}", "platforms": "all", "dateRange": "7d" }`

5. **Add Wait Node**: 5 seconds between users (rate limiting)

6. **Save and Activate**

---

## Workflow 4: Generate AI Insights

**Purpose**: Analyze analytics data to generate insights

### Using AI Workflow Builder:

**Prompt**:
> "Create a workflow that:
> 1. Receives a userId
> 2. Queries Supabase for last 30 days of analytics
> 3. Calculates:
>    - Best posting times (group by hour)
>    - Engagement trends (compare recent vs older)
>    - Platform performance ranking
>    - Content gaps (video vs image ratios)
> 4. Sends data to Grok API to generate 3-5 actionable insights
> 5. Stores insights in ai_insights table
> 6. Returns insights array"

### Manual Setup:

1. **Add Webhook Trigger**:
   - Path: `/generate-insights`

2. **Add HTTP Request** (Get Analytics):
   - URL: `{{$env.SUPABASE_URL}}/rest/v1/social_analytics`
   - Query: Filter by userId and date range

3. **Add Function Node** (Analyze Data):
   ```javascript
   const analytics = $input.all().map(item => item.json);
   
   // Calculate best posting times
   const hourlyPerformance = {};
   analytics.forEach(post => {
     const hour = new Date(post.post_date).getHours();
     if (!hourlyPerformance[hour]) {
       hourlyPerformance[hour] = { count: 0, totalEngagement: 0 };
     }
     hourlyPerformance[hour].count++;
     hourlyPerformance[hour].totalEngagement += post.likes + post.comments + post.shares;
   });
   
   const bestHour = Object.entries(hourlyPerformance)
     .sort((a, b) => (b[1].totalEngagement / b[1].count) - (a[1].totalEngagement / a[1].count))[0];
   
   // Calculate engagement trend
   const recentPosts = analytics.slice(-7);
   const olderPosts = analytics.slice(0, 7);
   const recentAvg = recentPosts.reduce((sum, p) => sum + p.engagement_rate, 0) / recentPosts.length;
   const olderAvg = olderPosts.reduce((sum, p) => sum + p.engagement_rate, 0) / olderPosts.length;
   const trend = ((recentAvg - olderAvg) / olderAvg) * 100;
   
   return {
     bestHour: bestHour[0],
     avgEngagement: bestHour[1].totalEngagement / bestHour[1].count,
     engagementTrend: trend,
     totalPosts: analytics.length,
     platforms: [...new Set(analytics.map(p => p.platform))]
   };
   ```

4. **Add HTTP Request** (Optional - Grok API):
   - URL: Grok API endpoint
   - Pass analysis data for enhanced insights

5. **Add Function Node** (Format Insights):
   ```javascript
   return [
     {
       user_id: $json.userId,
       insight_type: 'best_time',
       title: 'Best Posting Time Detected',
       description: `Your audience is most engaged at ${$json.bestHour}:00`,
       priority: 'high',
       platform: 'all',
       metrics: { bestHour: $json.bestHour, avgEngagement: $json.avgEngagement }
     },
     // Add more insights...
   ];
   ```

6. **Add HTTP Request** (Store Insights):
   - URL: `{{$env.SUPABASE_URL}}/rest/v1/ai_insights`
   - Insert insights

7. **Save and Activate**

---

## Testing Workflows

### Test OAuth Connection:
```bash
curl -X POST https://your-n8n-instance/webhook/social-connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "platform": "instagram"
  }'
```

### Test Analytics Fetch:
```bash
curl -X POST https://your-n8n-instance/webhook/fetch-analytics \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "platforms": ["instagram", "twitter"],
    "dateRange": "7d"
  }'
```

### Test Insights Generation:
```bash
curl -X POST https://your-n8n-instance/webhook/generate-insights \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123"
  }'
```

---

## Environment Variables Required

Add these to your n8n instance:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
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
GROK_API_KEY=your-grok-api-key (optional)
```

---

## Troubleshooting

**Workflow not triggering**:
- Check that workflow is activated (toggle switch)
- Verify webhook URL is correct
- Check n8n logs for errors

**OAuth failing**:
- Verify redirect URIs are correct in platform developer console
- Check that credentials are properly configured in n8n
- Ensure OAuth scopes include analytics permissions

**Data not storing in Supabase**:
- Check RLS policies allow service role access
- Verify SUPABASE_SERVICE_KEY is correct
- Check Supabase logs for errors

**Rate limiting issues**:
- Add Wait nodes between API calls
- Implement exponential backoff
- Cache data when possible

---

## Next Steps

1. Set up platform developer accounts
2. Configure OAuth credentials in n8n
3. Create workflows using guides above
4. Test each workflow individually
5. Activate all workflows
6. Monitor execution logs
7. Adjust rate limits as needed

For detailed platform-specific setup, see the main N8N-INTEGRATION-GUIDE.md file.

