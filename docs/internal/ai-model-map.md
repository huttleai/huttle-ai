# Huttle AI — internal AI model map

**Purpose:** Single place to see which provider/model powers each feature, and where to change IDs when vendors ship new models (e.g. bump Claude Sonnet `4-6` → `4-7`).

**Last reviewed:** 2026-03-26 (verify against repo after any AI-related PR).

---

## Quick upgrade checklist

| Provider | What to change | Notes |
|----------|----------------|--------|
| **Anthropic (Claude)** | `DEFAULT_CLAUDE_MODEL` + `CLAUDE_MODEL_ALIASES` in `api/ai/claude.js`; same pattern in `api/ai/content-remix.js` | Client sends model from `src/services/claudeAPI.js` (`CLAUDE_MODEL`). Update **all** three if you want one global Sonnet version. |
| **Anthropic (Humanize-only)** | `HUMANIZE_MODEL` in `api/ai/humanize.js` | Currently a snapshot id; align with main Claude proxy aliases if Anthropic deprecates snapshots. |
| **xAI (Grok)** | Env: `GROK_CHAT_MODEL`, `GROK_MODEL`, `GROK_MODEL_NON_REASONING`, `GROK_FAST_MODEL`, `GROK_REASONING_MODEL`, `GROK_MODEL_REASONING` | Server default: `api/ai/grok.js` (`DEFAULT_GROK_MODEL`). Client “fast vs reasoning” is baked at **build time** in `vite.config.js` → `__GROK_FAST_MODEL__` / `__GROK_REASONING_MODEL__` (must **rebuild** after env changes). |
| **Perplexity** | `MODEL_CONFIG` in `api/ai/perplexity.js` | Feature keys (`perplexityFeature` / `cache.type`) map to `sonar`, `sonar-pro`, or `llama-3.1-sonar-small-128k-online`. |
| **Trend Deep Dive (standalone route)** | `MODEL` in `api/ai/deep-dive.js` | **Separate** from `api/ai/perplexity.js` — today hardcoded `sonar-pro`. |

---

## Provider defaults (code + env)

### Claude (Anthropic)

| Location | Constant / behavior |
|----------|---------------------|
| `api/ai/claude.js` | `DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-6'`; aliases include `claude-sonnet-4-6-20250514` |
| `src/services/claudeAPI.js` | `CLAUDE_MODEL = 'claude-sonnet-4-6'` on each request |
| `api/ai/content-remix.js` | Same as main Claude proxy (`DEFAULT_CLAUDE_MODEL` + aliases) |
| `api/ai/humanize.js` | `HUMANIZE_MODEL = 'claude-sonnet-4-6-20250514'` |

**Env:** `ANTHROPIC_API_KEY` (server only).

### Grok (xAI)

| Location | Behavior |
|----------|----------|
| `api/ai/grok.js` | Resolves default from env chain; fallback `grok-4-1-fast-non-reasoning`. Request body may pass `model` (sanitized). |
| `src/services/grokAPI.js` | `getGrokModel('fast' \| 'reasoning')` uses Vite-injected `__GROK_FAST_MODEL__` / `__GROK_REASONING_MODEL__`. Many flows use **reasoning** for “quality” retries (e.g. Hook Builder, Full Post hooks fallback). |

**Env:** `GROK_API_KEY`, plus model overrides listed in the checklist above.

### Perplexity

| Feature key (`perplexityFeature` or derived from `cache.type`) | Model (`api/ai/perplexity.js`) |
|----------------------------------------------------------------|---------------------------------|
| `dashboard_trending`, `quick_scan`, unknown string `cache.type` (e.g. `caption_patterns`, `hook_patterns`, `visual_patterns`) | `sonar` |
| `full_post_hashtags` | `sonar` |
| `deep_dive` (`cache.type === 'niche_intel'`) | `sonar-pro` |
| `audience_insights` | `llama-3.1-sonar-small-128k-online` |
| `cta_suggester` | `llama-3.1-sonar-small-128k-online` |

**Note:** Calls with **no** `cache` object resolve to `quick_scan` → `sonar` (e.g. some dashboard helpers).

**Env:** `PERPLEXITY_API_KEY`.

### Standalone Deep Dive API route

| File | Model |
|------|--------|
| `api/ai/deep-dive.js` (also re-exported as `api/ai/trend-deep-dive.js`) | `sonar-pro` (hardcoded `MODEL`) |

---

## Product / feature → models (logical routing)

Entries list the **intended** primary path; many flows fall back (e.g. Claude → Grok, Perplexity → Grok). Implementation detail lives in `src/services/grokAPI.js`, `src/services/claudeAPI.js`, `src/services/perplexityAPI.js`, and `src/pages/*`.

### Full Post Builder (`src/pages/FullPostBuilder.jsx`)

