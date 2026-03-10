import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Viral Blueprint', () => {
  test('renders the blueprint builder inputs', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/viral-blueprint');

    await expect(page.getByRole('heading', { name: /viral blueprint/i })).toBeVisible();
    await expect(page.getByText(/generate blueprint/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /instagram/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /tiktok/i })).toBeVisible();
  });

  test('generates a mocked blueprint result', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/viral-blueprint');

    await page.getByRole('button', { name: /instagram/i }).click();
    await page.getByRole('textbox').first().fill('Creator workflow mistakes');
    await page.getByRole('textbox').nth(1).fill('Founders and creators');
    await page.getByRole('button', { name: /generate blueprint/i }).click();

    await expect(page.getByText(/viral score/i)).toBeVisible();
    await expect(page.getByText(/seo strategy/i)).toBeVisible();
  });
});
