import { test as base, expect, type Page } from '@playwright/test';
import { seedDemoState, setupMockApis } from './mock-api';

export const test = base.extend({
  page: async ({ page }, use) => {
    await seedDemoState(page);
    await setupMockApis(page);
    await use(page);
  },
});

export { expect };

export function hasRealAuthCredentials() {
  return Boolean(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);
}

export async function loginAsTestUser(page: Page) {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set for real auth tests.');
  }

  await page.goto('/dashboard/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/)?$/);
}
