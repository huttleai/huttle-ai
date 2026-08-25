/**
 * Grok (xAI) Model Configuration — Single Source of Truth
 * --------------------------------------------------------
 * Every Grok call site (client services, page-level fetches, and Vercel
 * serverless proxies) imports the model id and per-feature reasoning effort
 * from this file. No Grok model string may appear anywhere else in the repo.
 *
 * IMPORTANT: This module is shared between the Vite client bundle and Vercel
 * Node serverless functions. Keep it a leaf module — no import.meta.env, no
 * Vite-only APIs, no imports beyond plain JS.
 */
/* global process */

// xAI retired all legacy Grok 3/4 fast + reasoning slugs on May 15, 2026 (they silently redirect here); changing this constant is the only edit needed for future migrations.
export const GROK_MODEL = 'grok-4.3';

/**
 * Feature key → reasoning_effort for grok-4.3.
 * Levels: 'none' (no reasoning, fastest/cheapest), 'low', 'medium', 'high'.
 * Reasoning tokens bill as output tokens; latency scales with effort.
 * This pass uses only 'none' and 'low' — do not add 'medium'/'high' without approval.
 */
export const GROK_EFFORT = Object.freeze({
  // Single-shot short-form tools — none
  caption: 'none',
  hookBuilder: 'none',
  hashtag: 'none',
  cta: 'none',
  contentQualityScorer: 'none',
  visualBrainstorm: 'none',
  dashboardWidget: 'none',
  optimizeTimes: 'none',
  performancePrediction: 'none',
  voiceTranscriptPolish: 'none',
  captionVariations: 'none',
  humanizerScore: 'none',
  trendIdeas: 'none',
  improveContent: 'none',
  visualIdeas: 'none',
  autoImprovePhrase: 'none',
  perplexityGrokFallback: 'none',

  // Long-form / multi-step generation — low
  fullPostBuilder: 'low',
  contentRemix: 'low',
  igniteEngine: 'low',
  contentRepurposer: 'low',
  contentPlan: 'low',
  platformRemixes: 'low',
  audienceInsights: 'low',
  nicheIntel: 'low',
});

/**
 * Resolve request params for a Grok feature.
 * Unknown keys are a bug (a typo would silently degrade output quality),
 * so we throw outside production and log loudly in production.
 * @param {string} featureKey - Key in GROK_EFFORT
 * @returns {{ model: string, reasoning_effort: 'none'|'low'|'medium'|'high' }}
 */
export function getGrokParams(featureKey) {
  const reasoningEffort = GROK_EFFORT[featureKey];
  if (!reasoningEffort) {
    const message = `getGrokParams: unknown featureKey "${featureKey}" — add it to GROK_EFFORT in src/config/grokConfig.js`;
    // Exact literal `process.env.NODE_ENV` is statically replaced by Vite in the
    // client bundle and read normally in Node serverless. If neither applies,
    // fail safe: warn instead of throwing.
    let isProduction = true;
    try {
      isProduction = process.env.NODE_ENV === 'production';
    } catch {
      isProduction = true;
    }
    if (!isProduction) {
      throw new Error(message);
    }
    console.error(message);
    return { model: GROK_MODEL, reasoning_effort: 'none' };
  }
  return { model: GROK_MODEL, reasoning_effort: reasoningEffort };
}
