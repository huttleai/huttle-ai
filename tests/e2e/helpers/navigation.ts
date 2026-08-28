import { expect, type Page } from '@playwright/test';

export const dashboardRoutes = [
  { label: 'Dashboard', href: '/dashboard', testId: 'sidebar-link-dashboard' },
  { label: 'Content Vault', href: '/dashboard/library', testId: 'sidebar-link-content-vault' },
  { label: 'Full Post Builder', href: '/dashboard/full-post-builder', testId: 'sidebar-link-full-post-builder' },
  { label: 'AI Plan Builder', href: '/dashboard/plan-builder', testId: 'sidebar-link-ai-plan-builder' },
  { label: 'AI Power Tools', href: '/dashboard/ai-tools?tool=caption', testId: 'sidebar-link-ai-power-tools' },
  { label: 'Trend Lab', href: '/dashboard/trend-lab', testId: 'sidebar-link-trend-lab' },
  { label: 'Niche Intel', href: '/dashboard/niche-intel', testId: 'sidebar-link-niche-intel' },
  { label: 'Ignite Engine', href: '/dashboard/ignite-engine', testId: 'sidebar-link-ignite-engine' },
  { label: 'Content Remix Studio', href: '/dashboard/content-remix', testId: 'sidebar-link-content-remix-studio' },
  { label: 'Brand Profile', href: '/dashboard/brand-voice', testId: 'sidebar-link-brand-profile' },
  { label: 'Social Updates', href: '/dashboard/social-updates', testId: 'sidebar-link-social-updates' },
  { label: 'Settings', href: '/dashboard/settings', testId: 'sidebar-link-settings' },
  { label: 'Help', href: '/dashboard/help', testId: 'sidebar-link-help' },
];

export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20000 });
}

export async function gotoDashboard(page: Page, path = '/dashboard') {
  await page.goto(path);
  await waitForAppReady(page);
}

/**
 * Most dashboard E2E specs assume dev auth bypass. If the login form is visible, the dev server
 * was likely started without VITE_SKIP_AUTH=true (common when PW_REUSE_SERVER=1).
 */
export async function assertDevAuthBypassForDashboardE2E(page: Page) {
  const loginEmail = page.getByTestId('email-input');
  const visible = await loginEmail.isVisible().catch(() => false);
  if (!visible) return;

  throw new Error(
    'Dashboard E2E expects a logged-in or bypassed session, but the login form is visible. ' +
      'Start Vite with VITE_SKIP_AUTH=true (e.g. `VITE_SKIP_AUTH=true npm run dev`) before using ' +
      'PW_REUSE_SERVER=1, or stop the process on port 5173 and let Playwright start the server. ' +
      'See playwright.config.ts.',
  );
}

export async function expectSidebar(page: Page) {
  await expect(page.getByTestId('sidebar')).toBeVisible();
  await expect(page.getByTestId('sidebar-link-dashboard')).toBeVisible();
}

export async function openFab(page: Page) {
  const fab = page.getByTestId('floating-action-button');
  await expect(fab).toBeVisible();
  await fab.click();
}