| Step | Primary | Fallback / notes |
|------|---------|------------------|
| Hooks | Claude (`generateFullPostHooksWithClaude`) | Grok reasoning → Grok fast → Hook Builder theme |
| Caption | Grok | — |
| Caption enhance | Claude (`enhanceCaptionWithClaude`) | Grok |
| Hashtags (grounded) | Perplexity `full_post_hashtags` → **sonar** | Perplexity `quick_scan` → **sonar**; then Grok `generateHashtags` |
| CTA | Grok | — |
| Content quality score | Claude | Grok |
| Human / humanness | Claude | Grok reasoning |
| Algorithm alignment | **No LLM** — `src/data/algorithmSignals` + `AlgorithmChecker` | — |

### Hook Builder & caption/hashtag/CTA tools (`src/services/grokAPI.js`)

| Export / area | Typical Grok mode | Other |
|---------------|-------------------|--------|
| `generateHooks` | reasoning, then fast | — |
| `generateCaption`, styled/generic CTAs, variations, remix, visual ideas, improve/polish, niche analysis | fast and/or reasoning (see call sites) | Some use `max_tokens` / quality mode |
| `generateFullPostHooks` | fast, then reasoning | — |
| `generateHashtags` | fast | Perplexity **skipped** when `fullPostBuilder: true`; otherwise may use `getRealtimeHashtagResearch` → Perplexity **sonar** (`cache.type: hashtags`) |
| `scoreContentQuality` | Grok (if Claude fails) | **Claude first** |
| `scoreHumanness` | Grok | **Claude first** |
| `predictPerformance` | Grok reasoning | May use Perplexity `getTrendContextForPrediction` → **sonar** (no cache) |

### AI Power Tools — live research prefetch (`src/services/perplexityAPI.js` → `runToolResearch`)

Used to feed Grok context (caption/hook/visual pattern bullets). `cache.type` is a custom string → proxy maps to **sonar** (`quick_scan`).

### Dashboard / intelligence (`perplexityAPI.js` + `dashboardCacheService.js`)

| Capability | Perplexity routing | Notes |
|------------|-------------------|--------|
| Trending topic scan (`scanTrendingTopics`) | `trending` cache → **sonar** | |
| Niche research (`researchNicheContent`) | `niche_intel` → **sonar-pro** | |
| Keywords / competitors / forecast / trending hashtags / caption examples / CTA practices / social updates / trend context | No feature key or generic → **sonar** | |
| `getAudienceInsights` | **Grok** (not Perplexity) | Despite cache `type: 'audience_insights'`, implementation uses `callGrokAPI` in `perplexityAPI.js` |

Dashboard cache refresh paths may also call Grok directly — see `src/services/dashboardCacheService.js` (includes hardcoded `grok-4.1-fast-reasoning` in some requests; normalize to env-driven IDs when touching that file).

### Trend Deep Dive (workflow)

| Path | Model |
|------|--------|
| Client → `/api/ai/deep-dive` | **sonar-pro** (`deep-dive.js`) |
| Niche intel from app research | Perplexity via main proxy → **sonar-pro** (`deep_dive` / `niche_intel`) |

### Other surfaces

| Feature | Models / route |
|---------|----------------|
| **Content Remix Studio** | Primary: `api/ai/content-remix.js` → **Claude** (same Sonnet stack as main Claude proxy). Fallback: legacy `api/ai/n8n-generator.js` (n8n — **model configured in n8n**, not in this repo). |
| **Humanize** | `api/ai/humanize.js` → **Claude** (`HUMANIZE_MODEL`) |
| **Ignite Engine** | Primary: n8n webhook (`api/ignite-engine-proxy.js`). Fallback JSON: `IgniteEngine.jsx` → `/api/ai/grok` with **default** Grok from proxy (no explicit model in snippet — uses server default unless client sends `model`). |
| **AI Plan Builder** | n8n (`api/create-plan-builder-job.js`) — **model in n8n workflow** |
| **Optimize posting times** | `src/services/optimizeTimesAPI.js` → Grok (hardcoded `grok-4.1-fast-reasoning` in body — consider aligning with `getGrokModel`) |
| **Content Repurposer** (`ContentRepurposer.jsx`) | Grok fetch uses **`grok-4.1-fast-reasoning`** in request body |
| **update-social-media** (`api/update-social-media.js`) | Perplexity **`sonar`** |

---

## n8n / external workflows

These features **do not** define the LLM in this repository’s model map; update the workflow in n8n (or the webhook’s downstream nodes):

- Ignite Engine (`N8N_IGNITE_ENGINE_WEBHOOK`)
- Plan Builder (`N8N_PLAN_BUILDER_WEBHOOK_*`)
- Legacy generator (`N8N_WEBHOOK_URL_GENERATOR`)

---

## Tests & mocks

- `tests/e2e/helpers/mock-api.ts` may reference fixed model strings (e.g. `claude-sonnet-4-6-20250514`) — update when changing defaults so E2E stays consistent.

---

## Changelog (maintain when you bump models)

| Date | Change |
|------|--------|
| 2026-03-26 | Initial map; Full Post Builder hashtags use Perplexity `full_post_hashtags` → `sonar`. |
