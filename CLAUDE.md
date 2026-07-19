# Huttle AI — Claude Code Context

## Project Overview
AI-powered content creation SaaS for solopreneurs, small businesses, and creators. Solo founder project. React + Vite frontend with Supabase backend, Vercel serverless functions, and multiple AI API integrations.

## Tech Stack

- **Frontend:** React 19 (Vite), Tailwind CSS 3.4, React Router DOM 6, Framer Motion, Lucide React
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime), Vercel Functions (Node.js, NOT Edge)
- **Local dev API:** Express via `server/local-api-server.js`
- **AI APIs:** Anthropic Claude (`claude-sonnet-5`), Grok/xAI (`grok-4.1-fast-reasoning`), Perplexity (`llama-3.1-sonar-small-128k-online`)
- **Payments:** Stripe (subscriptions + Customer Portal), webhook at `api/stripe-webhook.js`
- **Email:** Resend (transactional), Mailchimp (marketing)
- **Automation:** n8n (`huttleai.app.n8n.cloud`)
- **JavaScript only** — no TypeScript

## Commands

```bash
npm run dev          # Start frontend (Vite)
node server/local-api-server.js  # Start local API server (separate terminal)
npm run build        # Production build
npm run preview      # Preview production build
npx playwright test  # E2E tests
npm run qa:ai-tools  # AI output validators
npm run qa:reliability
```

**Supabase migrations:** Use `apply_migration` MCP tool (never raw `execute_sql` for DDL — must be auditable).

## API Proxies (Vercel Functions)
All AI calls go through server-side proxies — never call AI APIs directly from the client:
- `api/ai/grok.js`
- `api/ai/perplexity.js`
- `api/ai/claude.js`
- `api/ai/n8n-generator.js`

## Key File Paths

| Area | Path |
|------|------|
| Stripe webhook | `api/stripe-webhook.js` |
| Checkout session | `api/create-checkout-session.js` |
| Subscription status | `api/subscription-status.js` |
| Tier limits (source of truth) | `TIER_LIMITS` constant (`src/config/supabase.js`), sourced from `src/config/creditConfig.js` |
| Algorithm checker (rules-based) | `src/data/algorithmSignals.js` |
| Platform guidelines | `src/utils/platformGuidelines.js` |
| Brand context | `src/utils/getBrandStoryContext.js` |
| AI JSON parsing | `src/utils/parseAiJson.js` |

## Supabase Key Tables
`users`, `subscriptions`, `profiles`, `user_preferences`, `jobs`, `content_library`, `post_kits`, `post_kit_slots`, `daily_dashboard_cache`, `niche_content_cache`, `cancellation_feedback`, `dm_leads`

## Subscription Tiers
- **Essentials:** $15/mo, 200 credits
- **Pro:** $39/mo, 600 credits
- **Founders Club:** Locked — existing members only, permanently retained

## Coding Conventions

- **JavaScript only** — no TypeScript, no type annotations
- **No default exports** — named exports only
- **No `console.log` left in production code** — remove before committing
- **No em-dashes or hyphens in copy** — use ellipses for conversational separation
- **Framing:** always `we/our/us` — never `I/my` in user-facing strings
- **No LinkedIn references** — removed from platform, do not reintroduce
- **No AI-speak** — no "elevate," "unleash," "game-changer," etc. in copy
- Use `JSON.parse()` before traversing the `result` column in the `jobs` table (stored as JSON string inside JSONB)

## Commit Discipline
- Commit and push after **every discrete fix** before moving to the next
- One logical change per commit
- Verify fix via Vercel deployment logs and Supabase SQL checks before moving on

## Do Not Touch (without explicit instruction)
- Founders Club tier, badge, or pricing — permanently locked for existing members
- `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `VITE_SUPABASE_*` — never log or expose
- Supabase RLS policies — do not modify without explicit instruction
- `window.__HUTTLE_SUPABASE_INITIALIZED__` guard — singleton pattern, leave intact

## AI Model Selection
- **Claude Sonnet** — generative/creative features (AI Plan Builder, Ignite Engine, Content Remix Studio, Full Post Builder)
- **Grok** — scoring, analysis, captions, hooks, CTAs, humanizer
- **Perplexity Sonar** — trend research, hashtags, niche intel (standard context preferred over Pro for high-frequency features)
- **Claude Haiku** — batch/scheduled tasks (n8n workflows)

## n8n Workflows
- Ignite Engine: `4RBACXirZhUR2v31`
- AI Plan Builder: `iEs1WLZ3FDhONdqj`
- Daily Content Creator: `PkAGq3pep0YJanYX` (weekly Sunday 5PM EST)
- Inject rules/context into existing Anthropic Chat Model nodes — do not add new nodes unless necessary

## Environment Variables (Required)
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GROK_API_KEY`, `VITE_PERPLEXITY_API_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`