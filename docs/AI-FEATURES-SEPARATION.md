# AI Features Separation Guide

This document provides a clear overview of how AI features are implemented in Huttle AI, distinguishing between in-code API calls and n8n workflow integrations.

## Quick Reference

| Feature | Implementation | API/Service | Status |
|---------|---------------|-------------|--------|
| AI Insights | In-Code | Grok API | Active |
| Daily Alerts | In-Code | Grok API | Active |
| Templates | In-Code | Grok API | Active |
| Smart Scheduling | In-Code | Grok API | Active |
| AI Power Tools | In-Code | Grok API | Active |
| Trend Quick Scan | In-Code | Grok + Perplexity | Active |
| Audience Insight Engine | In-Code | Perplexity API | Active |
| Content Remix Studio | In-Code | n8n Generator | Active |
| Dashboard Trending | N8N Workflow | Workflow | Pending |
| Dashboard Hashtags | N8N Workflow | Workflow | Pending |
| AI Plan Builder | N8N Workflow | Workflow | Pending |
| Trend Deep Dive | N8N Workflow | Workflow | Pending |
| Trend Forecaster | N8N Workflow | Workflow | Pending |
| Viral Blueprint | N8N Workflow | Workflow | Pending |
| Social Updates | N8N Workflow | Workflow | Pending |

---

## In-Code AI Features (Grok/Perplexity APIs)

These features call AI APIs directly from the frontend via secure server-side proxies. They are designed for real-time, interactive use cases.

### Grok API Features (`src/services/grokAPI.js`)

#### 1. AI Insights (Dashboard)
- **Location:** `src/pages/Dashboard.jsx`
- **Description:** Smart recommendations based on user's content patterns
- **API Function:** Direct Grok API call
- **Why In-Code:** Real-time, personalized insights that need immediate response

#### 2. Daily Alerts (Dashboard)
- **Location:** `src/pages/Dashboard.jsx`
- **Description:** Important notifications about trends and engagement
- **API Function:** Direct Grok API call
- **Why In-Code:** Time-sensitive alerts that need instant generation

#### 3. Templates
- **Location:** Various components
- **Description:** Content template generation
- **API Function:** `grokAPI.generateCaption()` and similar
- **Why In-Code:** Quick template generation for immediate use

#### 4. Smart Scheduling
- **Location:** `src/pages/SmartCalendar.jsx`
- **Description:** Optimal posting time suggestions
- **API Function:** Direct Grok API analysis
- **Why In-Code:** Needs real-time analysis of user's schedule

#### 5. AI Power Tools
- **Location:** `src/pages/AITools.jsx`
- **Description:** Suite of content generation tools
- **API Functions:**
  - `generateCaption()` - Social media captions
  - `generateHashtags()` - Relevant hashtags
  - `generateHooks()` - Attention-grabbing hooks
  - `generateCTAs()` - Call-to-action suggestions
  - `scoreContentQuality()` - Content quality scoring
  - Visual suggestions
- **Why In-Code:** Interactive tools that need immediate feedback

#### 6. Trend Discovery - Quick Scan
- **Location:** `src/components/TrendDiscoveryHub.jsx`
- **Description:** Quick trend scanning and discovery
- **API Function:** Combined Grok + Perplexity calls
- **Why In-Code:** Fast, lightweight trend checks

### Perplexity API Features (`src/services/perplexityAPI.js`)

#### 7. Audience Insight Engine
- **Location:** `src/pages/TrendLab.jsx`
- **Description:** Deep audience demographics and preferences analysis
- **API Function:** `getAudienceInsights()`
- **Why In-Code:** Real-time research with web search capabilities

### Existing N8N Generator (`src/services/n8nGeneratorAPI.js`)

#### 8. Content Remix Studio
- **Location:** `src/pages/TrendLab.jsx`
- **Description:** Remix content for viral/sales modes
- **API Function:** `generateWithN8n()`
- **Why In-Code:** Already uses n8n but via the existing generator webhook, not the new workflow system

---

## N8N Workflow Features (Future)

These features will be powered by n8n workflows. They are designed for complex, multi-step AI operations that benefit from workflow orchestration.

### Service Layer: `src/services/n8nWorkflowAPI.js`

#### 1. Dashboard - Trending Now
- **Location:** `src/pages/Dashboard.jsx`
- **Workflow:** `WORKFLOW_NAMES.DASHBOARD_TRENDING`
- **API Function:** `getTrendingNow()`
- **Why Workflow:** Aggregates data from multiple trend sources
- **Current Fallback:** Mock data from `mockData.js`

#### 2. Dashboard - Hashtags of the Day
- **Location:** `src/pages/Dashboard.jsx`
- **Workflow:** `WORKFLOW_NAMES.DASHBOARD_HASHTAGS`
- **API Function:** `getHashtagsOfDay()`
- **Why Workflow:** Requires hashtag analytics from multiple platforms
- **Current Fallback:** Industry-based hashtags from brand profile

#### 3. AI Plan Builder
- **Location:** `src/pages/AIPlanBuilder.jsx`
- **Workflow:** `WORKFLOW_NAMES.AI_PLAN_BUILDER`
- **API Function:** `generateAIPlan()`
- **Why Workflow:** Complex multi-day content calendar generation
- **Current Fallback:** Job-based system via `planBuilderAPI.js`

#### 4. Trend Discovery - Deep Dive
- **Location:** `src/components/TrendDiscoveryHub.jsx`
- **Workflow:** `WORKFLOW_NAMES.TREND_DEEP_DIVE`
- **API Function:** `getTrendDeepDive()`
- **Why Workflow:** Comprehensive research across multiple sources
- **Current Fallback:** Basic Perplexity search

