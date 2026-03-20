import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Full Post Builder', () => {
  test('loads wizard and shows step controls', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/full-post-builder');
    await expect(page.getByRole('heading', { name: /Full Post Builder/i })).toBeVisible();
    await expect(page.getByText(/Topic|Hook|Caption|Hashtag|CTA/i).first()).toBeVisible();
  });
});
