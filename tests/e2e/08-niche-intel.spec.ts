import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Niche Intel', () => {
  test('page loads with niche controls', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/niche-intel');
    await expect(page.getByRole('heading', { name: /Niche Intel/i })).toBeVisible();
  });
});
