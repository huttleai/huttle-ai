# Huttle AI - Comprehensive Context Documentation

**Last Updated:** January 26, 2026  
**Purpose:** This document serves as the "brain" for AI agents working on Huttle AI, providing 100% accurate information about the codebase, architecture, patterns, and conventions.

**Security Note:** This document has been sanitized to remove sensitive information (API keys, URLs, credentials). All sensitive values are stored in environment variables and should never be committed to version control.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture & Patterns](#architecture--patterns)
5. [State Management](#state-management)
6. [Database Schema](#database-schema)
7. [API Services & Integrations](#api-services--integrations)
8. [Authentication & Authorization](#authentication--authorization)
9. [Subscription & Billing](#subscription--billing)
10. [AI Features & Integrations](#ai-features--integrations)
11. [Configuration & Environment](#configuration--environment)
12. [Development Workflow](#development-workflow)
13. [Key Conventions](#key-conventions)
14. [File Reference Guide](#file-reference-guide)

---

## Project Overview

**Huttle AI** is an AI-powered content creation platform designed for solopreneurs, small business owners, and content creators. The platform helps users create, schedule, and optimize social media content using AI-powered tools.

### Core Value Proposition
- **AI-Powered Content Generation**: Captions, hashtags, hooks, CTAs, and visual ideas
- **Smart Calendar**: AI-optimized scheduling with timezone support
- **Trend Discovery**: Real-time trend scanning and forecasting
- **Content Library**: Centralized repository for all content assets
- **Viral Blueprint**: Step-by-step guides for creating viral content
- **Brand Voice Customization**: All AI features adapt to user's niche/industry

### Target Users
- Solopreneurs
- Small business owners
- Content creators
- Social media managers

---

## Tech Stack

### Frontend
- **React 19.2.1** - UI framework
- **Vite 7.1.7** - Build tool and dev server
- **React Router DOM 6.30.2** - Client-side routing
- **Tailwind CSS 3.4.18** - Utility-first CSS framework
- **Framer Motion 12.24.0** - Animation library
- **Lucide React 0.548.0** - Icon library

### Backend & Services
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication (email/password, magic links)
  - Row Level Security (RLS)
  - Storage (private bucket: `content-library`)
- **Stripe** - Payment processing and subscriptions
- **Vercel** - Hosting and serverless functions

### AI Services
- **xAI Grok API** (`grok-4-1-fast-reasoning`) - Content generation, remixing, scoring
- **Perplexity API** - Trend scanning, research, competitor analysis
- **n8n** (optional) - Workflow automation for advanced features

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Concurrently** - Run multiple dev servers

---

## Project Structure

```
huttle-ai/
├── api/                          # Vercel serverless functions
│   ├── ai/                       # AI API proxies (Grok, Perplexity, n8n)
│   ├── create-checkout-session.js
│   ├── create-portal-session.js
│   ├── stripe-webhook.js
│   ├── subscription-status.js
│   └── ...
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── Sidebar.jsx
│   │   ├── TopHeader.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── magicui/              # Premium UI components
│   │   └── ...
│   ├── pages/                    # Page components (routes)
│   │   ├── Dashboard.jsx
│   │   ├── SmartCalendar.jsx
│   │   ├── ContentLibrary.jsx
│   │   ├── AIPlanBuilder.jsx
│   │   ├── TrendLab.jsx
│   │   ├── ViralBlueprint.jsx
│   │   ├── AITools.jsx
│   │   └── ...
│   ├── context/                  # React Context providers
│   │   ├── AuthContext.jsx
│   │   ├── BrandContext.jsx
│   │   ├── SubscriptionContext.jsx
│   │   ├── ContentContext.jsx
│   │   ├── ToastContext.jsx
│   │   └── NotificationContext.jsx
│   ├── services/                 # API service functions
│   │   ├── grokAPI.js
│   │   ├── perplexityAPI.js
│   │   ├── stripeAPI.js
│   │   ├── n8nAPI.js
│   │   ├── planBuilderAPI.js
│   │   └── ...
│   ├── config/                   # Configuration files
│   │   ├── supabase.js
│   │   └── n8n.js
│   ├── utils/                    # Utility functions
│   │   ├── brandContextBuilder.js
│   │   ├── platformGuidelines.js
│   │   ├── workflowConstants.js
│   │   ├── timezoneHelpers.js
│   │   └── ...
│   ├── hooks/                    # Custom React hooks
│   │   ├── useOfflineDetection.js
│   │   ├── usePostReminders.js
│   │   └── usePreferredPlatforms.js
│   ├── layouts/                  # Layout components
│   │   └── MainLayout.jsx
│   ├── dashboard/                # Dashboard manager
│   │   └── Dashboard.jsx
│   ├── App.jsx                   # Root component with routing
│   ├── LandingPage.jsx           # Public landing page
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
├── docs/                         # Documentation
├── supabase/                     # Database migrations
├── public/                       # Static assets
├── package.json
├── vite.config.js
├── tailwind.config.js
└── .env.example
```

---

## Architecture & Patterns

### Application Flow

1. **Entry Point**: `src/main.jsx` → `src/App.jsx`
2. **Routing**: `App.jsx` handles public routes, `Dashboard.jsx` handles authenticated routes
3. **Context Providers**: Wrapped in `Dashboard.jsx`:
   ```
   AuthProvider → BrandProvider → ToastProvider → NotificationProvider → SubscriptionProvider → ContentProvider
   ```
4. **Protected Routes**: All dashboard routes use `ProtectedRoute` component
5. **Onboarding Gate**: Users must complete onboarding quiz before accessing dashboard

### Key Architectural Patterns

#### 1. **Context-Based State Management**
- Global state managed via React Context API
- No Redux or Zustand - pure Context API
- Contexts are organized by domain (Auth, Brand, Subscription, Content)

#### 2. **Service Layer Pattern**
- All API calls abstracted into service files (`src/services/`)
- Services handle:
  - API communication
  - Error handling
  - Demo mode fallbacks
  - Response transformation

#### 3. **Protected API Proxies**
- Client-side code calls `/api/*` endpoints
- Serverless functions (`api/` folder) proxy to external APIs
- Protects API keys from client exposure

#### 4. **Demo Mode Support**
- `VITE_SKIP_AUTH=true` enables dev mode
- `isDemoMode()` checks for missing API keys
- Falls back to mock data when APIs unavailable

#### 5. **Brand Context Injection**
- All AI prompts include brand context via `brandContextBuilder.js`
- Ensures consistent brand voice across all generations
- Supports both Brand/Business and Creator profile types

---

## State Management

### Context Providers

#### **AuthContext** (`src/context/AuthContext.jsx`)
- **Purpose**: User authentication and profile management
- **State**:
  - `user` - Current authenticated user (from Supabase)
  - `userProfile` - Extended profile from `user_profile` table
  - `needsOnboarding` - Whether user completed onboarding quiz
  - `loading` - Auth initialization state
- **Methods**:
  - `login(email, password)`
  - `signup(email, password, metadata)`
  - `logout()`
  - `updateUser(updates)`
  - `updatePassword(newPassword)`
  - `updateEmail(newEmail)`
  - `completeOnboarding(profileData)`
- **Key Features**:
  - Timeout protection (8 seconds) to prevent infinite loading
  - Handles Resend magic links
  - Checks `user_profile.quiz_completed_at` for onboarding status

#### **BrandContext** (`src/context/BrandContext.jsx`)
- **Purpose**: Brand voice and profile data
- **State**:
  - `brandData` - Brand profile object:
    ```javascript
    {
      profileType: 'brand' | 'creator',
      creatorArchetype: 'educator' | 'entertainer' | 'storyteller' | 'inspirer' | 'curator',
      brandName: string,
      niche: string,
      industry: string,
      targetAudience: string,
      brandVoice: string,
      platforms: string[],
      goals: string[],
      contentStrengths: string[],
      biggestChallenge: string,
      hookStylePreference: string,
      emotionalTriggers: string[]
    }
    ```
- **Methods**:
  - `updateBrandData(newData)` - Updates and saves to Supabase
  - `resetBrandData()` - Clears brand data
  - `refreshBrandData()` - Forces reload from Supabase
- **Storage**: Synced to `user_profile` table and localStorage

#### **SubscriptionContext** (`src/context/SubscriptionContext.jsx`)
- **Purpose**: Subscription tier and feature access
- **State**:
  - `userTier` - Current tier: `'free' | 'essentials' | 'pro'`
  - `usage` - Feature usage tracking object
  - `storageUsage` - Current storage usage in bytes
  - `loading` - Loading state
- **Methods**:
  - `checkFeatureAccess(feature)` - Check if feature available for tier
  - `getFeatureLimit(feature)` - Get usage limit for feature
  - `checkAndTrackUsage(feature, metadata)` - Check limit and track usage
  - `canAccessFeature(featureName)` - Check feature by name
  - `getStorageLimit()` - Get storage limit for tier
  - `canUploadFile(fileSize)` - Check if upload allowed
- **Tiers**:
  - **Free**: 20 AI gens, 250MB storage, 7-day plan builder
  - **Essentials**: 200 AI gens, 5GB storage, 14-day plan builder, Trend Lab
  - **Pro**: 800 AI gens, 25GB storage, unlimited posts, all features

#### **ContentContext** (`src/context/ContentContext.jsx`)
- **Purpose**: Content and scheduled posts management
- **State**:
  - `savedContent` - Saved content items
  - `scheduledPosts` - Scheduled posts array
  - `draftContent` - Current draft being edited
  - `userTimezone` - User's timezone preference
- **Methods**:
  - `createScheduledPost(postData)`
  - `updateScheduledPost(postId, updates)`
  - `deleteScheduledPost(postId)`
  - `loadScheduledPosts()`

#### **ToastContext** (`src/context/ToastContext.jsx`)
- **Purpose**: Toast notifications
- **Methods**:
  - `addToast(message, type)` - Show toast: `'success' | 'error' | 'warning' | 'info'`

#### **NotificationContext** (`src/context/NotificationContext.jsx`)
- **Purpose**: In-app notifications
- **State**: Notification queue

---

## Database Schema

### Core Tables

#### **users** (Supabase Auth)
- Managed by Supabase Auth
- Extended via `user_profile` table

#### **user_profile** (`docs/setup/supabase-user-profile-schema.sql`)
- **Purpose**: Extended user profile and onboarding data
- **Key Columns**:
  - `user_id` (UUID, FK to auth.users)
  - `profile_type` ('brand' | 'creator')
  - `creator_archetype` (for creators)
  - `brand_name`, `niche`, `industry`, `target_audience`
  - `brand_voice_preference`
  - `preferred_platforms` (array)
  - `content_goals` (array)
  - `quiz_completed_at` (timestamp) - **Critical for onboarding gate**
  - `content_strengths`, `biggest_challenge`, `hook_style_preference`, `emotional_triggers` (viral content fields)

#### **subscriptions** (`docs/setup/supabase-stripe-schema.sql`)
- **Purpose**: Stripe subscription tracking
- **Key Columns**:
  - `user_id` (UUID)
  - `stripe_customer_id`, `stripe_subscription_id`
  - `tier` ('free' | 'essentials' | 'pro' | 'founder')
  - `status` ('active' | 'cancelled' | 'past_due')
  - `current_period_end`

#### **content_library** (`docs/setup/supabase-content-library-schema.sql`)
- **Purpose**: User's content assets
- **Key Columns**:
  - `id` (UUID)
  - `user_id` (UUID)
  - `name`, `type` ('text' | 'image' | 'video')
  - `content` (text content)
  - `storage_path` (Supabase Storage path)
  - `size_bytes` (file size)
  - `project_id` (FK to projects)
- **Storage**: Files stored in private Supabase Storage bucket (configured in code)

#### **projects** (`docs/setup/supabase-projects-schema.sql`)
- **Purpose**: Content organization
- **Key Columns**:
  - `id` (UUID)
  - `user_id` (UUID)
  - `name`, `description`, `color`

#### **scheduled_posts** (`docs/setup/supabase-scheduled-posts-schema.sql`)
- **Purpose**: Calendar scheduled posts
- **Key Columns**:
  - `id` (UUID)
  - `user_id` (UUID)
  - `title`, `caption`, `hashtags`, `keywords`
  - `platforms` (array)
  - `content_type` ('Text Post' | 'Image Post' | 'Video' | 'Story' | 'Reel' | 'Carousel')
  - `scheduled_for` (timestamp with timezone)
  - `timezone` (user's timezone)
  - `status` ('draft' | 'scheduled' | 'ready' | 'posting' | 'posted' | 'failed' | 'cancelled')
  - `media_urls` (JSONB)
  - `posted_at` (timestamp)

#### **user_activity** (`docs/setup/SUPABASE-N8N-SETUP.md`)
- **Purpose**: Feature usage tracking
- **Key Columns**:
  - `user_id` (UUID)
  - `feature` (feature name)
  - `metadata` (JSONB)
  - `created_at`

#### **trend_forecasts** (`docs/setup/SUPABASE-N8N-SETUP.md`)
- **Purpose**: Cached trend forecasts
- **Key Columns**:
  - `user_id` (UUID)
  - `niche` (string)
  - `forecast_data` (JSONB)
  - `expires_at` (24-hour TTL)

#### **social_updates** (`docs/setup/supabase-social-updates-schema.sql`)
- **Purpose**: Platform update announcements
- **Key Columns**:
  - `date_month` (YYYY-MM format)
  - `platform` (string)
  - `update_type` (string)
  - `title`, `description`, `impact`

#### **jobs** (`docs/setup/supabase-jobs-schema.sql`)
- **Purpose**: Async job tracking (Plan Builder, etc.)
- **Key Columns**:
  - `id` (UUID)
  - `user_id` (UUID)
  - `job_type` ('plan_builder' | 'trend_forecast' | etc.)
  - `status` ('pending' | 'processing' | 'completed' | 'failed')
  - `result` (JSONB)

### Row Level Security (RLS)

**Critical Pattern**: All RLS policies use optimized pattern:
```sql
(select auth.uid()) = user_id
```

**NOT**:
```sql
auth.uid() = user_id  -- ❌ Slower, not recommended
```

All user-scoped queries MUST include `.eq('user_id', userId)` for RLS to work correctly.

---

## API Services & Integrations

### Service Files (`src/services/`)

#### **grokAPI.js**
- **Purpose**: xAI Grok API integration (content generation)
- **Model**: Configured Grok model (see service file)
- **Proxy**: Uses serverless function proxy (protects API key)
- **Functions**:
  - `generateCaption(contentData, brandData)`
  - `generateHashtags(input, brandData, platform)`
  - `generateHooks(input, brandData, theme, platform)`
  - `generateCTAs(goal, brandData, platform)`
  - `scoreContentQuality(content, brandData)`
  - `generateVisualIdeas(prompt, brandData, platform)`
  - `remixContentWithMode(content, brandData, mode)` - 'viral' or 'sales'
  - `polishVoiceTranscript(transcript, brandData, platform)`
  - `generateCaptionVariations(originalCaption, brandData, count)`
- **Demo Mode**: Returns mock data when `VITE_DEMO_MODE=true` or API fails
- **Brand Context**: All functions inject brand context via `brandContextBuilder.js`

#### **perplexityAPI.js**
- **Purpose**: Perplexity API integration (trend scanning, research)
- **Proxy**: Uses serverless function proxy (protects API key)
- **Functions**:
  - `scanTrends(niche, platforms)`
  - `getTrendDetails(trendTopic)`
  - `analyzeCompetitors(niche)`
  - `forecastTrends(niche, timeframe)`

#### **stripeAPI.js**
- **Purpose**: Stripe subscription management
- **Functions**:
  - `createCheckoutSession(planId, billingCycle)`
  - `createPortalSession()` - Opens Stripe Customer Portal
  - `getSubscriptionStatus()`
  - `isDemoMode()` - Checks if Stripe configured
- **Plans**: Defined in `SUBSCRIPTION_PLANS` constant
- **Demo Mode**: Simulates checkout when Stripe not configured

#### **planBuilderAPI.js**
- **Purpose**: AI Plan Builder (7-14 day content calendars)
- **Uses**: n8n workflow OR in-code Grok API fallback
- **Functions**:
  - `generatePlan(userId, brandData, days, goals)`
  - `getJobStatus(jobId)`

#### **n8nWorkflowAPI.js**
- **Purpose**: n8n workflow-based features
- **Workflows** (from `workflowConstants.js`):
  - `dashboard-trending` - Trending Now widget
  - `dashboard-hashtags` - Hashtags of the Day
  - `ai-plan-builder` - Content calendar generation
  - `trend-deep-dive` - Comprehensive trend analysis
  - `trend-forecaster` - 7-day trend predictions
  - `viral-blueprint` - Viral content blueprints
  - `social-updates` - Platform update feed

#### **n8nAPI.js** / **n8nGeneratorAPI.js**
- **Purpose**: Legacy n8n integrations (optional)
- **Note**: n8n is NOT used for posting to social media (uses deep linking instead)

### Serverless Functions (`api/`)

#### **AI Proxies** (`api/ai/`)
- `grok.js` - Grok API proxy (protects API key)
- `perplexity.js` - Perplexity API proxy
- `n8n-generator.js` - n8n generator proxy

#### **Stripe Functions**
- `create-checkout-session.js` - Creates Stripe Checkout session
- `create-portal-session.js` - Creates Stripe Customer Portal session
- `stripe-webhook.js` - Handles Stripe webhook events:
  - Processes subscription lifecycle events
  - Updates subscription status in database
  - Handles cancellations and plan changes
  - Optional integrations (configured via environment variables)

#### **Other Functions**
- `subscription-status.js` - Gets current subscription status
- `create-plan-builder-job.js` - Creates async Plan Builder job
- `get-job-status.js` - Gets job status
- `update-social-media.js` - Updates social media data (biweekly cron)

---

## Authentication & Authorization

### Authentication Flow

1. **Sign Up**: `signup(email, password)` → Supabase Auth
2. **Email Confirmation**: Supabase sends confirmation email (if enabled)
3. **Login**: `login(email, password)` → Supabase Auth
4. **Magic Links**: Supported via email provider (configured in Supabase)
5. **Session Management**: Handled by Supabase Auth SDK

### Onboarding Gate

**Critical**: Users MUST complete onboarding quiz before accessing dashboard.

**Check**: `user_profile.quiz_completed_at` must be set
- If `null` or missing → Redirect to `OnboardingQuiz` component
- If set → Allow dashboard access

**Implementation**: `Dashboard.jsx` checks `needsOnboarding` from `AuthContext`

### Protected Routes

All dashboard routes use `ProtectedRoute` component:
```jsx
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
```

**Behavior**:
- If not authenticated → Redirect to `/dashboard/login`
- If authenticated but needs onboarding → Show `OnboardingQuiz`
- If authenticated and onboarded → Show route content

### Dev Mode Bypass

**Environment Variable**: `VITE_SKIP_AUTH=true` (dev only)
- Creates mock user for testing
- Skips Supabase auth checks
- Allows testing without real authentication
- **Note**: Never use in production

---

## Subscription & Billing

### Subscription Tiers

Defined in `src/config/supabase.js` → `TIER_LIMITS`:

#### **Free** (`TIERS.FREE`)
- 20 AI generations/month
- 250MB storage
- 7-day AI Plan Builder
- Basic AI Power Tools (Captions, Hashtags, Hooks, CTAs, Scorer, Visuals)
- **No**: Trend Lab, Viral Blueprint, Content Repurposer, Huttle Agent, Trend Forecaster

#### **Essentials** (`TIERS.ESSENTIALS`)
- 200 AI generations/month
- 5GB storage
- 7 or 14-day AI Plan Builder
- **Full Trend Lab access**
- 15 Viral Blueprints/month
- **No**: Content Repurposer, Huttle Agent, Trend Forecaster

#### **Pro** (`TIERS.PRO`)
- 800 AI generations/month
- 25GB storage
- Unlimited scheduled posts
- 60 Viral Blueprints/month
- **All features**: Content Repurposer, Huttle Agent, Trend Forecaster

### Stripe Integration

#### **Price IDs** (Environment Variables)
- Price IDs are configured via environment variables
- See `.env.example` for variable names
- Price IDs are Stripe product identifiers (safe to expose client-side)

#### **Checkout Flow**
1. User selects plan → `createCheckoutSession(planId, billingCycle)`
2. Redirects to Stripe Checkout
3. After payment → Stripe webhook → Updates `subscriptions` table
4. `SubscriptionContext` syncs tier from database

#### **Customer Portal**
- `createPortalSession()` → Opens Stripe Customer Portal
- Users can:
  - Update payment method
  - View invoices
  - Cancel subscription
  - Change plan

### Usage Tracking

**Table**: `user_activity`
- Tracks feature usage per user
- Monthly limits reset automatically
- Used by `checkAndTrackUsage()` to enforce limits

**Usage Warnings**:
- 80% usage → Info toast
- 90% usage → Warning toast
- 95% usage → Urgent warning toast

---

## AI Features & Integrations

### Feature Categories

#### **Workflow-Based Features** (n8n)
- Dashboard Trending Now
- Dashboard Hashtags of the Day
- AI Plan Builder (optional)
- Trend Discovery Deep Dive (optional)
- Trend Forecaster (optional)
- Viral Blueprint (optional)
- Social Updates Feed (optional)

**Configuration**: Set environment variables (see `workflowConstants.js`)

#### **In-Code Features** (Direct API)
- AI Insights (Grok)
- Daily Alerts (Grok)
- Templates (Grok)
- Smart Scheduling (Grok)
- AI Power Tools (Grok):
  - Caption Generator
  - Hashtag Generator
  - Hook Builder
  - CTA Suggester
  - Quality Scorer
  - Visual Brainstormer
- Trend Discovery Quick Scan (Grok + Perplexity)
- Audience Insight Engine (Perplexity)
- Content Remix Studio (Grok)

### Brand Context Injection

**File**: `src/utils/brandContextBuilder.js`

All AI prompts include brand context:
- Profile type (Brand vs Creator)
- Creator archetype (if creator)
- Niche, industry, target audience
- Brand voice preference
- Preferred platforms
- Content goals
- Viral content strategy (strengths, challenges, hook style, emotional triggers)

**Usage**:
```javascript
import { buildSystemPrompt } from '../utils/brandContextBuilder';

const systemPrompt = buildSystemPrompt(
  'You are a content creator assistant...',
  brandData
);
```

### Platform-Specific Optimization

**File**: `src/utils/platformGuidelines.js`

Provides platform-specific guidelines for:
- Character limits
- Hashtag counts and styles
- Hook styles
- CTA styles
- Content formats

**Supported Platforms**:
- Instagram
- TikTok
- X (Twitter)
- Facebook
- YouTube

---

## Configuration & Environment

### Environment Variables

#### **Client-Side** (VITE_ prefix)
**Note**: See `.env.example` for complete list. Key variables include:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (safe to expose)
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (safe to expose)
- `VITE_STRIPE_PRICE_*` - Stripe price IDs for subscription tiers
- `VITE_N8N_*_WEBHOOK` - n8n workflow webhook URLs (optional)
- `VITE_SKIP_AUTH` - Dev mode flag (dev only, never production)
- `VITE_DEMO_MODE` - Demo mode flag (dev only)

**Security Note**: Client-side variables are exposed in the browser. Only use `VITE_` prefix for values safe to expose publicly.

#### **Server-Side** (No VITE_ prefix - Vercel Functions)
**Note**: Server-side variables are kept secure and never exposed to client. Key variables include:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin access)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `STRIPE_PRICE_*` - Stripe price IDs
- `PERPLEXITY_API_KEY` - Perplexity API key (server-side only)
- `MAILCHIMP_*` - Mailchimp configuration (optional)

**Security Note**: Never expose server-side variables in client code. Use serverless function proxies.

### Tailwind Configuration

**File**: `tailwind.config.js`

**Brand Colors**:
- Primary: `#01bad2` (cyan)
- Primary Dark: `#00ACC1`
- Primary Light: `#E0F7FA`
- Blue: `#2B8FC7`
- Full scale: `huttle-50` through `huttle-900`

**Custom Animations**:
- `fadeIn`, `slideUp`, `slideDown`, `scaleIn`, `pulse`, `shimmer`

**Custom Shadows**:
- `subtle`, `soft`, `medium`, `elevated`, `card`, `card-hover`

### Vite Configuration

**File**: `vite.config.js`

- **Port**: Configured in vite.config.js (default Vite port)
- **Proxy**: `/api` routes proxy to local API server during development
- **HMR**: Hot Module Replacement enabled with overlay

---

## Development Workflow

### Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start Dev Server**:
   ```bash
   npm run dev
   # Frontend runs on default Vite port
   ```

4. **Start Local API Server** (optional):
   ```bash
   npm run dev:api
   # API server runs on configured port
   ```

### Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run dev:local` - Start both frontend and API server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run clean` - Clean Vite cache
- `npm run fresh` - Clean cache and restart dev server

### Database Setup

1. **Run SQL Schemas** (in Supabase SQL Editor):
   - `docs/setup/supabase-user-profile-schema.sql`
   - `docs/setup/supabase-stripe-schema.sql`
   - `docs/setup/supabase-content-library-schema.sql`
   - `docs/setup/supabase-scheduled-posts-schema.sql`
   - `docs/setup/supabase-projects-schema.sql`
   - `docs/setup/supabase-social-updates-schema.sql`
   - `docs/setup/SUPABASE-RLS-PERFORMANCE-FIX.sql` (RLS policies)

2. **Storage Setup**:
   - Create storage bucket (name configured in code)
   - Set to **private** (never public)
   - Configure RLS policies for secure access

3. **Verify Setup**:
   - Run `verify-database-schema.sql` to check tables exist

### Testing

#### **Dev Mode Testing**
- Set `VITE_SKIP_AUTH=true` → Bypasses authentication
- Set `VITE_DEMO_MODE=true` → Uses mock data
- Useful for UI testing without API keys

#### **Demo Mode** (Stripe)
- If Stripe price IDs missing → Automatically uses demo mode
- Checkout simulated via localStorage
- Tier can be changed via `setDemoTier()` in SubscriptionContext

---

## Key Conventions

### Code Style

#### **Naming Conventions**
- **Components**: PascalCase (`Dashboard.jsx`, `Sidebar.jsx`)
- **Functions**: camelCase (`getUserTier`, `createScheduledPost`)
- **Constants**: UPPER_SNAKE_CASE (`TIERS.FREE`, `WORKFLOW_NAMES`)
- **Files**: camelCase for utilities, PascalCase for components

#### **React Patterns**
- **Functional Components**: Always use function components (no classes)
- **Hooks**: Use hooks for state and side effects
- **Context**: Prefer Context API over prop drilling
- **Error Handling**: Always check `error` before accessing `data` in Supabase queries

#### **Supabase Patterns**

**RLS Performance**:
```javascript
// ✅ CORRECT - Fast RLS check
.eq('user_id', userId)

// ❌ WRONG - Slower, not recommended
.eq('user_id', (select auth.uid()))
```

**Error Handling**:
```javascript
// ✅ CORRECT - Handle PGRST116 gracefully
const { data, error } = await supabase.from('table').select().single();
if (error) {
  if (error.code === 'PGRST116') {
    // No rows found - this is OK, not an error
    return { success: true, data: null };
  }
  throw error;
}

// ✅ CORRECT - Use maybeSingle() for optional rows
const { data, error } = await supabase
  .from('user_profile')
  .select()
  .eq('user_id', userId)
  .maybeSingle(); // Returns null if no row, doesn't throw
```

**Timeout Protection**:
```javascript
// ✅ CORRECT - Add timeout to prevent hanging queries
const QUERY_TIMEOUT_MS = 10000;
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Query timed out')), QUERY_TIMEOUT_MS);
});

const { data, error } = await Promise.race([
  supabase.from('table').select(),
  timeoutPromise
]);
```

#### **API Error Handling**
- Always check `response.ok` before parsing JSON
- Provide fallback mock data when APIs unavailable
- Log errors to console for debugging
- Show user-friendly error messages via Toast

#### **Brand Context**
- Always pass `brandData` to AI functions
- Use `buildSystemPrompt()` or `buildBrandContext()` utilities
- Include platform-specific guidelines when generating content

### File Organization

#### **Components**
- One component per file
- Co-locate related components in subdirectories
- Export default for page components, named exports for utilities

#### **Services**
- One service per external API
- Group related functions in same file
- Export individual functions (not default export)

#### **Utils**
- Pure functions only (no side effects)
- Well-documented with JSDoc
- Testable and reusable

---

## File Reference Guide

### Critical Files

#### **Configuration**
- `src/config/supabase.js` - Supabase client and helpers
- `src/config/n8n.js` - n8n workflow configuration
- `tailwind.config.js` - Tailwind theme and customizations
- `vite.config.js` - Vite build configuration

#### **Context Providers**
- `src/context/AuthContext.jsx` - Authentication state
- `src/context/BrandContext.jsx` - Brand profile state
- `src/context/SubscriptionContext.jsx` - Subscription and feature access
- `src/context/ContentContext.jsx` - Content and scheduled posts
- `src/context/ToastContext.jsx` - Toast notifications

#### **Services**
- `src/services/grokAPI.js` - Grok API integration
- `src/services/perplexityAPI.js` - Perplexity API integration
- `src/services/stripeAPI.js` - Stripe integration
- `src/services/planBuilderAPI.js` - Plan Builder API
- `src/services/n8nWorkflowAPI.js` - n8n workflow API

#### **Utilities**
- `src/utils/brandContextBuilder.js` - Brand context injection
- `src/utils/platformGuidelines.js` - Platform-specific guidelines
- `src/utils/workflowConstants.js` - n8n workflow configuration
- `src/utils/timezoneHelpers.js` - Timezone utilities

#### **Components**
- `src/components/ProtectedRoute.jsx` - Route protection
- `src/components/Sidebar.jsx` - Main navigation
- `src/components/TopHeader.jsx` - Top header bar
- `src/components/OnboardingQuiz.jsx` - Onboarding flow

#### **Pages**
- `src/pages/Dashboard.jsx` - Main dashboard
- `src/pages/SmartCalendar.jsx` - Calendar view
- `src/pages/ContentLibrary.jsx` - Content library
- `src/pages/AIPlanBuilder.jsx` - Plan builder
- `src/pages/TrendLab.jsx` - Trend discovery
- `src/pages/ViralBlueprint.jsx` - Viral blueprint generator
- `src/pages/AITools.jsx` - AI Power Tools
- `src/pages/BrandVoice.jsx` - Brand voice setup
- `src/pages/Subscription.jsx` - Subscription management

#### **Routing**
- `src/App.jsx` - Root routing (public routes)
- `src/dashboard/Dashboard.jsx` - Dashboard routing (authenticated routes)

#### **Serverless Functions**
- `api/stripe-webhook.js` - Stripe webhook handler
- `api/create-checkout-session.js` - Stripe checkout
- `api/create-portal-session.js` - Stripe portal
- `api/ai/grok.js` - Grok API proxy
- `api/ai/perplexity.js` - Perplexity API proxy

### Documentation Files

- `docs/setup/` - Setup guides and SQL schemas
- `README.md` - Quick start guide
- `.env.example` - Environment variable template

---

## Important Notes

### Security

1. **API Keys**: Never expose API keys in client-side code
   - Use serverless function proxies (`api/` folder)
   - Only use `VITE_` prefix for safe-to-expose keys (Stripe publishable key)

2. **RLS Policies**: Always enforce RLS on Supabase tables
   - Use optimized pattern: `(select auth.uid()) = user_id`
   - Test RLS policies thoroughly

3. **Authentication**: Always check authentication before sensitive operations
   - Use `ProtectedRoute` for routes
   - Check `user` in Context before API calls

### Performance

1. **Query Timeouts**: Add timeout protection to prevent hanging queries
   - Default: 8-10 seconds
   - Use `Promise.race()` pattern

2. **Storage Limits**: Always check storage limits before uploads
   - Use `checkStorageLimit()` helper
   - Show user-friendly error messages

3. **Usage Tracking**: Track feature usage to enforce limits
   - Use `checkAndTrackUsage()` helper
   - Show warnings at 80%, 90%, 95% usage

### Error Handling

1. **Supabase Errors**: Handle `PGRST116` gracefully (no rows found is OK)
2. **API Errors**: Provide fallback mock data when APIs unavailable
3. **User Feedback**: Always show user-friendly error messages via Toast

### Demo Mode

- **Purpose**: Allows testing without API keys
- **Activation**: Set `VITE_SKIP_AUTH=true` or `VITE_DEMO_MODE=true`
- **Behavior**: Uses mock data, bypasses authentication
- **Limitation**: Dev mode only, never in production

---

## Quick Reference

### Check Feature Access
```javascript
const { canAccessFeature } = useSubscription();
if (canAccessFeature('trend-lab')) {
  // Feature available
}
```

### Get Brand Data
```javascript
const { brandData } = useBrand();
// Use brandData in AI prompts
```

### Track Usage
```javascript
const { checkAndTrackUsage } = useSubscription();
const result = await checkAndTrackUsage('ai-generations', { type: 'caption' });
if (!result.allowed) {
  // Show upgrade message
}
```

### Create Scheduled Post
```javascript
const { createScheduledPost } = useContent();
await createScheduledPost({
  title: 'Post Title',
  caption: 'Post caption...',
  platforms: ['instagram'],
  scheduledDate: 'YYYY-MM-DD',
  scheduledTime: 'HH:MM',
  timezone: 'America/New_York' // User's timezone
});
```

### Generate AI Content
```javascript
import { generateCaption } from '../services/grokAPI';
const { brandData } = useBrand();

const result = await generateCaption(
  { topic: 'Fitness tips', platform: 'instagram' },
  brandData
);
```

---

## Security Reminders

### What This Document Does NOT Contain
- ❌ Actual API keys or secrets
- ❌ Database connection strings
- ❌ Service account credentials
- ❌ Webhook URLs or signing secrets
- ❌ Specific infrastructure URLs
- ❌ Email addresses or user identifiers
- ❌ Port numbers or localhost references

### What This Document DOES Contain
- ✅ Architecture patterns and structure
- ✅ Code patterns and conventions
- ✅ Configuration variable names (not values)
- ✅ General setup instructions
- ✅ File organization and structure
- ✅ Best practices and conventions

### Important Security Practices
1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use environment variables** - Store all secrets in environment variables
3. **Server-side only** - Keep secret keys in serverless functions, never client-side
4. **RLS policies** - Always enforce Row Level Security on database tables
5. **API proxies** - Use serverless function proxies to protect API keys
6. **Regular audits** - Review environment variables and access controls regularly

---

**End of Context Documentation**

This document is maintained to reflect the current state of the codebase. When making significant changes, update this document accordingly.

**Last Security Review**: January 26, 2026 - Document sanitized for safe use with open-source tools.
