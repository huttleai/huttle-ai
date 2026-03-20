import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Content Vault', () => {
  test('lists seeded vault content', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/library');
    await expect(page.getByRole('heading', { name: /Content Vault/i })).toBeVisible();
  });

  test('library tab: in-app AI tools link, create post modal, manual filter chip', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/library');
    await page.getByRole('button', { name: /All saved content/i }).click();

    const marketingLink = page.getByRole('link', { name: /Try AI Power Tools/i });
    await expect(marketingLink).toBeVisible();
    await expect(marketingLink).toHaveAttribute('href', '/dashboard/ai-tools');

    await expect(page.getByTestId('vault-create-post-button')).toBeVisible();
    await page.getByTestId('vault-create-post-button').click();
    await expect(page.getByTestId('vault-create-post-modal')).toBeVisible();
    await expect(page.getByPlaceholder(/Write your post/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Save to Vault/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /^Cancel$/i }).first().click();

    await expect(page.getByTestId('vault-filter-manual_post')).toBeVisible();
  });
});
