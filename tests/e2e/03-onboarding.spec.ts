import { test, expect } from './helpers/auth';

test.describe('Onboarding gate', () => {
  test('completed onboarding redirects /onboarding to dashboard', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('dashboard loads without forcing onboarding when flag is set', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-greeting')).toBeVisible();
  });
});
