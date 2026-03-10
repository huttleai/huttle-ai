import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Content Vault', () => {
  test('renders the vault shell, filters, and upload affordance', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/library');

    await expect(page.getByRole('heading', { name: /content vault/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search your content/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /images/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /videos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /text/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /upload content/i })).toBeVisible();
  });

  test('switches between grid and list affordances', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/library');

    await page.getByRole('button', { name: /list/i }).click();
    await page.getByRole('button', { name: /grid/i }).click();

    await expect(page.getByText(/storage/i).first()).toBeVisible();
  });
});
