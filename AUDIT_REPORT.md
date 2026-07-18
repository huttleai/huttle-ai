# Huttle AI Pre-Launch Health Audit

**Date:** 2026-07-17 (America/New_York) / 2026-07-18 UTC  
**Repo:** `/Users/huttleai/huttle-ai`  
**Method:** Synthesize prior browser/API audit evidence (agent `e09fb8fb-d668-4efd-8270-b0062221faa2` + static QA subagents); fill gaps with focused static review; spot-check Plan Builder job status in Supabase and n8n env wiring. **No full multi-hour browser re-audit.**

---

## Executive summary

| Severity | Count | Highlights |
|----------|------:|------------|
| **Blocking** | 1 | AI Plan Builder jobs stay `queued`; n8n does not write results back |
| **Degraded** | 5 | Tier/gate mismatches (Niche Intel, Content Remix, Trend Lab forecaster key); Plan Builder run-cap bypass; Ignite charge-before-success |
| **Cosmetic / docs** | 4 | Naming drift (Builders Club vs Legacy Annual), UpgradeModal copy, `getTierConfig` free fallback, CLAUDE.md `TIER_GENERATION_LIMITS` |
| **Fixed (working tree, uncommitted)** | 3 files | Claude / humanize / content-remix Anthropic `temperature` + text-block join |

**Launch readiness:** Core creative tools (Brand Voice, Content Remix, Ignite, Full Post Builder path) look usable after Anthropic proxy fixes. **Do not launch AI Plan Builder as a primary funnel feature until n8n writeback is repaired.**

---

## Confidence legend

| Level | Meaning |
|-------|---------|
| **High** | Exercised end-to-end in prior browser/API run, or re-verified in this session (DB/code) |
| **Medium** | Prior “walked through” or strong static wiring + partial runtime evidence |
| **Low** | Navigated / assumed / static only; not enough evidence to claim full E2E |

---

## Fixed (working tree — do not revert; not committed)

| File | Change | Why |
|------|--------|-----|
| `api/ai/claude.js` | Removed `temperature`; join all `type === 'text'` content blocks | Anthropic 400 on `claude-sonnet-5` with `temperature`; empty/wrong text when first block is non-text |
| `api/ai/humanize.js` | Removed `temperature`; join all text blocks; empty → 422 | Same Anthropic issues; client previously fell back to pre-humanized text (silent degradation) |
| `api/ai/content-remix.js` | Removed `temperature` from Anthropic request | Same 400 risk |

**Re-verified this session:** fixes still present; `git diff` limited to these three API files (+ audit scripts / this report).

---

## Feature results

### 1. Brand Voice

| | |
|--|--|
| **What tested** | Prior browser walkthrough: save/load; brand context observed in Content Remix and Ignite briefs |
| **Result** | **Pass** (with notes) |
| **Severity** | — |
| **Confidence** | **High** for save/load + influence on Remix/Ignite; **Medium** for complete philosophy injection into every feature |

**Notes (flagged, not fixed):**
- Persists to `user_profile` + `user_preferences` (+ localStorage mirror).
- Philosophy via `getBrandStoryContext` is injected in Full Post / Ignite payload / Niche *analysis*; **gaps** on Plan Builder, Content Remix Claude primary path, Niche research, Trend Deep Dive (static QA).

---

### 2. Full Post Builder

| | |
|--|--|
| **What tested** | Prior browser walkthrough after Claude proxy fix (hooks path) |
| **Result** | **Pass** (partial evidence) |
| **Severity** | — |
| **Confidence** | **Medium** — exercised after Claude fix; transcript detail thinner than Remix/Ignite |

**Wiring (static):** Claude (`/api/ai/claude`) → Grok (`/api/ai/grok`) → Perplexity hashtags with Grok fallback. Credits charged after usable hooks. Brand story via system prompt builders.

**Flagged:** Relies on local API / Anthropic proxy being healthy (addressed by Fixed items above).

---

### 3. Niche Intel

