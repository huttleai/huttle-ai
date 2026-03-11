import { test, expect } from './helpers/auth';
import { dashboardRoutes, expectSidebar, gotoDashboard, openFab } from './helpers/navigation';

test.describe('Dashboard shell', () => {
  test('renders sidebar, ai meter, and sign-out affordance', async ({ page }) => {
    await gotoDashboard(page);

    await expectSidebar(page);
    await expect(page.getByTestId('sidebar-ai-meter')).toBeVisible();
    await expect(page.getByTestId('sidebar-sign-out')).toBeVisible();
  });

  test('shows all primary sidebar destinations', async ({ page }) => {
    await gotoDashboard(page);

    for (const route of dashboardRoutes) {
      await expect(page.getByTestId(route.testId)).toBeVisible();
    }
  });

  test('opens the floating action menu and navigates to plan builder', async ({ page }) => {
    await gotoDashboard(page);
    await openFab(page);

    await expect(page.getByTestId('fab-action-generate-plan')).toBeVisible();
    await page.getByTestId('fab-action-generate-plan').click();

    await expect(page).toHaveURL(/\/dashboard\/plan-builder/);
  });
});
