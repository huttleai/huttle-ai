# N8N Workflow Features

This document describes all AI features that will be powered by n8n workflows, including webhook specifications, expected payloads, and implementation details.

## Overview

Huttle AI uses two types of AI integrations:

1. **In-Code AI (Grok/Perplexity APIs)** - Direct API calls for real-time, interactive features
2. **N8N Workflows** - Webhook-triggered workflows for complex, multi-step AI operations

This document covers the **N8N Workflow** features.

## Workflow Features

| Feature | Workflow Name | Webhook Path | Status |
|---------|--------------|--------------|--------|
| Dashboard - Trending Now | `dashboard-trending` | `/webhook/dashboard-trending` | Pending |
| Dashboard - Hashtags of the Day | `dashboard-hashtags` | `/webhook/dashboard-hashtags` | Pending |
| AI Plan Builder | `ai-plan-builder` | `/webhook/ai-plan-builder` | Pending |
| Trend Discovery - Deep Dive | `trend-deep-dive` | `/webhook/trend-deep-dive` | Pending |
| Trend Forecaster | `trend-forecaster` | `/webhook/trend-forecaster` | Pending |
| Viral Blueprint | `viral-blueprint` | `/webhook/viral-blueprint` | Pending |
| Social Updates | `social-updates` | `/webhook/social-updates` | Pending |

## Environment Variables

Add these to your `.env` file when workflows are ready:

```bash
# Dashboard workflows
VITE_N8N_DASHBOARD_WEBHOOK=https://your-n8n.app/webhook/dashboard-data

# Planning workflows
VITE_N8N_PLAN_BUILDER_WEBHOOK=https://your-n8n.app/webhook/ai-plan-builder

# Trend workflows
VITE_N8N_TREND_DEEP_DIVE_WEBHOOK=https://your-n8n.app/webhook/trend-deep-dive
VITE_N8N_TREND_FORECASTER_WEBHOOK=https://your-n8n.app/webhook/trend-forecaster

# Content workflows
VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK=https://your-n8n.app/webhook/viral-blueprint

# Updates workflows
VITE_N8N_SOCIAL_UPDATES_WEBHOOK=https://your-n8n.app/webhook/social-updates
```

---

## 1. Dashboard - Trending Now

**Webhook Path:** `/webhook/dashboard-trending`

**Purpose:** Fetch real-time trending topics relevant to the user's niche.

### Request Payload

