/**
 * Premium, product-grade strings shared across surfaces.
 * Keeps tone: calm, confident, specific — avoid generic SaaS filler.
 */

export const USAGE = {
  meterLimitReached: 'You’ve hit this feature’s monthly limit. It resets on the 1st.',
  meterAlmostThere: (n) => `${n} left this month`,
  aiCreditsHint: 'Credits count toward your monthly AI pool. Feature caps (where shown) apply separately.',
};

export const DASHBOARD = {
  trendsLoadingStatus: 'Syncing today’s trend signals…',
  trendsInfoTitle: 'Refreshes on your daily dashboard schedule. Tip icon shows timing.',
  trendsEmptyTitle: 'No live trends loaded yet',
  trendsEmptyHint: 'Refresh pulls the latest pack. If the feed is quiet, we still show curated angles so you always have six ideas to act on.',
  trendsRetry: 'Refresh trends',
  trendsErrorHint: 'Something interrupted the feed. Your account is fine — retry or reload the page.',
  sampleTrendBadge: 'Curated fill-in',
  trendDeepCta: 'Research this',
  trendCreateCta: 'Build post',
  hashtagsSubtitleTrending: 'Broad discovery tags tuned to your platforms',
  hashtagsSubtitleForYou: 'Tags aligned to your Brand Voice',
  hashtagsDailyNote: 'Next refresh: 6:00 AM your local time',
  vaultEmptyHint: 'Save from any AI tool or upload assets — your vault becomes the home for everything you ship.',
};

export const FULL_POST = {
  tagline: 'One topic → one publish-ready post',
  usageExplainer: (credits) =>
    `One “run” counts when hooks generate successfully (uses ${credits} AI credits). Refining hook style in the same visit stays on that run — caption, hashtags, and CTA steps don’t add another run.`,
  brandContextTitle: 'Brand context',
  completionTitle: 'You’re ready to publish',
  completionSummary: (platform) =>
    `Your ${platform} post is assembled below. Copy to your app, save to your vault, or drop it on the calendar — scores are guidance, not a gate.`,
  loadingHooks: 'Shaping hooks for your topic…',
  loadingHooksSub: 'Matching tone to your brand context',
  loadingCaption: 'Writing the caption body…',
  loadingCaptionSub: 'Tuned for your platform’s format',
  loadingHashtags: 'Ranking hashtag tiers…',
  loadingHashtagsSub: 'Balancing reach and relevance',
  loadingCtas: 'Drafting CTA options…',
  loadingCtasSub: 'Aligned to your stated goal',
  loadingScore: 'Running quality passes…',
  loadingScoreSub: 'Quality, human tone, and feed fit',
};

export const NICHE_INTEL = {
  tagline: 'See what’s working — then ship faster',
  loading: 'Scanning live signals and compressing them into moves you can post today…',
  loadingSub: 'Usually under a minute',
  inputHint: 'Keywords, niches, or @handles — we’ll stress-test what’s rising on your platform.',
  analyzeCta: 'Run analysis',
  analyzingCta: 'Working…',
  emptyPromptTitle: 'Run your first intel pass',
  emptyPromptBody: 'You’ll get themes with momentum, hook templates, gaps competitors skip, and executable ideas — each one opens in Full Post Builder in one tap.',
  resultsEyebrow: 'Strategic snapshot',
};

export const PLAN_BUILDER = {
  tagline: 'Turn goals into a dated posting roadmap',
  generatingTitle: 'Building your calendar…',
  generatingBody: 'We’re locking platforms, mix, and day-by-day posts. You can leave this page — your plan appears here when the workflow finishes.',
  readyTitle: 'Ready when you are',
  readyBody: 'You’ll get a day-by-day roadmap with suggested times — then open any slot in Full Post Builder.',
  successToast: 'Your plan is ready',
  failToast: 'We couldn’t finish this plan. Adjust inputs and try again, or contact support if it repeats.',
  summaryBlurb: 'Each card is a slot you can execute or save — start with Day 1 for momentum.',
  mixLabel: 'Content mix',
  nextStepsTitle: 'Recommended next steps',
  nextStepBuilder: 'Open any day in Full Post Builder to draft the full caption stack.',
  nextStepVault: 'Save the full JSON plan to your vault for long-term reference.',
  removeVagueGenerations: 'Estimated effort to produce',
  removeVagueGenerationsValue: (n) => `~${n} drafting sessions`,
};

export const IGNITE = {
  loadingRotating: [
    'Pulling what’s winning on-platform…',
    'Mapping your audience + offer to native formats…',
    'Assembling hook → script → visual direction…',
    'Locking timing and frequency hints…',
  ],
  resultsReady: 'Brief ready',
  resultsSubtitle: 'Execution-ready Ignite Engine brief tuned to your platform and post type',
  successToast: 'Brief generated — review scores, then save or edit in Post Builder',
  errorCalm: 'We couldn’t complete this brief. Check connection and try again — nothing was saved.',
};

export const REMIX = {
  tagline: 'Same idea — native versions per platform',
  loading: 'Rewriting for each platform’s culture…',
  loadingSub: 'Claude first, with a fast fallback if needed',
  step1Hint: 'Longer paste = richer remix. Aim for a full paragraph or caption.',
  resultsTitle: 'Your platform-native set',
  resultsSubtitle: (mode) => `Optimized for ${mode === 'sales' ? 'conversion' : 'reach and saves'}`,
  errorRetry: 'Try again with shorter text, or switch mode — both paths use the same guardrails.',
};

export const VAULT = {
  postKitModalIntro: 'Choose how you want to start — you can always mix manual assets with AI output later.',
};

export const NOTIFICATIONS = {
  welcomeTitle: 'Welcome to Huttle AI',
  welcomeBody: 'Your workspace is live. Start with AI Tools or Trend Lab — everything you make can land in the Content Vault.',
};

/** For QA: every value must be a non-empty string (or array of strings). */
export function listMicrocopyExportsForQa() {
  return { USAGE, DASHBOARD, FULL_POST, NICHE_INTEL, PLAN_BUILDER, IGNITE, REMIX, VAULT, NOTIFICATIONS };
}
