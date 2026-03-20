import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Subscription & billing', () => {
  test('subscription page renders with tier context', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/subscription');
    await expect(page.getByTestId('subscription-page')).toBeVisible();
    await expect(page.getByText(/Billing|Founders|Pro|Essentials/i).first()).toBeVisible();
  });
});
