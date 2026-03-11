import { test, expect } from './helpers/auth';

test.describe('Public pages', () => {
  test('renders the landing page with core CTAs', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /founders/i }).or(page.getByRole('button', { name: /waitlist|get started|join/i }).first())
    ).toBeVisible();
  });

  test('submits the founders waitlist modal', async ({ page }) => {
    await page.goto('/founders');
    await page.getByRole('button', { name: /join waitlist instead/i }).click();

    await expect(page.getByRole('heading', { name: /join the waitlist/i })).toBeVisible();
    await page.getByPlaceholder(/first name/i).fill('Sean');
    await page.getByPlaceholder(/email/i).fill('sean@example.com');
    await page.getByRole('button', { name: /join the waitlist/i }).click();

    await expect(page.getByText(/successfully joined the waitlist/i)).toBeVisible();
  });

  test('renders legal and payment-success pages', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible();

    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();

    await page.goto('/payment-success');
    await expect(page.getByText(/welcome to huttle ai/i)).toBeVisible();
  });
});
