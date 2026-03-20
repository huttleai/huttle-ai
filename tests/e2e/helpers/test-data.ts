/** Shared E2E constants — align with seed demo state / mocks */
export const TEST_USER = {
  id: 'dev-user-123',
  email: 'dev@huttle.ai',
  firstName: 'Sean',
} as const;

export const ROUTES = {
  landing: '/',
  dashboard: '/dashboard',
  login: '/login',
  aiToolsCaption: '/dashboard/ai-tools?tool=caption',
  fullPostBuilder: '/dashboard/full-post-builder',
  trendLab: '/dashboard/trend-lab',
  nicheIntel: '/dashboard/niche-intel',
  igniteEngine: '/dashboard/ignite-engine',
  contentRemix: '/dashboard/content-remix',
  planBuilder: '/dashboard/plan-builder',
  contentVault: '/dashboard/library',
  brandVoice: '/dashboard/brand-voice',
  subscription: '/dashboard/subscription',
  settings: '/dashboard/settings',
  profile: '/dashboard/profile',
  socialUpdates: '/dashboard/social-updates',
  onboarding: '/onboarding',
} as const;
