import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Dashboard home', () => {
  test('renders welcome and core dashboard sections', async ({ page }) => {
    await gotoDashboard(page);

    await expect(page.getByText(/good morning|good afternoon|good evening/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /trending now/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /ai insights/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /quick create/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /recently saved/i })).toBeVisible();
  });

  test('lets you jump from dashboard quick create to AI tools', async ({ page }) => {
    await gotoDashboard(page);

    await page.getByRole('button', { name: /create content/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/ai-tools/);
  });

  test('shows daily alerts section', async ({ page }) => {
    await gotoDashboard(page);

    await expect(page.getByRole('heading', { name: /daily alerts/i })).toBeVisible();
  });
});
