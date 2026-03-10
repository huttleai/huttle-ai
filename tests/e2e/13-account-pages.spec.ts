import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Account pages', () => {
  test('renders profile and brand voice editors', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/profile');
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();

    await gotoDashboard(page, '/dashboard/brand-voice');
    await expect(page.getByText(/brand voice/i).first()).toBeVisible();
  });

  test('renders settings quick links and save action', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/settings');

    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /profile/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /billing/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save all settings/i })).toBeVisible();
  });

  test('renders security and help interactions', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/security');
    await expect(page.getByRole('heading', { name: /security/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /update password/i })).toBeVisible();

    await gotoDashboard(page, '/dashboard/help');
    await expect(page.getByRole('heading', { name: /help center/i })).toBeVisible();
    await page.getByText(/feedback/i).first().click();
    await expect(page.getByRole('heading', { name: /share your feedback/i })).toBeVisible();
  });
});
