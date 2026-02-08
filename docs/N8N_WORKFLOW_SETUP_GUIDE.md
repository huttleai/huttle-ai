# n8n Workflow Setup Guide - Launch Priority Features

## 🚀 Overview

This guide shows you how to build n8n workflows for your **4 advertised features**. You can use **Claude in Chrome Extension** or the **n8n AI Workflow Builder** to create these.

## 🎯 Priority Features (In Order)

### 1. **Viral Blueprint** ⭐ HIGHEST PRIORITY
### 2. **Content Remix Studio**
### 3. **AI Plan Builder** 
### 4. **Trend Lab** (Quick Scan + Deep Dive)

**Note**: Trend Forecaster has been removed for this launch.

---

## Feature Status & Implementation

| Feature | Needs n8n? | Has Fallback? | Launch Status |
|---------|-----------|---------------|---------------|
| **Viral Blueprint** | ✅ Yes | ✅ Mock generator | Ready (fallback works) |
| **Content Remix** | ✅ Yes | ✅ Generic AI call | Ready (fallback works) |
| **AI Plan Builder** | ✅ Yes | ✅ Mock plans | Ready (fallback works) |
| **Trend Lab Quick Scan** | ❌ No | N/A (uses Perplexity API) | **Already works!** |
| **Trend Lab Audience Insights** | ❌ No | N/A (uses Perplexity API) | **Already works!** |
| **Trend Lab Deep Dive** | ✅ Yes | ✅ Perplexity fallback | Ready (fallback works) |

---

## 🔧 Environment Variables Required

Add these to your **Vercel project settings** and local `.env` file:

```bash
# Viral Blueprint (Priority #1)
VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK=https://your-n8n-instance.com/webhook/viral-blueprint

# Content Remix Studio (Priority #2)
VITE_N8N_CONTENT_REMIX_WEBHOOK=https://your-n8n-instance.com/webhook/content-remix

# AI Plan Builder (Priority #3)
VITE_N8N_PLAN_BUILDER_WEBHOOK=https://your-n8n-instance.com/webhook/plan-builder

# Trend Lab Deep Dive (Priority #4)
VITE_N8N_TREND_DEEP_DIVE_WEBHOOK=https://your-n8n-instance.com/webhook/trend-deep-dive
```

**⚠️ IMPORTANT**: If you don't set these, the app will **automatically use fallback generators** - users won't see errors!

---

## 📋 Workflow Specifications

### 1. Viral Blueprint Workflow

**Purpose**: Generate viral content blueprints with hooks, scripts, visuals, SEO strategy

**Webhook Endpoint**: `/webhook/viral-blueprint`

**Input Payload** (from `ViralBlueprint.jsx`):
```json
{
  "topic": "How to 10x your productivity",
  "platform": "Instagram",
  "format": "Video",
  "goal": "views",
  "audience": "SaaS Founders",
  "brandVoice": "Authentic and Authoritative",
  "identity": "Creator"
}
```

**Required Output Format**:
```json
{
  "hooks": [
    "Stop scrolling if you're tired of being busy but not productive...",
    "Here's what nobody tells you about productivity...",
    "I tested 47 productivity systems. Here's the only one that worked..."
  ],
  "content_script": [
    {
      "step": 1,
      "title": "The Hook",
      "script": "Stop scrolling if you're tired of being busy but not productive...",
      "visual": "Close-up face shot with text overlay"
    },
    {
      "step": 2,
      "title": "The Problem",
      "script": "Most productivity advice is trash...",
      "visual": "B-roll of cluttered desk"
    }
  ],
  "visual_keywords": ["productivity", "workspace", "focused work"],
  "spoken_hooks": ["Stop scrolling", "Here's the truth", "This changed everything"],
  "caption_keywords": ["#productivity", "#entrepreneur", "#focus"],
  "audio_vibe": {
    "mood": "motivational",
    "bpm": 128,
    "suggestion": "Upbeat electronic with inspiring undertones"
  },
  "viral_score": 87
}
```