| | |
|--|--|
| **What tested** | Prior browser walkthrough |
| **Result** | **Pass** for Pro+ path (partial); **Flagged** gating inconsistency |
| **Severity** | **Degraded** (Essentials access mismatch) |
| **Confidence** | **Medium** E2E; **High** on static gate mismatch |

**Flagged for review:**
1. `FEATURE_RUN_CAPS.nicheIntel.essentials = 5` and `TIER_LIMITS.essentials.nicheIntel = 5`, but `FEATURES['niche-intel']` is **Pro / Founder / Builder only**. Page uses `checkFeatureAccess('niche-intel')` → Essentials blocked despite configured caps. Sidebar badges “Pro”.
2. After successful analysis, failed `trackFeatureUsage` can discard UI results (`NicheIntel.jsx`).
3. Research path does not call `getBrandStoryContext`.

**Recommended approach:** Decide product intent. If Essentials should get Niche Intel, add `TIERS.ESSENTIALS` to `FEATURES['niche-intel']` (and keep run cap 5). If Pro-only, set `FEATURE_RUN_CAPS.nicheIntel.essentials = 0` and remove essentials limit from `TIER_LIMITS` so sources agree. Fix usage-track failure to still show analysis.

---

### 4. Trend Lab

| | |
|--|--|
| **What tested** | Prior browser walkthrough (Pulse / discovery / deep dive path assumed) |
| **Result** | **Pass** for main discovery/deep-dive path (partial); forecaster broken/coming-soon |
| **Severity** | **Degraded** (forecaster gate key); forecaster itself Coming Soon |
| **Confidence** | **Medium** for deep dive/pulse; **High** for static forecaster bug |

**Flagged for review:**
1. `checkFeatureAccess('trendForecasts')` in `TrendLab.jsx` matches **neither** `TIER_LIMITS` nor `FEATURES` keys → always false (dead gate on Coming Soon UI).
2. Trend Forecaster is `COMING_SOON_FEATURES` — not a launch blocker if marketed as Coming Soon.
3. Deep dive uses Perplexity via `/api/ai/deep-dive` (not n8n); no `getBrandStoryContext`.

**Recommended approach:** Align key to `trendForecaster` / `trend-forecaster` or remove dead gate until feature ships.

---

### 5. Content Remix Studio

| | |
|--|--|
| **What tested** | Prior E2E: 3 variations after Anthropic fixes; brand context reflected (“after work, pickup, homework battle” / busy parents) |
| **Result** | **Pass** after fixes |
| **Severity** | Was **Degraded** (empty humanize); **Fixed** upstream |
| **Confidence** | **High** |

**Notes:**
- Primary: `/api/ai/content-remix` (Claude). Fallback: Grok. Humanize: `/api/ai/humanize`.
- Pre-fix: empty humanize responses → client silently used pre-humanized text.
- Post-fix + local API restart: remix completed with brand context.

**Flagged for review:**
- Caps include Essentials 10; not in `FEATURES`; `TIER_LIMITS.essentials` lacks `contentRemix`. Access is via `useAIUsage` — Essentials can run Remix while feature lists omit it. Align marketing/gates with caps.
- Claude path does not inject `getBrandStoryContext` (Grok fallback does).

---

### 6. Ignite Engine

| | |
|--|--|
| **What tested** | Prior E2E success: no console errors; credits deducted; n8n fired; brand/dinner pain point in brief |
| **Result** | **Pass** |
| **Severity** | **Degraded** notes (billing timing, LinkedIn allowlist) |
| **Confidence** | **High** |

**n8n:** Expected workflow ID `4RBACXirZhUR2v31` (docs/`CLAUDE.md` only). Runtime URL from env: local `.env` → `huttleai.app.n8n.cloud/webhook/ignite-engine` via `VITE_N8N_IGNITE_ENGINE_WEBHOOK` (server `N8N_IGNITE_ENGINE_WEBHOOK` falls back to VITE in proxy).

**Flagged for review:**
1. Credits charged **before** successful brief — failed runs still spend usage.
2. `ALLOWED_PLATFORMS` still includes LinkedIn (`api/ignite-engine-proxy.js`) vs product “no LinkedIn” rule.
3. `brand_story_context` depends on n8n node mapping (comment warns of silent drop).

