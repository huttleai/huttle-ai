import { test, expect, hasRealAuthCredentials, loginAsTestUser } from './helpers/auth';

test.describe('Auth (dev bypass)', () => {
  test('dashboard is reachable when VITE_SKIP_AUTH mock user is active', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('sidebar')).toBeVisible();
  });

  test('/login redirects authenticated session toward dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('Auth (real Supabase)', () => {
  test.skip(!hasRealAuthCredentials(), 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD');

  test('login with valid credentials reaches dashboard', async ({ page }) => {
    await loginAsTestUser(page);
    await expect(page.getByTestId('sidebar-link-dashboard')).toBeVisible();
  });
});