**How to Build in Claude/n8n**:
1. Start with webhook trigger node
2. Use Claude AI node with this prompt template:
```
You are a viral content strategist. Create a blueprint for: {topic}

Platform: {platform}
Format: {format}
Goal: {goal}
Audience: {audience}
Brand Voice: {brandVoice}
Identity: {identity}

Output MUST include:
1. 3 scroll-stopping hooks
2. 5-step content script (each with step number, title, script text, and visual suggestion)
3. Visual keywords (array of 5-8 keywords)
4. Spoken hooks (array of 3-5 catchy phrases)
5. Caption keywords (array of hashtags)
6. Audio vibe (mood, BPM, suggestion)
7. Viral score (0-100)

Return as JSON matching this structure exactly:
{hooks, content_script, visual_keywords, spoken_hooks, caption_keywords, audio_vibe, viral_score}
```
3. Add Set node to structure output
4. Return response node

---

### 2. Content Remix Studio Workflow

**Purpose**: Transform existing content into fresh posts for multiple platforms

**Webhook Endpoint**: `/webhook/content-remix`

**Input Payload** (from `ContentRemix.jsx` via `n8nGeneratorAPI.js`):
```json
{
  "userId": "uuid-string",
  "topic": "Original content text or URL to remix",
  "platform": "multi-platform",
  "contentType": "remix",
  "brandVoice": "Professional and Direct",
  "remixMode": "viral",
  "additionalContext": {
    "mode": "viral",
    "niche": "SaaS Marketing",
    "targetAudience": "B2B Marketers",
    "brandVoice": "Professional and Direct"
  }
}
```

**Required Output Format**:
```json
{
  "ideas": [
    {
      "platform": "Instagram",
      "format": "Reel",
      "hook": "Attention B2B Marketers...",
      "content": "Full remixed content for Instagram Reel...",
      "cta": "Follow for more SaaS marketing tips"
    },
    {
      "platform": "X",
      "format": "Thread",
      "hook": "🧵 Thread on [topic]...",
      "content": "Full remixed thread...",
      "cta": "RT if this helped you"
    },
    {
      "platform": "LinkedIn",
      "format": "Post",
      "hook": "Here's what I learned about [topic]...",
      "content": "Full remixed LinkedIn post...",
      "cta": "Connect with me for more insights"
    }
  ]
}
```

**How to Build in Claude/n8n**:
1. Webhook trigger node
2. Claude AI node with prompt:
```
You are a content remixing expert. Transform this content for multiple platforms:

Original Content: {topic}
Remix Mode: {remixMode} (viral = engagement focus, sales = conversion focus with PAS framework)
Brand Voice: {brandVoice}
Niche: {additionalContext.niche}
Target Audience: {additionalContext.targetAudience}

Create 5 platform-specific remixes:
1. Instagram Reel (15-30 sec script)
2. X/Twitter Thread (5-7 tweets)
3. LinkedIn Post (professional tone)
4. TikTok Video (hook + story + payoff)
5. YouTube Short (punchy script)

For each, include:
- Platform name
- Format type
- Scroll-stopping hook
- Full remixed content
- Strong CTA

Return as JSON array: [{platform, format, hook, content, cta}, ...]
```
3. Set node to structure output
4. Return response

---

### 3. AI Plan Builder Workflow

**Purpose**: Generate 7 or 14-day content calendars with daily post ideas

**Webhook Endpoint**: `/webhook/plan-builder`

**Input Payload** (from `AIPlanBuilder.jsx` via `planBuilderAPI.js`):
```json
{
  "job_id": "uuid-from-supabase",
  "goal": "Grow followers",
  "period": 7,
  "platforms": ["Instagram", "TikTok", "X"],
  "brand_voice": "Authentic and Relatable",
  "niche": "Fitness Coaching",
  "target_audience": "Busy professionals 30-45"
}
```

