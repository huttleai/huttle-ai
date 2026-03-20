import { test, expect } from './helpers/auth';
import { attachStrictErrorCollector } from './helpers/console';

test.describe('Landing page', () => {
  for (const width of [375, 768, 1024, 1440]) {
    test(`renders at ${width}px width`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      const detach = attachStrictErrorCollector(page);
      await page.goto('/');
      await expect(page.getByTestId('landing-hero')).toBeVisible();
      await expect(page.getByTestId('landing-nav')).toBeVisible();
      const errs = detach();
      expect(errs, errs.join('\n')).toHaveLength(0);
    });
  }

  test('hero, nav login, and key marketing copy', async ({ page }) => {
    const detach = attachStrictErrorCollector(page);
    await page.goto('/');
    await expect(page.getByTestId('landing-hero')).toContainText(/Know What to Post/i);
    await expect(page.getByTestId('landing-nav-login')).toBeVisible();
    await page.getByTestId('landing-nav-login').click();
    await expect(page).toHaveURL(/\/login|\/dashboard/);
    const errs = detach();
    expect(errs, errs.join('\n')).toHaveLength(0);
  });
});