#### 5. Trend Forecaster
- **Location:** `src/pages/TrendLab.jsx`
- **Workflow:** `WORKFLOW_NAMES.TREND_FORECASTER`
- **API Function:** `getTrendForecast()`
- **Why Workflow:** Predictive analysis requiring multiple data sources
- **Current Fallback:** Perplexity + Grok combined analysis

#### 6. Viral Blueprint
- **Location:** `src/pages/ViralBlueprint.jsx`
- **Workflow:** `WORKFLOW_NAMES.VIRAL_BLUEPRINT`
- **API Function:** `generateViralBlueprint()`
- **Why Workflow:** Complex blueprint generation with SEO analysis
- **Current Fallback:** Mock blueprint generator

#### 7. Social Updates
- **Location:** `src/pages/SocialUpdates.jsx`
- **Workflow:** `WORKFLOW_NAMES.SOCIAL_UPDATES`
- **API Function:** `getSocialUpdates()`
- **Why Workflow:** Scraping and parsing platform announcements
- **Current Fallback:** Supabase `social_updates` table, then static data

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │     IN-CODE AI FEATURES     │    │      N8N WORKFLOW FEATURES          │ │
│  │                             │    │                                     │ │
│  │  • AI Insights              │    │  • Dashboard Trending    [PENDING]  │ │
│  │  • Daily Alerts             │    │  • Dashboard Hashtags    [PENDING]  │ │
│  │  • Templates                │    │  • AI Plan Builder       [PENDING]  │ │
│  │  • Smart Scheduling         │    │  • Trend Deep Dive       [PENDING]  │ │
│  │  • AI Power Tools           │    │  • Trend Forecaster      [PENDING]  │ │
│  │  • Trend Quick Scan         │    │  • Viral Blueprint       [PENDING]  │ │
│  │  • Audience Engine          │    │  • Social Updates        [PENDING]  │ │
│  │  • Content Remix            │    │                                     │ │
│  │                             │    │                                     │ │
│  └──────────────┬──────────────┘    └─────────────────┬───────────────────┘ │
│                 │                                      │                     │
└─────────────────┼──────────────────────────────────────┼─────────────────────┘
                  │                                      │
                  ▼                                      ▼
┌─────────────────────────────────┐    ┌─────────────────────────────────────┐
│    Vercel Serverless Functions   │    │         N8N Instance                │
│                                  │    │                                     │
│  /api/ai/grok.js                 │    │  /webhook/dashboard-trending        │
│  /api/ai/perplexity.js           │    │  /webhook/dashboard-hashtags        │
│  /api/ai/n8n-generator.js        │    │  /webhook/ai-plan-builder           │
│                                  │    │  /webhook/trend-deep-dive           │
└──────────────┬───────────────────┘    │  /webhook/trend-forecaster          │
               │                        │  /webhook/viral-blueprint           │
               ▼                        │  /webhook/social-updates            │
┌─────────────────────────────────┐    │                                     │
│        External APIs             │    └─────────────────────────────────────┘
│                                  │
│  • Grok API (xAI)                │
│  • Perplexity API                │
│                                  │
└──────────────────────────────────┘
```

---

## File Reference

### In-Code AI Services
- `src/services/grokAPI.js` - Grok API wrapper
- `src/services/perplexityAPI.js` - Perplexity API wrapper
- `src/services/n8nGeneratorAPI.js` - Existing n8n generator (Content Remix)

### N8N Workflow Services
- `src/services/n8nWorkflowAPI.js` - New workflow service layer
- `src/utils/workflowConstants.js` - Workflow configuration constants

### Configuration
- `src/config/n8n.js` - N8N configuration and helpers

### Server-Side Proxies
- `api/ai/grok.js` - Grok API proxy
- `api/ai/perplexity.js` - Perplexity API proxy
- `api/ai/n8n-generator.js` - N8N generator proxy

### Documentation
- `docs/n8n/N8N-WORKFLOW-FEATURES.md` - Workflow specifications
- `docs/guides/N8N-INTEGRATION-GUIDE.md` - Integration guide

---

## Implementation Status

### Active (In-Code)
All in-code features are fully functional using Grok and Perplexity APIs.

### Pending (N8N Workflows)
Workflow features are prepared with:
- Stub functions in `n8nWorkflowAPI.js`
- TODO markers in component files
- Fallback logic to existing implementations
- Documentation of expected payloads

### To Activate Workflows
1. Build the n8n workflow
2. Set the environment variable (e.g., `VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK`)
3. The frontend will automatically detect and use the workflow
4. Fallback logic handles workflow failures gracefully

---

## Decision Criteria

### When to Use In-Code AI
- Real-time, interactive features
- Simple, single-step AI operations
- Features requiring immediate response
- User-facing tools with instant feedback

### When to Use N8N Workflows
- Complex, multi-step operations
- Features requiring data from multiple sources
- Scheduled or batch operations
- Features benefiting from workflow orchestration
- Operations that may need human review/approval

---

## Migration Notes

When migrating a feature from in-code to workflow:

1. **Keep the fallback** - Don't remove existing implementation
2. **Add workflow check** - Use `isWorkflowConfigured()` first
3. **Handle errors** - Fall back gracefully if workflow fails
4. **Log clearly** - Use `[N8N_WORKFLOW]` prefix for debugging
5. **Test both paths** - Verify fallback still works