**Required Output Format**:
```json
{
  "goal": "Grow followers",
  "period": 7,
  "totalPosts": 21,
  "platforms": ["Instagram", "TikTok", "X"],
  "contentMix": {
    "educational": 40,
    "entertaining": 30,
    "promotional": 10,
    "engagement": 20
  },
  "schedule": [
    {
      "day": "Monday",
      "date": "2026-02-10",
      "posts": [
        {
          "platform": "Instagram",
          "topic": "5 Quick Desk Exercises for Busy Professionals",
          "content_type": "Reel",
          "reasoning": "Educational content to establish authority",
          "hook": "You don't need a gym to stay fit..."
        },
        {
          "platform": "TikTok",
          "topic": "My Morning Routine That Changed Everything",
          "content_type": "Video",
          "reasoning": "Personal story drives engagement",
          "hook": "POV: You finally figured out morning workouts..."
        }
      ]
    }
  ]
}
```

**How to Build in Claude/n8n**:
1. Webhook trigger
2. Claude AI node:
```
You are a content calendar strategist. Create a {period}-day content plan:

Goal: {goal}
Platforms: {platforms}
Brand Voice: {brand_voice}
Niche: {niche}
Target Audience: {target_audience}

Generate a strategic content mix:
- 40% Educational (how-to, tips, tutorials)
- 30% Entertaining (stories, behind-the-scenes)
- 20% Engagement (questions, polls, UGC)
- 10% Promotional (products, services)

For each day, create 3 posts (one per platform).
Each post should include:
- Platform name
- Topic/title
- Content type (Reel, Video, Post, Thread, etc.)
- Reasoning (why this post now)
- Scroll-stopping hook

Return JSON with: {goal, period, totalPosts, platforms, contentMix, schedule: [{day, date, posts: []}]}
```
3. Set node to format response
4. HTTP Request node to update Supabase job status:
   - URL: `{SUPABASE_URL}/rest/v1/jobs?id=eq.{job_id}`
   - Method: PATCH
   - Headers: `apikey: {SUPABASE_ANON_KEY}`, `Authorization: Bearer {SUPABASE_ANON_KEY}`
   - Body: `{"status": "completed", "result": {{$json}}}`

---

### 4. Trend Lab Deep Dive Workflow

**Purpose**: Deep analysis of specific trends or competitor niches

**Webhook Endpoint**: `/webhook/trend-deep-dive`

**Input Payload** (from `TrendDiscoveryHub.jsx` via `n8nWorkflowAPI.js`):
```json
{
  "trend": "AI-powered productivity tools",
  "niche": "SaaS",
  "platforms": ["Instagram", "TikTok", "X"],
  "brandData": {
    "brandVoice": "Innovative and Educational",
    "targetAudience": "Tech entrepreneurs"
  }
}
```

**Required Output Format**:
```json
{
  "analysis": "Detailed trend analysis with insights, growth indicators, and opportunities...",
  "contentIdeas": [
    {
      "content": "Create a comparison video: AI tools that actually save time vs. ones that don't",
      "platform": "TikTok"
    },
    {
      "content": "Thread breaking down the ROI of AI productivity tools with real numbers",
      "platform": "X"
    },
    {
      "content": "Tutorial Reel: How I use Claude Projects to manage my entire business",
      "platform": "Instagram"
    }
  ],
  "competitorInsights": [
    "Top creators are focusing on practical tutorials over hype",
    "Short-form video outperforming long-form by 3x",
    "UGC-style content generating highest trust"
  ],
  "opportunities": [
    "Gap in content: AI for non-technical founders",
    "Underutilized platform: LinkedIn Carousel posts",
    "Rising search: 'AI productivity stack 2026'"
  ],
  "citations": [
    "https://example.com/trend-report",
    "https://example.com/analysis"
  ]
}
```

