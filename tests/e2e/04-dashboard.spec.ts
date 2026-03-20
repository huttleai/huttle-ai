import { test, expect } from './helpers/auth';
import { attachStrictErrorCollector } from './helpers/console';
import { gotoDashboard } from './helpers/navigation';

test.describe('Dashboard', () => {
  test('greeting, widgets, hashtag refresh', async ({ page }) => {
    const detach = attachStrictErrorCollector(page);
    await gotoDashboard(page, '/dashboard');
    await expect(page.getByTestId('dashboard-greeting')).toBeVisible();
    await expect(page.getByTestId('trending-widget')).toBeVisible();
    await expect(page.getByTestId('hashtag-widget')).toBeVisible();
    await expect(page.getByTestId('sidebar-ai-meter')).toBeVisible();
    const refresh = page.getByTestId('dashboard-refresh-hashtags');
    if (await refresh.isEnabled().catch(() => false)) {
      await refresh.click();
      await page.waitForLoadState('networkidle').catch(() => {});
    }
    const before = await page.getByTestId('dashboard-greeting').innerText();
    await page.waitForTimeout(15000);
    const after = await page.getByTestId('dashboard-greeting').innerText();
    expect(after).toBe(before);
    const errs = detach();
    expect(errs, errs.join('\n')).toHaveLength(0);
  });

  test('Hashtags Trending vs For you lists differ when both tabs are shown', async ({ page }) => {
    const detach = attachStrictErrorCollector(page);
    await gotoDashboard(page, '/dashboard');
    await expect(page.getByTestId('hashtag-widget')).toBeVisible();

    const forYouTab = page.getByTestId('dashboard-hashtag-tab-for-you');
    if (!(await forYouTab.isVisible().catch(() => false))) {
      const errs = detach();
      expect(errs, errs.join('\n')).toHaveLength(0);
      return;
    }

    const readListSignature = async () => {
      const items = page.getByTestId('hashtag-widget').getByTestId('dashboard-hashtag-item');
      await expect(items.first()).toBeVisible({ timeout: 60000 });
      const count = await items.count();
      const parts: string[] = [];
      for (let i = 0; i < Math.min(count, 10); i++) {
        const t = (await items.nth(i).innerText()).split('\n')[0].trim();
        if (t) parts.push(t);
      }
      return parts.join('|');
    };

    await page.getByTestId('dashboard-hashtag-tab-trending').click();
    const trendingSig = await readListSignature();

    await forYouTab.click();
    const forYouSig = await readListSignature();

    expect(trendingSig.length).toBeGreaterThan(0);
    expect(forYouSig.length).toBeGreaterThan(0);
    expect(trendingSig).not.toEqual(forYouSig);

    const errs = detach();
    expect(errs, errs.join('\n')).toHaveLength(0);
  });
});