```json
{
  "userId": "uuid",
  "niche": "fitness",
  "industry": "health",
  "platforms": ["Instagram", "TikTok"],
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Expected Response

```json
{
  "success": true,
  "topics": [
    {
      "topic": "AI Fitness Coaches",
      "engagement": "125K posts",
      "growth": "+45%",
      "platforms": ["Instagram", "TikTok", "YouTube"]
    },
    {
      "topic": "Protein Coffee Trend",
      "engagement": "89K posts",
      "growth": "+32%",
      "platforms": ["TikTok", "Instagram"]
    }
  ],
  "metadata": {
    "generatedAt": "2025-01-15T10:30:05.000Z",
    "source": "n8n-workflow"
  }
}
```

### Workflow Implementation Notes

1. Receive webhook with user context
2. Query trending APIs (Twitter/X API, TikTok Creative Center, Google Trends)
3. Filter by user's niche/industry keywords
4. Calculate engagement metrics and growth rates
5. Return top 5-10 trending topics

---

## 2. Dashboard - Hashtags of the Day

**Webhook Path:** `/webhook/dashboard-hashtags`

**Purpose:** Generate AI-recommended hashtags based on user's niche.

### Request Payload

```json
{
  "userId": "uuid",
  "niche": "beauty",
  "industry": "cosmetics",
  "limit": 4,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Expected Response

```json
{
  "success": true,
  "hashtags": [
    { "tag": "#glowup", "score": "95%" },
    { "tag": "#skincareroutine", "score": "89%" },
    { "tag": "#makeuptutorial", "score": "85%" },
    { "tag": "#beautyhacks", "score": "82%" }
  ],
  "metadata": {
    "generatedAt": "2025-01-15T10:30:03.000Z",
    "source": "n8n-workflow"
  }
}
```

### Workflow Implementation Notes

1. Receive webhook with niche/industry
2. Query hashtag analytics APIs
3. Score hashtags by:
   - Current engagement rate
   - Growth velocity
   - Relevance to niche
   - Competition level
4. Return top hashtags with scores

---

## 3. AI Plan Builder

**Webhook Path:** `/webhook/ai-plan-builder`

**Purpose:** Generate a complete 7-14 day content calendar.

### Request Payload

```json
{
  "userId": "uuid",
  "goal": "Grow followers",
  "period": "7 days",
  "platforms": ["Instagram", "TikTok"],
  "niche": "fitness",
  "brandVoice": "motivational",
  "brandProfile": {
    "brandName": "FitLife",
    "targetAudience": "25-35 year old fitness enthusiasts",
    "contentPillars": ["Workouts", "Nutrition", "Motivation"]
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Expected Response

```json
{
  "success": true,
  "plan": {
    "goal": "Grow followers",
    "period": "7 days",
    "totalPosts": 14,
    "platforms": ["Instagram", "TikTok"],
    "contentMix": {
      "educational": 50,
      "entertaining": 30,
      "promotional": 20
    }
  },
  "schedule": [
    {
      "day": 1,
      "posts": [
        {
          "time": "09:00",
          "type": "Reel",
          "theme": "Morning Workout Routine",
          "platform": "Instagram",
          "caption": "Start your day right! 💪 Here's my 10-minute morning routine..."
        },
        {
          "time": "19:00",
          "type": "Video",
          "theme": "Protein Shake Recipe",
          "platform": "TikTok",
          "caption": "The protein shake that changed my gains 🥤..."
        }
      ]
    }
  ],
  "recommendations": {
    "postFrequency": "2 posts per day",
    "bestTimes": ["9 AM", "7 PM"],
    "contentTypes": ["Reels", "Carousels", "Stories"]
  },
  "metadata": {
    "generatedAt": "2025-01-15T10:30:15.000Z",
    "model": "gpt-4",
    "source": "n8n-workflow"
  }
}
```

### Workflow Implementation Notes

1. Receive webhook with goal, period, platforms, brand context
2. Analyze optimal posting schedule for selected platforms
3. Generate content themes based on:
   - User's niche and content pillars
   - Current trending topics
   - Platform best practices
4. Create day-by-day schedule with specific post suggestions
5. Include captions and hashtag recommendations

---

## 4. Trend Discovery - Deep Dive

**Webhook Path:** `/webhook/trend-deep-dive`

**Purpose:** Comprehensive analysis of a specific trend with competitor insights.

### Request Payload

```json
{
  "userId": "uuid",
  "trend": "AI Fitness Coaches",
  "niche": "fitness",
  "platforms": ["Instagram", "TikTok"],
  "brandData": {
    "brandVoice": "motivational",
    "targetAudience": "fitness enthusiasts"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Expected Response

```json
{
  "success": true,
  "analysis": "AI Fitness Coaches are revolutionizing personal training by offering 24/7 availability and personalized workout plans. The trend has grown 145% in the past 3 months, driven by...",
  "contentIdeas": [
    "Compare AI coach vs human trainer - pros and cons",
    "Day in my life using an AI fitness coach",
    "I let AI plan my workouts for a week - results"
  ],
  "competitorInsights": [
    {
      "account": "@fitnessguru",
      "approach": "Educational content explaining AI features",
      "engagement": "High - 8.5% avg"
    },
    {
      "account": "@gymlife",
      "approach": "Before/after transformation stories",
      "engagement": "Very High - 12% avg"
    }
  ],
  "citations": [
    "https://example.com/ai-fitness-trend-report",
    "https://example.com/social-media-fitness-stats"
  ],
  "metadata": {
    "generatedAt": "2025-01-15T10:30:20.000Z",
    "source": "n8n-workflow"
  }
}
```

### Workflow Implementation Notes

1. Receive webhook with trend topic and user context
2. Research trend across multiple sources:
   - News articles and blogs
   - Social media analytics
   - Industry reports
3. Analyze competitor content on this trend
4. Generate actionable content ideas tailored to brand voice
5. Include citations for credibility

---

## 5. Trend Forecaster

**Webhook Path:** `/webhook/trend-forecaster`

**Purpose:** Predict upcoming trends for the next 7 days with velocity scores.

### Request Payload

```json
{
  "userId": "uuid",
  "niche": "fitness",
  "timeframe": "7 days",
  "brandData": {
    "brandVoice": "motivational",
    "industry": "health"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Expected Response

```json
{
  "success": true,
  "forecast": "Based on current trajectory and seasonal patterns, here are the emerging trends in fitness for the next 7 days...",
  "timeline": [
    {
      "day": "Jan 16",
      "trend": "Cold Plunge Recovery",
      "velocity": "+55%",
      "confidence": "High"
    },
    {
      "day": "Jan 18",
      "trend": "Zone 2 Cardio",
      "velocity": "+42%",
      "confidence": "High"
    },
    {
      "day": "Jan 20",
      "trend": "Peptide Supplements",
      "velocity": "+38%",
      "confidence": "Medium"
    }
  ],
  "postIdeas": "1. Create a 'Cold Plunge Challenge' series - document your 7-day journey\n2. Educational carousel on Zone 2 heart rate zones\n3. Myth-busting video on peptide supplements",
  "citations": [
    "https://example.com/fitness-trends-2025",
    "https://example.com/social-media-analytics"
  ],
  "metadata": {
    "generatedAt": "2025-01-15T10:30:25.000Z",
    "source": "n8n-workflow"
  }
}
```

### Workflow Implementation Notes

1. Receive webhook with niche and timeframe
2. Analyze trend velocity and trajectory
3. Use predictive models based on:
   - Historical trend patterns
   - Seasonal factors
   - Current momentum
4. Generate confidence scores
5. Create tailored post ideas for each predicted trend

---

## 6. Viral Blueprint

**Webhook Path:** `/webhook/viral-blueprint`

**Purpose:** Generate step-by-step viral content blueprints.

### Request Payload

```json
{
  "userId": "uuid",
  "platform": "TikTok",
  "postType": "Video",
  "topic": "morning workout routine",
  "voiceContext": "Personal Brand",
  "brandProfile": {
    "brandVoice": "motivational",
    "niche": "fitness"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Expected Response

```json
{
  "success": true,
  "blueprint": {
    "isVideoContent": true
  },
  "directorsCut": [
    {
      "step": 1,
      "title": "The Hook",
      "script": "\"Stop scrolling if you want to know the secret to morning energy...\"",
      "visual": "Close-up face shot, slight zoom-in. Text overlay: 'THE SECRET' in bold."
    },
    {
      "step": 2,
      "title": "The Problem",
      "script": "\"Most people hit snooze 5 times and feel groggy all day...\"",
      "visual": "B-roll of alarm clock, person struggling to wake up."
    },
    {
      "step": 3,
      "title": "The Solution",
      "script": "\"Here's my 5-minute morning routine that changed everything...\"",
      "visual": "Quick montage of routine steps with upbeat music."
    },
    {
      "step": 4,
      "title": "The Value",
      "script": "\"Step 1: Cold water on face. Step 2: 10 jumping jacks. Step 3: Deep breaths.\"",
      "visual": "Demonstrate each step with text overlays."
    },
    {
      "step": 5,
      "title": "The CTA",
      "script": "\"Follow for more energy hacks! Drop a 🔥 if you're trying this tomorrow.\"",
      "visual": "Return to face, point at camera, follow button animation."
    }
  ],
  "seoStrategy": {
    "visualKeywords": ["morning routine hack", "energy boost", "wake up tip"],
    "spokenHooks": ["Stop scrolling", "Here's the secret", "This changed everything"],
    "captionKeywords": ["#morningroutine", "#fitnessmotivation", "#energyboost", "#healthyhabits"]
  },
  "audioVibe": {
    "mood": "Upbeat Lo-Fi / Motivational",
    "bpm": "120-130",
    "suggestion": "Use trending sounds from TikTok Discover page"
  },
  "viralScore": 85,
  "metadata": {
    "generatedAt": "2025-01-15T10:30:30.000Z",
    "source": "n8n-workflow"
  }
}
```

### Workflow Implementation Notes

1. Receive webhook with platform, post type, topic, voice context
2. Analyze successful viral content patterns for the platform
3. Generate step-by-step blueprint:
   - For video: Script + Visual directions
   - For non-video: Text + Visual suggestions
4. Create SEO strategy with keywords
5. Suggest audio/music for video content
6. Calculate viral potential score

---

## 7. Social Updates

**Webhook Path:** `/webhook/social-updates`

**Purpose:** Fetch latest social media platform updates and announcements.

### Request Payload

```json
{
  "userId": "uuid",
  "limit": 12,
  "platforms": ["Instagram", "TikTok", "X", "YouTube", "Facebook"],
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Expected Response

```json
{
  "success": true,
  "updates": [
    {
      "id": "update-001",
      "platform": "Instagram",
      "date": "January 2025",
      "date_month": "2025-01",
      "title": "Instagram Expands Reels to 3 Minutes",
      "description": "Instagram now allows Reels up to 3 minutes long, giving creators more flexibility for storytelling and tutorials.",
      "link": "https://about.instagram.com/blog/announcements/reels-3-minutes",
      "impact": "high",
      "keyTakeaways": [
        "Reels can now be up to 3 minutes long",
        "Longer format allows for more in-depth content",
        "Algorithm may favor longer watch times"
      ],
      "actionItems": [
        "Experiment with longer-form Reels",
        "Repurpose YouTube Shorts content",
        "Test engagement on different lengths"
      ],
      "affectedUsers": "All Instagram creators",
      "timeline": "Rolling out globally January 2025"
    }
  ],
  "metadata": {
    "generatedAt": "2025-01-15T10:30:10.000Z",
    "source": "n8n-workflow"
  }
}
```

### Workflow Implementation Notes

1. Receive webhook with platform filter and limit
2. Scrape/monitor official platform announcement channels:
   - Instagram: about.instagram.com/blog
   - TikTok: newsroom.tiktok.com
   - X/Twitter: blog.twitter.com
   - YouTube: blog.youtube
   - Facebook: about.fb.com/news
3. Parse and categorize updates by impact level
4. Extract key takeaways and action items
5. Return formatted updates sorted by date

---

## Authentication

All webhook requests include an optional `Authorization` header with a Bearer token:

```
Authorization: Bearer <supabase_access_token>
```

The workflow can use this token to:
- Verify the user is authenticated
- Look up user preferences in Supabase
- Store analytics data

---

## Error Handling

All workflows should return errors in this format:

```json
{
  "success": false,
  "error": "Error message description",
  "errorCode": "RATE_LIMITED",
  "retryAfter": 60
}
```

Common error codes:
- `NOT_CONFIGURED` - Workflow not set up
- `TIMEOUT` - Request timed out
- `RATE_LIMITED` - Too many requests
- `UNAUTHORIZED` - Invalid/missing auth
- `VALIDATION_ERROR` - Invalid request payload
- `EXTERNAL_API_ERROR` - Third-party API failed

---

## Testing Workflows

To test a workflow locally:

1. Set the environment variable:
   ```bash
   VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK=http://localhost:5678/webhook/viral-blueprint
   ```

2. Create the workflow in n8n with a Webhook trigger node

3. The frontend will automatically detect the workflow is configured and use it

4. Check browser console for `[N8N_WORKFLOW]` logs

---

## Related Files

- **Service Layer:** `src/services/n8nWorkflowAPI.js`
- **Constants:** `src/utils/workflowConstants.js`
- **Config:** `src/config/n8n.js`
- **Feature Separation:** `docs/AI-FEATURES-SEPARATION.md`





