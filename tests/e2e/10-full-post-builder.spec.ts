import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Full Post Builder', () => {
  test('renders the five-step workflow', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/full-post-builder');

    await expect(page.getByRole('heading', { name: /full post builder/i })).toBeVisible();
    await expect(page.getByText(/step 1\/5/i)).toBeVisible();
    await expect(page.getByText(/topic/i).first()).toBeVisible();
    await expect(page.getByText(/hashtags/i).first()).toBeVisible();
    await expect(page.getByText(/cta/i).first()).toBeVisible();
  });

  test('walks through the first steps and reaches final actions', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/full-post-builder');

    await page.getByLabel(/topic/i).fill('Creator workflow systems');
    await page.getByRole('button', { name: /^next/i }).click();
    await expect(page.getByText(/most creators are doing this backwards/i)).toBeVisible();

    await page.getByRole('button', { name: /^next/i }).click();
    await expect(page.getByText(/most creators do not need more ideas/i)).toBeVisible();

    await page.getByRole('button', { name: /^next/i }).click();
    await expect(page.getByText(/#contentstrategy/i)).toBeVisible();

    await page.getByRole('button', { name: /^next/i }).click();
    await expect(page.getByText(/save this for your next content sprint/i)).toBeVisible();

    await page.getByRole('button', { name: /finish/i }).click();
    await expect(page.getByRole('button', { name: /copy all/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save to vault/i })).toBeVisible();
  });
});
