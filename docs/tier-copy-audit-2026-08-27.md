# Tier copy vs `FEATURE_RUN_CAPS` audit

**Date:** 2026-08-27
**Scope:** Read-only. No product, Stripe, subscription, or credit-logic files were changed.
**Enforcement source of truth (per audit brief):** `FEATURE_RUN_CAPS` in `src/config/creditConfig.js`, gated by `useAIUsage.js` (`checkCanGenerate` uses `getFeatureRunCap`). Server-side `api/_utils/usageGate.js` also reads `getFeatureRunCap` from the same file.

---

## 1. Current `FEATURE_RUN_CAPS` (re-derived today)

From `src/config/creditConfig.js` lines 67–88.

| Feature key | Essentials | Pro | Founder | Builder | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| `captions` | null | null | null | null | Pool only |
| `hashtags` | null | null | null | null | Pool only |
| `hooks` | null | null | null | null | Pool only |
| `ctas` | null | null | null | null | Pool only |
| `scorer` | null | null | null | null | Pool only |
| `visuals` | null | null | null | null | Pool only |
| `aiHumanizerRewrite` | null | null | null | null | Pool only |
| `trendPulse` / `trendQuickScan` | null | null | null | null | Pool only |
| `audienceInsights` | null | null | null | null | Pool only |
| `trendDeepDive` | **20** | **50** | 50 | 50 | Hard run cap |
| `fullPostBuilderRuns` | **15** | **40** | 40 | 40 | Hard run cap |
| `nicheIntel` | **5** | **20** | 20 | 20 | Hard run cap |
| `planBuilder7Day` | **3** | **15** | 10 | 10 | Hard run cap |
| `planBuilder14Day` | **0** | **5** | 5 | 5 | Essentials blocked |
| `igniteEngine` | **15** | **40** | 40 | 40 | Hard run cap |
| `contentRemix` | **10** | **30** | 30 | 30 | Hard run cap |

`null` means no per-feature run cap; the shared monthly pool (`TIER_CREDIT_POOLS`: Essentials 200, Pro 600) is the only limit.

These values have shifted from the prior known-good snapshot in the audit brief:

- Essentials `trendDeepDive` is **20**, not 0.
- Essentials `nicheIntel` is **5**, not 0.
- Essentials `contentRemix` is **10**, not 0.
- Essentials `fullPostBuilderRuns` is **15** (within the previously guessed 12–15 range).
- Pro `contentRemix` is **30** (not 75). Pro `nicheIntel` is **20**.

Related (not the primary comparison target, but it affects trial UX): `TRIAL_FEATURE_RUN_CAPS` at `src/config/creditConfig.js` lines 106–114.

| Feature | Essentials trial | Pro trial |
| --- | ---: | ---: |
| `planBuilder7Day` | 2 | 4 |
| `planBuilder14Day` | 0 | 4 |
| `igniteEngine` | 3 | 8 |
| `fullPostBuilderRuns` | 6 | 20 |
| `trendDeepDive` | 3 | 10 |
| `nicheIntel` | 2 | 5 |
| `contentRemix` | 3 | 10 |

---

## 2. Enforcement caveat (not copy, but it changes what customers actually get)

`FEATURE_RUN_CAPS` is the usage-gate source of truth. A second layer still UI-locks some features via `TIER_LIMITS` + `getFeatureLimit` + `FEATURES`.

- `FEATURES['niche-intel']` and `FEATURES['content-remix']` both include Essentials (`src/config/supabase.js` lines 320–321). Paid Essentials can open those pages.
- `TIER_LIMITS.essentials` includes `nicheIntel` and `contentRemix` (lines 203–204) but **does not define `trendDeepDive`** (Essentials block is lines 185–211; `trendDeepDive` first appears on Pro at line 216).
- `TrendDiscoveryHub` gates Deep Dive with `getFeatureLimit('trendDeepDive') > 0` (`src/components/TrendDiscoveryHub.jsx` line 141). For paid Essentials that resolves to `0`, so the lock screen shows even though `FEATURE_RUN_CAPS.trendDeepDive.essentials === 20`.
- Trial Essentials is different: `getFeatureLimit` consults `TRIAL_FEATURE_RUN_CAPS` first (`src/context/SubscriptionContext.jsx` lines 621–625), so an Essentials **trial** can Deep Dive (cap 3) while **paid** Essentials cannot.

The comment at `src/config/creditConfig.js` lines 102–104 describes this split as intentional for trial vs paid maps. This audit still compares **copy vs `FEATURE_RUN_CAPS`**, and flags the Deep Dive UI lock as a live-product split.

