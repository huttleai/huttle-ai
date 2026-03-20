import { test, expect } from './helpers/auth';
import { dashboardRoutes, gotoDashboard } from './helpers/navigation';

test.describe('Navigation & layout', () => {
  test('sidebar links and notification bell', async ({ page }) => {
    await gotoDashboard(page, '/dashboard');
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('notification-bell')).toBeVisible();
    for (const item of dashboardRoutes) {
      await expect(page.getByTestId(item.testId)).toBeVisible();
    }
  });

  test('Content Vault label in sidebar', async ({ page }) => {
    await gotoDashboard(page, '/dashboard');
    await expect(page.getByTestId('sidebar-link-content-vault')).toContainText('Content Vault');
  });
});