**Recommended approach:** Charge after success (or refund on failure); remove LinkedIn from allowlist; verify n8n system message maps `brand_story_context`.

---

### 7. AI Plan Builder — BLOCKING

| | |
|--|--|
| **What tested** | Prior: webhook accepted; job stayed `queued` 40+ minutes. This session: Supabase spot-check |
| **Result** | **Fail** |
| **Severity** | **Blocking** |
| **Confidence** | **High** |

**Spot-check (2026-07-18 UTC):**

| Job ID | Status | Created | Notes |
|--------|--------|---------|-------|
| `9dfefd41-7fda-42e5-9b83-f99d04918f8f` | `queued` | `2026-07-18T00:57:54Z` | Audit-era job; `result` null; `updated_at` ≈ create time (no writeback) |
| `c7bc0b3a-…` / `66ec1273-…` | `queued` | 2026-03-27/28 | Stale orphans |

Last successful completions in DB are from **April 2026** — workflow writeback has been broken or intermittent for a long time.

**n8n wiring:**
- Expected workflow ID: `iEs1WLZ3FDhONdqj` (docs only; not hardcoded in app).
- Local env path: `VITE_N8N_PLAN_BUILDER_WEBHOOK` → `…/webhook/plan-builder-async`.
- Server vars `N8N_PLAN_BUILDER_WEBHOOK` / `_URL` **missing in local `.env`**; proxies fall back to `VITE_*` (works locally if Vite env loaded into Node; production should set server-side `N8N_*` on Vercel).
- **Do not re-enable** disabled workflow `sTJuHsMECW41Zm5r` — **not referenced** in codebase (good).

**Additional static issues (degraded, same feature):**
1. Live UI path: `createJobDirectly` + `triggerN8nWebhook` → `/api/plan-builder-proxy`. Does **not** call `/api/create-plan-builder-job`, so server tier/14-day/cap enforcement on that endpoint is bypassed.
2. `incrementFeatureCounter: false` with comment claiming server job API is authoritative — **incorrect for live path** → monthly run caps largely ineffective.
3. No `getBrandStoryContext` in webhook payload (only `buildBrandContext`).

**Recommended approach:**
1. In n8n workflow `iEs1WLZ3FDhONdqj`: confirm active, webhook path matches env, Supabase credentials, and final node updates `jobs` (`status` + `result`). Replay job `9dfefd41-…` from n8n execution log.
2. Align app to either always use `create-plan-builder-job` **or** increment caps on the client path and delete the misleading comment.
3. Clean up stale `queued` jobs after confirming they will never complete.

---

## Cross-cutting sections

### Tier gating (Essentials / Pro / Founders / Builders)

**Sources of truth:**
- Credits/caps: `src/config/creditConfig.js` (`TIER_CREDIT_POOLS`, `FEATURE_RUN_CAPS`)
- Access maps: `src/config/supabase.js` (`TIER_LIMITS`, `FEATURES`, `hasFeatureAccess`, `canAccessFeature`)
- Display: `src/utils/tierConfig.js` (Founders Club; **Legacy Annual** for `builder`)
- Runtime: `SubscriptionContext.normalizeTier` aliases `builders_club` → `builder`, `founders_club` → `founder`

**Comped accounts (e.g. Manuel Torres):** No special-case code. Access depends on `subscriptions.tier` / Stripe sync resolving to `founder` or `builder` (or `pro`/`essentials`). Static review: aliasing looks correct for Founders/Builders Club strings.

| Feature | Free | Essentials | Pro / Founder / Builder |
|---------|------|------------|-------------------------|
| Core AI tools (caption/hashtag/hook/CTA/scorer/visual) | no | yes | yes |
| Trend Lab | no | yes | yes |
| Ignite | no | yes (15) | yes (40) |
| Plan Builder | no | 7-day only | 7+14 day |
| Full Post Builder | no | yes | yes |
| Niche Intel | no | **caps say yes; FEATURES say no** | yes |
| Content Remix | no | **caps yes; FEATURES omit** | yes (caps) |
| Content Repurposer / Huttle Agent / Trend Forecaster | no | no | yes (forecaster Coming Soon) |