---

## 3. Surfaces checked

| Surface | Path | Status |
| --- | --- | --- |
| Public pricing (live) | `src/LandingPage.jsx` (`PricingSection`) | Live on `/` |
| Public FAQ | `src/LandingPage.jsx` `FAQ_ITEMS` | Live |
| Feature carousel | `src/components/magicui/FeatureShowcase.jsx` | Live on `/` |
| In-app plans | `src/pages/Subscription.jsx` | Live |
| Stripe plan bullets (in-app billing switcher) | `src/services/stripeAPI.js` `SUBSCRIPTION_PLANS` | Live via `BillingManagementPanel` |
| Upgrade modal | `src/components/UpgradeModal.jsx` | Live |
| Usage meters | `src/components/RunCapMeter.jsx`, `src/components/AIUsageMeter.jsx` | Live; numbers come from config, not hardcoded caps |
| Help Center | `src/pages/Help.jsx` | Live |
| Sidebar | `src/components/Sidebar.jsx` | Live |
| Tool lock screens / toasts | Niche Intel, Trend Lab Deep Dive, Ignite, Full Post Builder, Plan Builder | Live |
| Founders closed page | `src/pages/FoundersPage.jsx` | Live at `/founders` |
| Login promo list | `src/pages/Login.jsx` | Live |
| `/coaches` landing | — | **Does not exist** (no route in `src/App.jsx`, no coach landing page) |
| Unused pricing duplicate | `src/components/landing/Pricing.jsx` | **Not imported anywhere** |
| Unused comparison matrix | `src/components/FeatureAccessList.jsx` | **Defined, never imported** |
| Unused Founders modal copy | `src/components/landing/Modals.jsx` | **Not imported anywhere** |

---

## 4. Summary table of mismatches

Severity: **overpromise** = customer is told they get more than `FEATURE_RUN_CAPS` grants. **under-advertise** = copy withholds a feature the caps grant. **wrong number** = numeric cap in copy is simply stale.

