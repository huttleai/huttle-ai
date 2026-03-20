import { test, expect } from './helpers/auth';
import { attachStrictErrorCollector } from './helpers/console';
import { gotoDashboard } from './helpers/navigation';

test.describe('Smoke', () => {
  test('critical path under 60s budget', async ({ page }) => {
    const detach = attachStrictErrorCollector(page);

    await page.goto('/');
    await expect(page.getByTestId('landing-hero')).toBeVisible();

    await gotoDashboard(page, '/dashboard');
    await expect(page.getByTestId('dashboard-greeting')).toBeVisible();
    const g0 = await page.getByTestId('dashboard-greeting').innerText();
    await page.waitForTimeout(10000);
    expect(await page.getByTestId('dashboard-greeting').innerText()).toBe(g0);

    await gotoDashboard(page, '/dashboard/ai-tools?tool=caption');
    await page.getByTestId('caption-topic-input').fill('smoke test caption topic');
    await page.getByTestId('generate-caption-button').click();
    await expect(page.getByTestId('ai-result-container')).toBeVisible({ timeout: 25000 });

    await gotoDashboard(page, '/dashboard/library');
    await gotoDashboard(page, '/dashboard/brand-voice');
    await gotoDashboard(page, '/dashboard/subscription');

    const subStatus = await page.evaluate(async () => (await fetch('/api/subscription-status')).status);
    expect(subStatus).not.toBe(404);
    const grokStatus = await page.evaluate(async () =>
      (await fetch('/api/ai/grok', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status
    );
    expect(grokStatus).not.toBe(404);

    const errs = detach();
    expect(errs, errs.join('\n')).toHaveLength(0);
  });
});