**Flagged:** Dual camelCase / kebab-case keys; `checkFeatureAccess` ORs both helpers — easy to call the wrong key (`trendForecasts`). `getTierConfig` falls back to undefined `TIER_CONFIG['free']`. UpgradeModal Ignite “60 briefs” vs cap 40. Usage-alert email labels both founder and builder as “Builders Club” in places.

**Out of scope (noted only):** Auth/session/token-refresh race; `SubscriptionContext` timeout workstream.

---

### Trial flow (7-day)

| Step | Wiring | Status |
|------|--------|--------|
| Start | `api/create-checkout-session.js`: `trial_period_days: 7` for monthly Essentials/Pro (not launch/annual founder-builder) | Present |
| Client state | `isTrialing` from `status === 'trialing'`; `trialDaysRemaining` from Stripe `trialEnd` | Present |
| UI | `Subscription.jsx` remaining days; Dashboard badge | Present |
| Expiry emails | Stripe webhook → trial expired / subscription confirmed | Wiring present; **live fire not re-tested** (webhook workstream OOS) |

**Flagged for review:**
1. `getDatabaseSubscription` does **not** select `trial_end`. DB-only fallback sets `trialEnd: null` → Dashboard can render `Trial · null days left` when `isTrialing` but days are null.
2. Trial-expired email may over-fire on any `trialing` → non-`active` transition (cancel during trial, etc.) — verify against product intent (webhook OOS for edits).
3. Trial reminder cron: daily `0 13 * * *` → `/api/trial-reminder-cron`; sends only when ceil days === 3 or 1 — can miss the 1-day window depending on timing.

**Recommended approach:** Select `trial_end` on DB path; guard Dashboard copy when `trialDaysRemaining == null`; separately harden reminder window math.

---

### n8n wiring (production vs local)

| Feature | Env vars | Proxy | Local behavior | Production |
|---------|----------|-------|----------------|------------|
| Ignite | `N8N_IGNITE_ENGINE_WEBHOOK` \|\| `VITE_N8N_IGNITE_ENGINE_WEBHOOK` | `/api/ignite-engine-proxy` | VITE URL present → `/webhook/ignite-engine` | Prefer server `N8N_*` on Vercel |
| Plan Builder | `N8N_PLAN_BUILDER_WEBHOOK_URL` \|\| `N8N_PLAN_BUILDER_WEBHOOK` \|\| `VITE_N8N_PLAN_BUILDER_WEBHOOK` | `/api/plan-builder-proxy`, `create-plan-builder-job` | VITE → `/webhook/plan-builder-async`; server keys missing locally | Set server `N8N_*`; confirm workflow `iEs1WLZ3FDhONdqj` writeback |
| Daily Content Creator | n8n schedule only (`PkAGq3pep0YJanYX`) | None in app | N/A | Ops-only |
| Disabled | `sTJuHsMECW41Zm5r` | — | Not referenced | Leave disabled |

Workflow **IDs** live in `CLAUDE.md` / ops docs, not in runtime code. App binds by **webhook URL**.

Local API mounts (`server/local-api-server.js`): claude, humanize, content-remix, plan-builder-proxy, ignite-engine-proxy, create-plan-builder-job, get-job-status — present.

**Missing local mounts (flagged):** `/api/emails/send-usage-alert-trigger`, `/api/submit-cancellation-feedback`, `/api/stripe-session-details` — prod-only unless added to local server.

---

### Resend transactional emails

