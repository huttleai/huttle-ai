# HUTTLE AI — LAUNCH READINESS REPORT
## Generated: 2026-03-19 (local audit run)

---

## EXECUTIVE SUMMARY

The codebase is **not a “greenfield demo”**—auth, billing webhooks, subscription hardening, and AI proxies show mature patterns. **`npm run build` succeeds** and **39 of 41 Chromium E2E tests pass** when the dev server runs with `VITE_SKIP_AUTH=true` on a reachable URL. The remaining gap is concentrated: **Content Vault’s primary “Create” control no longer opens the manual post modal** (dropdown only), which breaks the E2E contract and likely confuses users who expect “create post in vault” from that button. Documentation still labels **Grok/Perplexity keys as client `VITE_*` variables** even though the browser only calls `/api` proxies—this is a **launch-week footgun** for anyone who follows `.env.example` literally and later wires keys into the client. **Overall: READY WITH CAVEATS**—ship is plausible by March 20 if you fix the Vault create UX (or update the test intentionally), reconcile env docs with proxy-only reality, and run CI on a predictable Playwright base URL.

---

## TEST RESULTS

**Suite:** `npx playwright test --project=chromium --reporter=list`  
**Environment:** `PLAYWRIGHT_BASE_URL=http://localhost:5179` + `PW_REUSE_SERVER=1`, with a separate `VITE_SKIP_AUTH=true npx vite --port 5179` process (avoids conflict with an existing process on `5173`).

| Metric | Count |
|--------|------:|
| **Total** | 41 |
| **Passed** | 39 |
| **Failed** | 1 |
| **Skipped** | 1 |

**Skipped:** `tests/e2e/02-auth-flow.spec.ts` — “login with valid credentials” — requires `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` and a non–skip-auth server (intentional).

**Mobile project:** `18-mobile-responsive.spec.ts` is excluded from the `chromium` project in `playwright.config.ts` (not executed in this run).

### Failed Tests

| Test | File | Error | Root Cause | Fix Difficulty |
|------|------|-------|------------|----------------|
| library tab: in-app AI tools link, create post modal, manual filter chip | `tests/e2e/12-content-vault.spec.ts:10` | `getByTestId('vault-create-post-modal')` not visible after click | **`vault-create-post-button` toggles a “Create” dropdown** (`setCreateMenuOpen`) instead of opening `CreatePostModal` (`setIsCreatePostOpen`). Modal is still mounted when `isCreatePostOpen` is true (e.g. empty state “Write a Post Manually”) but not wired to the main button. See `ContentLibrary.jsx` ~1080–1125 vs `CreatePostModal` ~226–258 and state ~439, ~1633–1636. | **Easy** (add menu item “Write post manually” → `setIsCreatePostOpen(true)` and close menu, or restore one-click open; then keep or adjust test) |

### Environment / flake notes