| ID | Where | What the copy says | What `FEATURE_RUN_CAPS` enforces | Match? | Severity |
| --- | --- | --- | --- | --- | --- |
| M1 | `src/LandingPage.jsx` L1231–1232 | “Every plan includes full access to all AI tools.” | Essentials `planBuilder14Day` is **0**. Several tools are Pro-only in `FEATURES` (Content Repurposer, Huttle Agent, Trend Forecaster). | No | **Overpromise (customer-facing)** |
| M2 | `src/components/magicui/FeatureShowcase.jsx` L263–265 | AI Plan Builder: “Generate complete 7-day and 14-day content calendars…” with no tier qualifier, on the public homepage. | Essentials 7-day **3**, 14-day **0**. | No | **Overpromise (customer-facing)** |
| M3 | `src/LandingPage.jsx` L53–54 FAQ | “Pro adds higher limits, Niche Intel, Full Trend Lab access, and more advanced planning tools.” Implies Essentials has none of those. | Essentials Niche Intel **5**, Deep Dive **20**, Remix **10**, 7-day plans **3**. Pro adds higher caps + 14-day (**5**). | No | **Under-advertise + Pro positioning** |
| M4 | `src/LandingPage.jsx` L1357–1364 Pro card | Lists “14-Day AI Plan Builder”, “Full Trend Lab access”, “Niche Intel” as Pro extras. | 14-day Pro-only is correct (`0` vs `5`). Niche Intel and Deep Dive caps exist on Essentials. | Partial | **Under-advertise Niche Intel / Deep Dive**; 14-day matches |
| M5 | `src/LandingPage.jsx` L1294–1306 Essentials card | Lists “AI Plan Builder”, “Content Remix Studio”, “Ignite Engine” with no run caps. | Remix **10**, Ignite **15**, 7-day **3**, 14-day **0**. Access claims for Remix/Ignite/7-day match; unqualified “AI Plan Builder” hides the 14-day lock. | Partial | **Minor** on 7-day omission of numbers; 14-day hole is covered by M1/M2 |
| M6 | `src/pages/Help.jsx` L49–50 | “Niche Intel is an AI-powered research engine on Pro and Founders Club plans.” | Essentials **5**, Pro **20**. | No | **Under-advertise (customer-facing)** |
| M7 | `src/pages/Help.jsx` L175, L182 | Description “(Pro)”. Tip: “Available on Pro (annual) and Founders Club”. | Essentials **5**; Pro monthly also has **20**, not annual-only. | No | **Under-advertise + wrong qualifier** |
| M8 | `src/pages/Help.jsx` L54 | Deep Dive “…(Essentials/Pro).” | Essentials **20**, Pro **50**. Copy matches caps. Paid Essentials is still UI-locked via missing `TIER_LIMITS.essentials.trendDeepDive`. | Caps: yes. Live UI: no | **Flag as enforcement split**, not a caps mismatch |
| M9 | `src/components/Sidebar.jsx` L150 | Niche Intel nav badge `"Pro"`. | Essentials **5**. | No | **Under-advertise (in-app)** |
| M10 | `src/pages/NicheIntel.jsx` L409, L411 | Button “Upgrade to Pro to Unlock”. Footer “Pro: 5 analyses/month • Founders: 10 analyses/month”. | Pro **20**, Founder **20**, Essentials **5**. | No | **Wrong numbers (customer-facing)**; Pro-gate copy conflicts with Essentials cap |
| M11 | `src/services/stripeAPI.js` L160–167 | Pro bullets: “Everything in Essentials”, then “Content Remix Studio”, “Trend Lab”, “Ignite Engine” as if those were Pro extras. Rendered in `BillingManagementPanel` L185–191. | Essentials already has Remix **10**, Ignite **15**, Trend Pulse uncapped, Deep Dive **20**. | No | **Under-advertise / contradictory Pro list** |
| M12 | `src/pages/Subscription.jsx` L20 vs L28 | Essentials: “All AI Power Tools”, “Content Vault”. Pro: “Full Pro feature set”. No per-feature run caps. | Same access split as above; no numeric lie, but Essentials list is thinner than the live landing card and than the caps. | Soft | **Minor internal inconsistency** |
| M13 | `src/components/UpgradeModal.jsx` L83–94 `default` | Used for `nicheIntel`, `deepDive`, `fullPostBuilder` (those keys are missing). Title “Upgrade Your Plan”, benefits start with “600 AI generations per month”, “Advanced trend forecasting”, “Content Repurposer”, “Huttle Agent”. | Full Post Builder Essentials **15** (already entitled). Niche Intel Essentials **5**. Deep Dive Essentials **20**. Default modal sells Pro as if the locked feature were Pro-only. | No | **Overpromise of Pro positioning** when Essentials already has the feature |
| M14 | `src/context/NotificationContext.jsx` L207–217 | “Upgrade to Pro for unlimited AI access!” and “Consider upgrading for unlimited access.” | Pro pool is **600**, not unlimited. Run caps still apply (e.g. Full Post **40**, Ignite **40**). | No | **Overpromise (customer-facing)** |
| M15 | `src/utils/tierConfig.js` L25 | Pro description: “Unlimited power tools and advanced trend intelligence.” | Pro has hard caps (Deep Dive **50**, Full Post **40**, Remix **30**, etc.). | No | **Minor puffery**; same unlimited lie as M14 in weaker form |
| M16 | `src/pages/FoundersPage.jsx` L52–53 | “full access to Huttle AI through Essentials and Pro plans” | Essentials is not full access (`planBuilder14Day` **0**, plus Pro-only tools in `FEATURES`). | No | **Overpromise (customer-facing)** |
| M17 | `src/LandingPage.jsx` L503 (Founders modal) | “All Pro Features” described as “Ignite Engine, Content Remix Studio, Trend Deep Dive, and more” | Those three are in Essentials caps (15 / 10 / 20), not Pro-exclusive. | No | **Under-advertise / stale Pro packaging** |
| M18 | `src/components/TrendDiscoveryHub.jsx` L415 | Toast when locked: “Deep Dive is available for Essentials and Pro plans” | Caps: Essentials **20**. The toast fires when `canAccessDeepDive` is false, which is true for paid Essentials because of `TIER_LIMITS`. | Caps match the sentence; UX contradicts it | **Customer-facing confusion** |
| M19 | `src/components/TrendDiscoveryHub.jsx` L1049–1057 | Lock badge “Pro”. Heading “Unlock Deep Dive Analysis”. | Caps give Essentials **20**. UI treats it as Pro. | No vs caps | **Tied to M8 enforcement split** |

### Matches (no action)

