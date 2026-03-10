import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Niche Intel', () => {
  test('renders the niche analysis workspace', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/niche-intel');

    await expect(page.getByRole('heading', { name: /niche intel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /analyze now/i })).toBeVisible();
    await expect(page.locator('textarea').first()).toBeVisible();
  });

  test('runs analysis and exposes idea actions', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/niche-intel');

    await page.locator('textarea').first().fill('creator workflow automation');
    await page.getByRole('button', { name: /analyze now/i }).click();

    await expect(page.getByText(/trending themes|top hook patterns|content ideas/i).first()).toBeVisible();
  });
});
