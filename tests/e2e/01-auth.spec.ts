import { hasRealAuthCredentials, test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Auth routes', () => {
  test('redirects auth entry points to dashboard in demo mode', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard(?:\/)?$/);

    await page.goto('/dashboard/login');
    await expect(page).toHaveURL(/\/dashboard(?:\/)?$/);

    await page.goto('/dashboard/signup');
    await expect(page).toHaveURL(/\/dashboard(?:\/)?$/);
  });

  test('validates the secure account password form', async ({ page }) => {
    await page.goto('/secure-account');
    await expect(page.getByRole('heading', { name: /welcome to huttle ai/i })).toBeVisible();

    await page.getByLabel('New Password').fill('short');
    await page.getByLabel('Confirm Password').fill('different');
    await page.getByRole('button', { name: /save & continue/i }).click();

    await expect(page.getByText(/password must be at least 6 characters|passwords do not match/i)).toBeVisible();
  });

  test('documents real auth coverage requirements', async ({ page }) => {
    test.skip(
      !hasRealAuthCredentials(),
      'Real login coverage requires TEST_USER_EMAIL and TEST_USER_PASSWORD and a server started without VITE_SKIP_AUTH.'
    );

    await gotoDashboard(page);
  });
});
