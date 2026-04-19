/**
 * Credit Configuration — Single Source of Truth
 * ----------------------------------------------
 * All tier credit pools, per-feature credit costs, and per-feature monthly
 * run caps live in this file. Every other file must IMPORT from here —
 * no inline hardcodes anywhere.
 *
 * Two-tier enforcement model:
 *   1. Monthly credit pool (`TIER_CREDIT_POOLS`): one shared bucket per tier.
 *      Each aiGenerations row written to user_activity consumes from this.
 *   2. Per-feature run cap (`FEATURE_RUN_CAPS`): hard monthly cap on the
 *      number of runs for a specific feature, regardless of pool remaining.
 *      `null` means "no run cap, pool is the only limit".
 *
 * Dashboard auto-generation rows (metadata.source === 'dashboard_daily_generation')
 * are EXCLUDED from the pool count — see usage gate and meter queries.
 */

export const TIER_CREDIT_POOLS = {
  builder: 800,
  founder: 800,
  pro: 600,
  essentials: 200,
  free: 0,
};

export const FEATURE_CREDIT_COSTS = {
  // 0 credits — always free, no pool deduction, no logging
  aiHumanizerScore: 0,
  algorithmChecker: 0,

  // 1 credit — pool only, no run cap
  captions: 1,
  hashtags: 1,
  hooks: 1,
  ctas: 1,
  scorer: 1,
  visuals: 1,
  aiHumanizerRewrite: 1,
  trendPulse: 1,
  /** Legacy storage key for Trend Pulse — same cost, preserved so historical
   *  user_activity rows keep counting. New code should prefer `trendPulse`. */
  trendQuickScan: 1,
  trendDeepDive: 1, // $0.045/call — run cap protects margin
  audienceInsights: 1,

  // 2 credits — run cap applies
  nicheIntel: 2,
  contentRemix: 2,

  // 3 credits — run cap applies
  planBuilder7Day: 3,
  igniteEngine: 3,

  // 4 credits — run cap applies
  fullPostBuilderRuns: 4,

  // 5 credits — run cap applies, Pro/Founder/Builder only
  planBuilder14Day: 5,
};

export const FEATURE_RUN_CAPS = {
  // null = no run cap; pool is the only limit
  captions: { essentials: null, pro: null, founder: null, builder: null },
  hashtags: { essentials: null, pro: null, founder: null, builder: null },
  hooks: { essentials: null, pro: null, founder: null, builder: null },
  ctas: { essentials: null, pro: null, founder: null, builder: null },
  scorer: { essentials: null, pro: null, founder: null, builder: null },
  visuals: { essentials: null, pro: null, founder: null, builder: null },
  aiHumanizerRewrite: { essentials: null, pro: null, founder: null, builder: null },
  trendPulse: { essentials: null, pro: null, founder: null, builder: null },
  trendQuickScan: { essentials: null, pro: null, founder: null, builder: null },
  audienceInsights: { essentials: null, pro: null, founder: null, builder: null },

  // Hard monthly run caps — RUN CAP is the binding limit for these features
  trendDeepDive: { essentials: 20, pro: 50, founder: 50, builder: 50 },
  fullPostBuilderRuns: { essentials: 15, pro: 40, founder: 40, builder: 40 },
  nicheIntel: { essentials: 5, pro: 20, founder: 20, builder: 20 },
  planBuilder7Day: { essentials: 3, pro: 10, founder: 10, builder: 10 },
  planBuilder14Day: { essentials: 0, pro: 5, founder: 5, builder: 5 },
  igniteEngine: { essentials: 15, pro: 40, founder: 40, builder: 40 },
  contentRemix: { essentials: 10, pro: 30, founder: 30, builder: 30 },
};

// Features that are disabled pending launch — render as Coming Soon
export const COMING_SOON_FEATURES = ['trendForecaster'];

/** Human-readable labels used in usage-gate error messages and meter rows. */
export const FEATURE_LABELS = {
  igniteEngine: 'Ignite Engine',
  contentRemix: 'Content Remix',
  nicheIntel: 'Niche Intel',
  planBuilder7Day: '7-Day Plan Builder',
  planBuilder14Day: '14-Day Plan Builder',
  fullPostBuilderRuns: 'Full Post Builder',
  trendDeepDive: 'Trend Deep Dive',
  trendPulse: 'Trend Pulse',
  audienceInsights: 'Audience Insights',
  captions: 'Caption Generator',
  hashtags: 'Hashtag Generator',
  hooks: 'Hook Builder',
  ctas: 'CTA Suggester',
  scorer: 'Quality Scorer',
  visuals: 'Visual Brainstormer',
  aiHumanizerRewrite: 'AI Humanizer Rewrite',
  aiHumanizerScore: 'AI Humanizer Score',
  algorithmChecker: 'Algorithm Checker',
};

/** Tiers that can access 14-day Plan Builder. */
export const PLAN_BUILDER_14DAY_TIERS = ['pro', 'founder', 'builder'];

/**
 * Dashboard-generated aiGenerations rows carry this source. They are
 * excluded from both the usage gate pool count and the AI meter display.
 */
export const DASHBOARD_GENERATION_SOURCE = 'dashboard_daily_generation';

/**
 * Return the start of the current calendar month as ISO string.
 * Used by both the usage gate and the meter.
 */
export function getStartOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Return the first of NEXT calendar month formatted like "May 1" — used
 * in reset messaging on the meter and in usage-gate rejection messages.
 */
export function getResetDateLabel() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/**
 * Look up the run cap for a given featureKey × tier.
 * Returns a number (cap), null (no cap), or undefined (feature not capped at all).
 */
export function getFeatureRunCap(featureKey, tier) {
  const caps = FEATURE_RUN_CAPS[featureKey];
  if (!caps) return undefined;
  return caps[tier];
}

/**
 * Look up the credit cost for a featureKey. Returns 0 for unknown features
 * so they cannot accidentally consume the pool without being declared.
 */
export function getFeatureCreditCost(featureKey) {
  const cost = FEATURE_CREDIT_COSTS[featureKey];
  return Number.isFinite(cost) ? cost : 0;
}

export function isComingSoonFeature(featureKey) {
  return COMING_SOON_FEATURES.includes(featureKey);
}