| Where | Copy | Caps | Result |
| --- | --- | --- | --- |
| `src/components/UpgradeModal.jsx` L78–79 | “Essentials: 15 briefs/month”, “Pro: 40 briefs/month” | `igniteEngine` 15 / 40 | **Match** |
| `src/pages/IgniteEngine.jsx` L689 | “Upgrade to Essentials or Pro to unlock…” | Essentials **15** | **Match** (access claim) |
| `src/pages/Help.jsx` L209 | Ignite “available on Essentials and Pro plans” | Essentials **15** | **Match** |
| `src/pages/FullPostBuilder.jsx` L1397 | “Available on Essentials, Pro, and Founders Club plans.” | Essentials **15** (access yes; no numeric cap stated) | **Match** on access |
| `src/pages/AIPlanBuilder.jsx` L1112, L1493–1495 | “14-day plans require Pro or above.” / “14-Day Plans — Pro” | Essentials **0**, Pro **5** | **Match** |
| `src/components/AIFeatureLock.jsx` L37–38 | “Essentials: 200 AI generations/month”, “Pro: 600…” | `TIER_CREDIT_POOLS` 200 / 600 (pool, not run cap) | **Match** |
| `src/LandingPage.jsx` L1296, L1359 and `Subscription.jsx` L20, L28 | 200 / 600 generations | Pool 200 / 600 | **Match** |
| `RunCapMeter` / `AIUsageMeter` | `X/Y {feature} runs` from `getFeatureRunCap` | Live caps | **Match** (no hardcoded tier numbers) |
| `src/pages/Help.jsx` L38 | Full Post “bills 4 credits” per guided run | `FEATURE_CREDIT_COSTS.fullPostBuilderRuns === 4` | **Match** (cost, not cap) |

---

## 5. Per-mismatch recommendation

### M1 — “Every plan includes full access to all AI tools”

**The copy should match the code** (stop advertising every tool on Essentials).

Cheaper/safer: rewrite the pricing subhead. Raising Essentials to include 14-day plans and Pro-only tools would add model cost and erase the Pro differentiator.

**Customer-facing overpromise.**

### M2 — Homepage Plan Builder carousel claims 7-day and 14-day

**The copy should match the code** (qualify 14-day as Pro, or say “7-day on Essentials, 14-day on Pro”).

Cheaper/safer: one sentence in `FeatureShowcase.jsx`. Raising `planBuilder14Day.essentials` from 0 is the expensive path (5-credit runs).

**Customer-facing overpromise** to visitors who then buy Essentials.

### M3 / M4 / M6 / M7 / M9 — Niche Intel sold as Pro-only while Essentials cap is 5

Product already grants Essentials 5 runs (`FEATURE_RUN_CAPS` + `FEATURES['niche-intel']` + `TIER_LIMITS.essentials.nicheIntel`).

**The copy should match the code** (say Essentials includes Niche Intel at 5/month, Pro at 20/month).

If the commercial intent is that Niche Intel is the Pro wedge, then **the code should match the copy** (set `nicheIntel.essentials` to 0 and remove Essentials from `FEATURES['niche-intel']`). That is cheaper on API spend but takes a shipped entitlement away from current Essentials customers.

Safer for people already on Essentials: keep cap 5 and fix Help, FAQ, sidebar badge, and Pro card. Do not set the cap to 0 without a product decision.

**Mostly under-advertise, not overpromise.** Help calling it Pro-only is the loudest in-app miss.

### M10 — Niche Intel lock footer “Pro: 5 / Founders: 10”

**The copy should match the code** (Pro 20, Founders 20). Optionally add “Essentials: 5” if M3 keeps Essentials access.

Cheaper/safer: edit the one footer string. Those numbers look like an old map and will make a Pro buyer think they only get 5.

**Customer-facing wrong number.** If this screen is shown to a logged-out or free user, it is also a Pro-gate overstatement.

### M11 — Stripe/billing Pro list repeats Remix, Trend Lab, Ignite as Pro extras

**The copy should match the code** (move those off the Pro-only list; they already sit on Essentials).

Cheaper/safer: change `SUBSCRIPTION_PLANS.PRO.features`. Putting them behind a real Pro lock would mean setting Essentials caps to 0 and adding UI locks, which contradicts the live landing Essentials card (M5).

**Minor-to-moderate in-app inconsistency** (billing switcher), not a homepage overpromise.

### M12 — In-app Subscription bullets vs landing Essentials card

**The copy should match the code** on both surfaces so Essentials lists the same tools.

Cheaper/safer: align `CURRENT_PLANS` with `LandingPage.jsx` (or both with a single source). Not an overpromise.

**Minor internal inconsistency.**

### M13 — UpgradeModal default used for features Essentials already has

**The copy should match the code**: add real `nicheIntel` / `fullPostBuilder` / `deepDive` configs, or stop routing those features through the Pro default.

Cheaper/safer: add three modal configs. Do not raise caps.

