import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('AI Plan Builder', () => {
  test('renders the planning form', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/plan-builder');

    await expect(page.getByRole('heading', { name: /ai plan builder/i })).toBeVisible();
    await expect(page.getByText(/generate your content strategy/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /generate ai plan/i })).toBeVisible();
  });

  test('creates a mocked plan and shows generated output', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/plan-builder');

    await page.getByRole('combobox').first().selectOption({ index: 1 });
    await page.getByRole('button', { name: /instagram/i }).click();
    await page.getByRole('button', { name: /tiktok/i }).click();
    await page.getByRole('button', { name: /generate ai plan/i }).click();

    await expect(page.getByText(/three systems creators can steal this week/i)).toBeVisible();
    await expect(page.getByText(/instagram/i).first()).toBeVisible();
  });
});
