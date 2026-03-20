import { test, expect } from '@playwright/test';
import { mockAllAPIs, seedDemoState } from './helpers/mock-api';

test.describe('API error handling', () => {
  test('Grok proxy 500 — client fallback still produces captions (no crash)', async ({ page }) => {
    await seedDemoState(page);
    await mockAllAPIs(page);
    await page.route('**/api/ai/grok**', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'fail' }) });
    });
    await page.goto('/dashboard/ai-tools?tool=caption');
    await page.getByTestId('caption-topic-input').fill('resilience test topic');
    await page.getByTestId('generate-caption-button').click();
    await expect(page.getByTestId('ai-result-container')).toBeVisible({ timeout: 30000 });
  });

  test('unknown app route redirects to home', async ({ page }) => {
    await seedDemoState(page);
    await mockAllAPIs(page);
    await page.goto('/this-route-does-not-exist-xyz');
    await expect(page).toHaveURL(/\//);
  });
});
