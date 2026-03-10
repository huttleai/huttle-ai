import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

const smokeRoutes = [
  '/dashboard',
  '/dashboard/full-post-builder',
  '/dashboard/plan-builder',
  '/dashboard/ai-tools?tool=caption',
  '/dashboard/trend-lab',
  '/dashboard/niche-intel',
  '/dashboard/viral-blueprint',
  '/dashboard/content-remix',
  '/dashboard/library',
  '/dashboard/profile',
  '/dashboard/settings',
  '/dashboard/subscription',
  '/dashboard/help',
  '/dashboard/social-updates',
  '/dashboard/mockup-showcase',
];

test.describe('Smoke coverage', () => {
  for (const route of smokeRoutes) {
    test(`loads ${route}`, async ({ page }) => {
      await gotoDashboard(page, route);
      await expect(page.locator('#root')).not.toBeEmpty();
      await expect(page.locator('body')).toContainText(/huttle ai|dashboard|content|settings|founders/i);
    });
  }

  test('redirects the retired calendar route gracefully', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/calendar');
    await expect(page).not.toHaveURL(/\/dashboard\/calendar(?:\/)?$/);
    await expect(page).toHaveURL(/\/dashboard(?:\/login)?(?:\/)?$/);
    await expect(page.locator('#root')).not.toBeEmpty();
  });
});