**How to Build in Claude/n8n**:
1. Webhook trigger
2. Web scraper node (optional - to fetch live trend data)
3. Claude AI node:
```
You are a trend analysis expert. Deep dive into: {trend}

Niche: {niche}
Platforms: {platforms}
Brand Voice: {brandData.brandVoice}
Target Audience: {brandData.targetAudience}

Provide:
1. Comprehensive trend analysis (200-300 words)
2. 5 platform-specific content ideas (each with platform tag)
3. 3-5 competitor insights (what's working for others)
4. 3-5 opportunities (gaps to exploit)
5. Source citations

Return JSON: {analysis, contentIdeas: [{content, platform}], competitorInsights: [], opportunities: [], citations: []}
```
4. Set node to structure
5. Return response

---

## 🧪 Testing Your Workflows

### Test Each Workflow Individually

1. **Get your webhook URL** from n8n (e.g., `https://your-n8n.com/webhook/viral-blueprint`)
2. **Test with curl**:
```bash
curl -X POST https://your-n8n.com/webhook/viral-blueprint \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "How to go viral on TikTok",
    "platform": "TikTok",
    "format": "Video",
    "goal": "views",
    "audience": "Content creators",
    "brandVoice": "Energetic",
    "identity": "Creator"
  }'
```
3. **Verify response format** matches expected structure
4. **Add webhook URL** to Vercel env vars (e.g., `VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK`)
5. **Redeploy** Vercel app
6. **Test in app** by using the feature

### What Happens Without n8n?

If you skip setting up n8n workflows, your app will **automatically use fallbacks**:

| Feature | Fallback Behavior |
|---------|-------------------|
| Viral Blueprint | Uses `generateMockBlueprint()` with demo templates |
| Content Remix | Uses `generateWithN8n()` fallback (Grok API generic remix) |
| AI Plan Builder | Returns `mockAIPlans` from local data |
| Trend Lab Quick Scan | **Already works** (Perplexity API) |
| Trend Lab Deep Dive | Uses Perplexity API for basic analysis |

**Result**: All features work out-of-the-box, but n8n gives you **custom, sophisticated AI responses** instead of generic fallbacks.

---

## 📊 Priority Recommendation

### Phase 1 (Launch Day - Feb 11)
✅ **No n8n required** - all fallbacks work perfectly  
✅ Test signup → payment → AI tools flow  
✅ Use Grok/Perplexity APIs for core functionality  

### Phase 2 (Week 1 - Feb 12-18)
1. Build **Viral Blueprint** workflow (most requested)
2. Build **Content Remix** workflow (second most used)
3. Deploy and test with real users

### Phase 3 (Week 2 - Feb 19-25)
1. Build **AI Plan Builder** workflow (content calendar)
2. Build **Trend Lab Deep Dive** workflow (competitor analysis)
3. Optimize based on user feedback

---

## 🔍 Checking if Workflows are Configured

The app automatically checks using `isWorkflowConfigured()` from `workflowConstants.js`:

```javascript
import { isWorkflowConfigured, WORKFLOW_NAMES } from '../utils/workflowConstants';

if (isWorkflowConfigured(WORKFLOW_NAMES.VIRAL_BLUEPRINT)) {
  // Use n8n workflow
} else {
  // Use fallback
}
```

**How it works**: Checks if the corresponding `VITE_N8N_*` env var is set and non-empty.

---

## 🚀 Quick Start Summary

### Option A: Launch with Fallbacks (Fastest)
1. ✅ No n8n setup needed
2. ✅ All features work with AI fallbacks
3. ✅ Deploy and test immediately
4. ⏰ Add n8n workflows later to enhance quality

### Option B: Launch with n8n (Best Quality)
1. Create 4 n8n workflows using specs above
2. Add webhook URLs to Vercel env vars
3. Redeploy and test each feature
4. Monitor n8n execution logs for errors

**Recommended**: **Option A** for Feb 11 launch, then add n8n workflows incrementally in weeks 1-2.

---

## 📞 Need Help?

- **n8n Community**: https://community.n8n.io
- **Claude Docs**: https://docs.anthropic.com/claude
- **Check logs**: Look for `[N8N]` prefixed console logs in browser DevTools

Your app is **production-ready right now** with or without n8n! 🎉