| Email | Module | Trigger | Audit status |
|-------|--------|---------|--------------|
| Secure account / welcome-ish | Inline in `stripe-webhook.js` | `checkout.session.completed` | Wiring present; live fire **not re-tested** (webhook OOS) |
| Trial started | `send-trial-started.js` | `customer.subscription.created` + trialing | Wiring present; live fire not re-tested |
| Trial ending (3d / 1d) | `send-trial-warning.js` via `trialReminderUtils` | Cron + Stripe `trial_will_end` path | Cron secured by `CRON_SECRET`; schedule in `vercel.json` |
| Trial expired | `send-trial-expired.js` | subscription updated trialing→non-active | Wiring present; live fire not re-tested |
| Subscription confirmed | `send-subscription-confirmed.js` | → active | Wiring present; live fire not re-tested |
| Payment failed | `send-payment-failed.js` | `invoice.payment_failed` (attempt 1) | Wiring present; live fire not re-tested |
| Cancellation (voluntary) | `send-cancellation-voluntary.js` | `subscription.deleted` (skips payment_failed) | Wiring present; live fire not re-tested |
| Usage 100% alert | `send-usage-alert.js` + trigger API | Frontend `useAIUsage` → POST | **Flagged:** trigger endpoint has **no auth** — anyone can POST `{ userId }` |

**No dedicated signup welcome** for email/password signup alone. `PaymentSuccess.jsx` promises a welcome email; closest is checkout secure-account + Mailchimp.

**Stripe-webhook-dependent sends:** note as “wiring present, live fire not re-tested (out of scope webhook workstream).”

---

### Auth / Stripe webhook / marketing

Explicitly **out of scope** for this audit — not modified, not re-tested:
- Auth/session/token-refresh race and SubscriptionContext timeout
- `api/stripe-webhook.js` reliability workstream
- Disabled n8n `sTJuHsMECW41Zm5r`
- Marketing copy / landing pages

---

## Fixed vs Flagged (quick index)

### Fixed
1. Anthropic `temperature` removed — `claude.js`, `humanize.js`, `content-remix.js`
2. Multi text-block join — `claude.js`, `humanize.js`

### Flagged for review (recommended approach in sections above)
1. **Blocking:** Plan Builder n8n → `jobs` writeback
2. Plan Builder run-cap / `create-plan-builder-job` bypass
3. Niche Intel Essentials FEATURES vs run caps
4. Content Remix Essentials FEATURES omission
5. `trendForecasts` dead gate key
6. Ignite charge-before-success + LinkedIn allowlist
7. Trial `trial_end` missing on DB fallback / null days UI
8. Unauthenticated usage-alert email trigger
9. Brand philosophy injection gaps (Plan Builder, Remix Claude, Niche research, Deep Dive)
10. Naming/docs drift (Legacy Annual vs Builders Club; `TIER_GENERATION_LIMITS`)

---

## Audit tooling used (untracked scripts)

Leave in place; used / available for probes:

- `scripts/audit-check-qa-user.mjs`
- `scripts/audit-claude-probe.mjs`
- `scripts/audit-create-test-user.mjs`
- `scripts/audit-schema-probe.mjs`
- `scripts/audit-users-probe.mjs`

Plus ad-hoc Supabase job status query during this completion pass.

---

## Modified files (this audit workstream)

| Path | Role |
|------|------|
| `api/ai/claude.js` | Fixed (uncommitted) |
| `api/ai/humanize.js` | Fixed (uncommitted) |
| `api/ai/content-remix.js` | Fixed (uncommitted) |
| `scripts/audit-*.mjs` (5 files) | Untracked audit helpers |
| `AUDIT_REPORT.md` | This report (new) |

**No commits. No pushes.** Out-of-scope files were not modified.

---

## Self-review checklist

- [x] Report written to `/Users/huttleai/huttle-ai/AUDIT_REPORT.md`
- [x] Did **not** restart full multi-hour browser audit; synthesized prior evidence
- [x] Blocking Plan Builder claim re-checked in Supabase (`9dfefd41-…` still `queued`)
- [x] Anthropic fixes re-read and still correct; no `temperature` in the three proxies
- [x] n8n IDs: docs expect Ignite `4RBACXirZhUR2v31`, Plan Builder `iEs1WLZ3FDhONdqj`; env URLs path-checked; disabled workflow not referenced
- [x] Tier / trial / Resend gaps filled via static review
- [x] E2E confidence honest: Full Post / Niche / Trend Lab marked **Medium** where prior evidence was “walked through”
- [x] Out-of-scope areas noted only (auth race, stripe webhook reliability, marketing, disabled n8n)
- [x] `git status` shows only intended API diffs + audit scripts + this report
- [x] No commit / no push