**In-app confusion**, especially Full Post Builder (Essentials already has it; the default modal sells Pro at 600 generations).

### M14 / M15 — “Unlimited” Pro AI

**The copy should match the code** (Pro is 600 credits plus per-feature caps).

Cheaper/safer: delete “unlimited”. Raising Pro to unlimited would destroy the run-cap margin model.

**Customer-facing overpromise** (notifications are the live one; `tierConfig` is milder puffery).

### M16 — Founders closed page “full access … through Essentials and Pro”

**The copy should match the code** (“Essentials covers the core workflow; Pro adds 14-day plans and higher caps”).

Cheaper/safer: one sentence on `/founders`.

**Customer-facing overpromise**, same family as M1.

### M17 — Founders modal treats Ignite / Remix / Deep Dive as Pro features

**The copy should match the code** (those are not Pro-exclusive under current caps).

Cheaper/safer: rewrite the three-feature list. Founders Club is closed, so this is lower traffic than `/` pricing.

**Stale packaging**, not a numeric overpromise.

### M8 / M18 / M19 — Deep Dive: caps say Essentials 20, UI says Pro

This is the sharpest product split in the audit.

- Caps: Essentials **20**.
- Help (L54) and the lock toast (L415) tell the user Essentials has Deep Dive.
- `getFeatureLimit('trendDeepDive')` is **0** for paid Essentials, so they see a Pro lock badge.

Pick one:

1. **The code should match the copy** (add `trendDeepDive: FEATURE_RUN_CAPS.trendDeepDive.essentials` to `TIER_LIMITS.essentials` so the UI lock matches the cap of 20). That is a TIER_LIMITS wiring fix, not a cap raise. It **does** spend Deep Dive API cost for paid Essentials (currently blocked).
2. **The copy should match the code** if the live lock is the intended product: set `FEATURE_RUN_CAPS.trendDeepDive.essentials` to **0**, and stop telling Help/toast users that Essentials has Deep Dive.

Cheaper on API: option 2 (keep the lock, zero the cap, fix Help/toast). Safer vs current Help copy: option 1 (honor the 20 that is already in `FEATURE_RUN_CAPS`). This needs an explicit product call; the two layers already disagree.

**Customer-facing confusion / possible overpromise** if a buyer reads Help, then hits the Pro lock after paying for Essentials.

---

## 6. Overpromise vs minor inconsistency

### Treat as real customer-facing overpromise

1. Homepage “Every plan includes full access to all AI tools” (M1) plus unqualified 14-day Plan Builder on the feature carousel (M2). A visitor can buy Essentials expecting 14-day plans and “all AI tools.”
2. “Upgrade to Pro for unlimited AI access” (M14). Pro is 600 credits with run caps.
3. Deep Dive Help + toast claiming Essentials access while paid Essentials is UI-locked (M8/M18/M19), if you treat the live lock as what the customer actually gets.
4. `/founders` “full access … through Essentials” (M16).

### Treat as under-advertise / stale Pro packaging (not an overpromise)

Niche Intel, Content Remix, and Ignite are granted to Essentials in `FEATURE_RUN_CAPS`, but Help, the sidebar Pro badge, the FAQ, and the Pro billing bullets still talk as if they were Pro-only. That is the opposite of overselling Essentials. The risk is confusing Pro buyers and hiding value from Essentials, not charging Essentials for something they cannot run (except Deep Dive, because of the UI lock).

### Treat as minor internal inconsistency

- In-app Subscription bullets vs landing Essentials card (M12).
- Unused `FeatureAccessList.jsx` (never mounted; incomplete feature list; no run caps).
- Unused `src/components/landing/Pricing.jsx` (L66 “Every plan includes full access to all AI tools”; Essentials bullets omit Remix/Ignite that the live `LandingPage.jsx` card includes). Not live today.
- `tierConfig` “Unlimited power tools” (M15).

### Hardcoded run-cap strings that are currently correct

Only Ignite Engine in `UpgradeModal` (“15 briefs/month” / “40 briefs/month”). Meters elsewhere read `getFeatureRunCap` at runtime.

---

## 7. `/coaches`

No `/coaches` route, page, or landing component exists in this tree. `src/App.jsx` public routes are `/`, `/founders`, legal pages, `/payment-success`, `/login`, `/onboarding`, `/dashboard/*`. Mentions of “coaches” are prompt/example copy only (`getBrandStoryContext.js`, `contentRemixSystemPrompt.js`).

---

## 8. What this audit did not change

No application code, Stripe config, subscription logic, or credit logic was modified. This file is the only added artifact.
