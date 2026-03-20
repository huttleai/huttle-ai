import { test as base, expect, type Page } from '@playwright/test';
import { mockAllAPIs, seedDemoState } from './mock-api';

export const test = base.extend({
  page: async ({ page }, use) => {
    await seedDemoState(page);
    await mockAllAPIs(page);
    await use(page);
  },
});

export { expect };

export function hasRealAuthCredentials() {
  return Boolean(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);
}

/** Real Supabase login — requires TEST_USER_EMAIL / TEST_USER_PASSWORD and dev server without VITE_SKIP_AUTH. */
export async function loginAsTestUser(page: Page) {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set for real auth tests.');
  }

  await page.goto('/dashboard/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('login-button').click();
  await expect(page).toHaveURL(/\/dashboard(?:\/)?$/, { timeout: 30000 });
}
