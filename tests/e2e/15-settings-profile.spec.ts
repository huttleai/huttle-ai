import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Settings & profile', () => {
  test('settings hub and profile route', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/settings');
    await expect(page.getByTestId('settings-billing-link')).toBeVisible();
    await gotoDashboard(page, '/dashboard/profile');
    await expect(page).toHaveURL(/\/dashboard\/brand-voice/);
    await expect(page.getByRole('heading', { name: /Brand Profile/i })).toBeVisible();
  });
});