- **First attempt:** `npx playwright test` with default `webServer` **failed** because `http://localhost:5173` was already in use and `reuseExistingServer` was false.
- **Second attempt:** `PW_REUSE_SERVER=1` against an unknown existing server **failed** smoke: **`dashboard-greeting` never appeared** — consistent with a **non–skip-auth** server (guest sees login, not dashboard).
- **No multi-run flake observed** in this session; retries only fired on the failed vault test (Playwright retry #1).

---

## WORKING FEATURES ✅

Verified by **code review + passing E2E** (where applicable); not every path was exercised against live Supabase/Stripe/LLMs.

1. ✅ **Landing & marketing** — responsive checks pass (`01-landing-page.spec.ts`).
2. ✅ **Dev auth bypass** — `VITE_SKIP_AUTH` + `import.meta.env.DEV` gates mock user (`AuthContext.jsx` ~245–265, `SubscriptionContext.jsx` ~62, `ContentContext.jsx` ~17); E2E harness uses it.
3. ✅ **Onboarding gate** — `needsOnboarding` + `/onboarding` route (`dashboard/Dashboard.jsx` ~88–104); tests pass.
4. ✅ **Dashboard** — greeting test id present (`Dashboard.jsx` ~827, ~839), refresh/hashtag behaviors covered (`04-dashboard.spec.ts`).
5. ✅ **AI Power Tools** — caption/hashtag/hook flows with mocks (`05-ai-power-tools.spec.ts`).
6. ✅ **Full Post Builder** — wizard shell (`06-full-post-builder.spec.ts`).
7. ✅ **Trend Lab** — structured cards + Deep Dive tab presence (`07-trend-lab.spec.ts`).
8. ✅ **Niche Intel** — page loads, **tier gate** uses `checkFeatureAccess('niche-intel')` aligned with `FEATURES['niche-intel']` in `config/supabase.js` ~261 (`NicheIntel.jsx` ~59).
9. ✅ **Ignite Engine** — UI + vault control in DOM when results render (`09-ignite-engine.spec.ts`).
10. ✅ **Content Remix Studio** — steps and vault on results (`10-content-remix.spec.ts`).
11. ✅ **AI Plan Builder** — config UI loads (`11-ai-plan-builder.spec.ts`).
12. ✅ **Content Vault (partial)** — list view and heading (`12-content-vault.spec.ts` first test); **manual create via headline button fails test** (see above).
13. ✅ **Brand Profile (unified Brand Voice)** — six sections, expand/collapse, completion, autosave (`13-brand-voice.spec.ts`).
14. ✅ **Subscription page** — renders with tier context (`14-subscription-billing.spec.ts`).
15. ✅ **Settings / profile redirect** — `15-settings-profile.spec.ts`.
16. ✅ **Social Updates** — mock route (`16-social-updates.spec.ts`).
17. ✅ **Navigation** — sidebar + “Content Vault” label (`17-navigation-layout.spec.ts`).
18. ✅ **API error handling** — Grok 500 fallback (`19-error-handling.spec.ts`).
19. ✅ **Smoke path** — passes when server matches skip-auth (`20-smoke.spec.ts`).
20. ✅ **Stripe webhook** — **signature verification** via `constructEvent`, idempotency table, checkout/subscription/invoice handlers (`api/stripe-webhook.js` ~241–251, ~260–516).
21. ✅ **Cancel subscription API** — **`cancel_at_period_end: true`** on Stripe update (`api/cancel-subscription.js` ~101–103); resolves subscription **server-side** from auth user (~47–52).
22. ✅ **Subscription status API** — strips Stripe IDs before JSON (`api/subscription-status.js` ~121–129).
23. ✅ **CORS helper** — origin allowlist, no `*` in production (`api/_utils/cors.js` ~11–40).
24. ✅ **Cron `update-social-media`** — requires `CRON_SECRET` (`api/update-social-media.js` ~33–44).
25. ✅ **RLS billing hardening** — blocks authenticated insert/update/delete on `subscriptions` (`supabase/migrations/20260319180000_billing_hardening.sql` ~52–75).

---

## BROKEN / NOT WORKING ❌

1. ❌ **Content Vault — “Create” → manual post modal (as tested)** — Primary `data-testid="vault-create-post-button"` opens a **dropdown** of deep links, not `CreatePostModal`. E2E and implied product behavior don’t match. **Files:** `src/pages/ContentLibrary.jsx` (button ~1079–1089; modal ~226–258; menu ~1090–1125).
2. ❌ **Playwright in a busy local dev environment (default)** — If port **5173** is taken and reused server isn’t skip-auth–compatible, **smoke/dashboard tests fail** for environmental reasons, not necessarily app logic.

---

## ISSUES FOUND 🔧

### Critical (Must fix before launch)

*None identified in this audit that are exploitable in production **as implemented today*** (no service role on client; webhook verifies signatures; subscription rows blocked from client writes).  

*Operational note:* If anyone adds `import.meta.env.VITE_GROK_API_KEY` to frontend code in the future, **keys would ship in the bundle**—today `grep` shows **no** such references under `src/`.

### High (Should fix before launch)

1. **Content Vault create UX vs. spec** — Primary Create control doesn’t expose manual vault entry; **E2E fails** — `src/pages/ContentLibrary.jsx` ~1079–1125.
2. **`.env.example` mislabels AI secrets as client** — `VITE_GROK_API_KEY` / `VITE_PERPLEXITY_API_KEY` under “API Keys (Client-side)” (`.env.example` ~15–21) **contradicts** proxy architecture (`src/services/grokAPI.js` ~42–43, `src/services/perplexityAPI.js` ~27–28; server `api/ai/grok.js` ~16–18). Risk: **operators paste real keys into `VITE_*`**, thinking that’s correct—safe only if never imported in client; confusing and dangerous.

### Medium (Fix within first week)

1. **Playwright port friction** — Default `webServer` + `5173` conflicts (`playwright.config.ts` ~57–60). Document `PW_REUSE_SERVER=1` + matching `VITE_SKIP_AUTH` **or** `PLAYWRIGHT_BASE_URL` + alternate port.
2. **Bundle size / chunking** — Single JS **~1.55 MB** minified, **~416 KB gzip** (`npm run build`); Vite warns >500 KB **minified**—little headroom for growth (`vite.config.js` has `manualChunks: undefined`).
3. **ErrorBoundary coverage** — `src/dashboard/Dashboard.jsx` ~152 wraps authenticated app; `src/main.jsx` has **no** top-level boundary—public routes can still white-screen on render errors.
4. **Console noise in shipping builds** — e.g. `src/pages/Dashboard.jsx` ~435 `console.log`; `src/services/dashboardCacheService.js` multiple `console.log`; `src/utils/normalizeNiche.js` ~128; `src/pages/IgniteEngine.jsx` ~370–371 (prompt dump).
5. **Legacy naming: “Content Library”** — Still in user-facing/help/landing strings (`src/pages/AITools.jsx` ~647, `LandingPage.jsx` ~446, `FeatureAccessList.jsx` ~69, etc.) while nav uses **Content Vault** (`tests/e2e/17-navigation-layout.spec.ts` passes label test).
6. **`cancelSubscription` request body** — Client still sends `stripe_subscription_id` (`src/services/stripeAPI.js` ~418–423) though API resolves server-side (`api/cancel-subscription.js` ~47–52). **Confusing**; low security impact if endpoint ignores it (verify body parsing doesn’t use it—currently it doesn’t).

### Low (Fix when convenient)

1. **Dev dependency warning** — `baseline-browser-mapping` stale (build log).
2. **`/login` app-level route** — Uses `AuthProvider` only for `LoginRoute` (`src/App.jsx` ~64–68); dashboard login lives under `/dashboard/*`—works but split-brain.
3. **Comment reference to “Angela” bug** — `src/components/OnboardingQuiz.jsx` ~270 (comment only).

---

## SECURITY AUDIT

| Finding | Severity | File | Status |
|---------|----------|------|--------|
| Stripe webhook **signature verification** (`constructEvent`) | — | `api/stripe-webhook.js` ~241–251 | OK |
| **Service role** only in `api/*` / server, not in `src/` client bundle | — | grep `SUPABASE_SERVICE_ROLE_KEY` | OK |
| **Subscription status** strips `customerId` / `stripeSubscriptionId` from client JSON | — | `api/subscription-status.js` ~121–129 | OK |
| **`subscriptions` RLS** blocks authenticated writes | — | `20260319180000_billing_hardening.sql` | OK (if migrated) |
| **CORS** allowlist (no `*` prod) | — | `api/_utils/cors.js` | OK |
| **`VITE_SKIP_AUTH`** gated on **`import.meta.env.DEV`** | — | `AuthContext.jsx` ~245 | OK for prod build |
| **`user_profile` select** for brand **omits** `stripe_customer_id` | — | `BrandContext.jsx` ~9–10 | OK |
| **AI keys documented as `VITE_*`** despite proxy-only client | High (doc) | `.env.example` ~15–21 | **Needs fix** |
| **Per-request auth** on billing routes | — | `api/subscription-status.js` ~77–80, `api/cancel-subscription.js` ~31–34 | OK |
| **Cron** endpoint requires secret | — | `api/update-social-media.js` ~33–44 | OK |
| Client **`stripe_subscription_id`** references | Low | `src/pages/Subscription.jsx` ~278, `FoundersMembershipCard.jsx` ~60 | **Harmless if always undefined** (context object doesn’t include raw Stripe id) |

---

## PERFORMANCE NOTES

- **Single main chunk**; gzip **416 KB** under a 500 KB gzip “budget” but **minified** size triggers Vite’s warning—**route-based splitting** (lazy pages already partially used in `App.jsx` for marketing only; dashboard imports many pages eagerly in `dashboard/Dashboard.jsx`) would reduce parse cost on first paint.
- **SubscriptionContext** polls every **60s** (`SubscriptionContext.jsx` ~416–418)—acceptable; watch for unnecessary `refreshSubscription` churn if auth objects churned (mitigated in `AuthContext` for `TOKEN_REFRESHED` ~352–358).
- **Dashboard cache service** has sequential/platform logging and potentially heavy fetches—review under real API latency (no load test in this audit).

---

## DEAD CODE & CLEANUP

- **Commented routes** in `dashboard/Dashboard.jsx` ~121–122 (`ContentRepurposer`, `HuttleAgent`)—intentionally disabled; remove or feature-flag when decided.
- **`console.log` / debug logs** — see Medium issues.
- **Duplicate “Content Library” naming** — align copy with “Content Vault” or clarify product language.
- **`api/test-stripe-price.js`** — ensure not exposed in production as a public abuse surface (not analyzed in depth—verify Vercel routing / auth if concerned).

---

## RECOMMENDATIONS FOR LAUNCH 🚀

### Must-do before launch (next 24 hours)

1. **Fix Content Vault “Create” → manual post** — Add dropdown item **“Write post manually”** calling `setIsCreatePostOpen(true)` (and close menu), **or** change test if product intent is links-only — **~30–60 min**.
2. **Correct `.env.example` AI key section** — Move Grok/Perplexity to **server-only** (`GROK_API_KEY`, `PERPLEXITY_API_KEY`) and state explicitly: *“Client calls `/api/ai/*` only; never put provider secrets in `VITE_*`.”* — **~15 min**.
3. **Playwright / CI** — Pin **one** strategy: free port, or `PLAYWRIGHT_BASE_URL`, document in README — **~30 min**.
4. **Confirm Supabase migrations applied** on production (especially `20260319180000_billing_hardening.sql`, `20260319200000_user_profile_upsert_rls_with_check.sql`) — **varies**.

### Should-do within first week

1. **Code-split dashboard routes** — `React.lazy` for heavy pages already pattern in `App.jsx`; extend to `dashboard/Dashboard.jsx` imports — **4–8 hrs**.
2. **Strip or gate `console.log`** for production (`import.meta.env.DEV` or logger) — **2–4 hrs**.
3. **Top-level ErrorBoundary** in `main.jsx` for public pages — **1–2 hrs**.
4. **Remove `stripe_subscription_id` from client cancel payload** (cleanup) — **15 min**.

### Nice-to-have improvements

1. **Run `mobile` Playwright project** on CI for layout regressions (`playwright.config.ts` mobile project).
2. **Real-auth E2E** with secure vault creds in CI secrets.
3. **Unify “Content Library” vs “Content Vault”** copy.

### Infrastructure recommendations

1. **Vercel:** Ensure all `api/*` env vars from `.env.example` server section exist; **never** set real provider keys as `VITE_*` unless you intend public exposure.
2. **Supabase:** RLS performance pattern `(select auth.uid())` per your rules—re-verify hot paths under `EXPLAIN` if slow.
3. **Stripe:** Webhook signing secret matches environment (test vs live); idempotency table present (`stripe_webhook_events`).

### Monitoring & alerting (launch day)

1. **Vercel function logs** — error rate on `/api/ai/*`, `/api/subscription-status`, webhook 4xx/5xx.
2. **Stripe dashboard** — failed webhooks; payment_failed volume.
3. **Supabase** — auth errors, RLS violations, DB CPU.

---

## LAUNCH DAY CHECKLIST

- [ ] Migrations applied on production Supabase
- [ ] Vercel env: Stripe **live** keys, webhook secret, Supabase URL + **service role**, `GROK_API_KEY` / `PERPLEXITY_API_KEY` / `ANTHROPIC_API_KEY`, `CRON_SECRET`
- [ ] Confirm **no** `VITE_*` AI provider secrets needed in production client
- [ ] Stripe webhook URL live + `checkout.session.completed` etc. delivered
- [ ] Smoke: signup → onboarding → dashboard → one AI tool → vault save
- [ ] Fix or accept Content Vault Create flow; **green E2E**
- [ ] Spot-check **cancel at period end** on staging
- [ ] CSP in `vercel.json` allows your actual n8n host if not `*.n8n.cloud`

---

## FILES CHANGED IN THIS AUDIT

**None** (read-only audit; report file added only).

---

## APPENDIX — COMMAND LOG (reference)

```bash
# Build
npm run build   # ✓ success; warnings: large chunk, dynamic import mixing

# Tests (successful configuration example)
VITE_SKIP_AUTH=true npx vite --port 5179
PLAYWRIGHT_BASE_URL=http://localhost:5179 PW_REUSE_SERVER=1 npx playwright test --project=chromium --reporter=list

# Grep (frontend)
grep -r "VITE_SKIP_AUTH" src/ --include="*.jsx" --include="*.js"   # only DEV-gated contexts
grep -r "process.env" src/ --include="*.jsx" --include="*.js"     # no matches
```

---

*End of report.*
