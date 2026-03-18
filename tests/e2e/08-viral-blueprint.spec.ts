import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Ignite Engine', () => { // HUTTLE AI: updated 3
  test('renders the blueprint builder inputs', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/ignite-engine'); // HUTTLE AI: updated 3

    await expect(page.getByRole('heading', { name: /ignite engine/i })).toBeVisible(); // HUTTLE AI: updated 3
    await expect(page.getByText(/generate blueprint/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /instagram/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /tiktok/i })).toBeVisible();
  });

  test('generates a mocked blueprint result', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/ignite-engine'); // HUTTLE AI: updated 3

    await page.getByRole('button', { name: /instagram/i }).click();
    await page.getByRole('textbox').first().fill('Creator workflow mistakes');
    await page.getByRole('textbox').nth(1).fill('Founders and creators');
    await page.getByRole('button', { name: /generate blueprint/i }).click();

    await expect(page.getByText(/viral score/i)).toBeVisible();
    await expect(page.getByText(/seo strategy/i)).toBeVisible();
  });
});
