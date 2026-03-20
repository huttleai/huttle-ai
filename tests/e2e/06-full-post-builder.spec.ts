import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Full Post Builder', () => {
  test('loads wizard and shows step controls', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/full-post-builder');
    await expect(page.getByRole('heading', { name: /Full Post Builder/i })).toBeVisible();
    await expect(page.getByText(/Topic|Hook|Caption|Hashtag|CTA/i).first()).toBeVisible();
  });

  test('Create from trending shows context banner and prefilled topic', async ({ page }) => {
    await gotoDashboard(page, '/dashboard');
    await expect(page.getByTestId('trend-card').first()).toBeVisible({ timeout: 60000 });
    await page.getByTestId('trend-create-button').first().click();
    await expect(page).toHaveURL(/full-post-builder/);
    await expect(page.getByTestId('trending-context-banner')).toBeVisible();
    await expect(page.getByTestId('trending-context-banner')).toContainText('Niche tutorial reel');
    await page.getByRole('button', { name: /Topic/i }).first().click();
    const topicField = page.getByPlaceholder(/5 morning habits that changed my productivity/i);
    await expect(topicField).toBeVisible();
    await expect(topicField).toHaveValue('Niche tutorial reel');
  });
});
