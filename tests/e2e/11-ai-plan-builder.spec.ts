import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('AI Plan Builder', () => {
  test('page loads with configuration UI', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/plan-builder');
    await expect(page.getByRole('heading', { name: /AI Plan Builder|Plan Builder/i })).toBeVisible();
  });
});
