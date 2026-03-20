import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Social Updates', () => {
  test('shows platform updates from mock Supabase route', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/social-updates');
    await expect(page.getByText(/Instagram/i).first()).toBeVisible({ timeout: 15000 });
  });
});
