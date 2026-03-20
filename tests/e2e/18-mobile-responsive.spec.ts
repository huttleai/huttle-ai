import { test, expect } from './helpers/auth';

test.describe('Mobile responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('landing and dashboard usable at 375px', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('landing-hero')).toBeVisible();
    await page.goto('/dashboard');
    await expect(page.getByTestId('sidebar-mobile-toggle')).toBeVisible();
    await page.getByTestId('sidebar-mobile-toggle').click();
    await expect(page.getByTestId('sidebar-link-dashboard')).toBeVisible();
  });
});
