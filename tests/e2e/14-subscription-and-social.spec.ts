import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Subscription and social updates', () => {
  test('renders founders billing state', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/subscription');

    await expect(page.getByText(/founders club/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /manage billing/i })).toBeVisible();
    await expect(page.getByText(/\$199\/year locked rate/i)).toBeVisible();
  });

  test('renders social updates with filters and expandable cards', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/social-updates');

    await expect(page.getByRole('heading', { name: /social updates/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /instagram/i })).toBeVisible();
    await expect(page.getByText(/reels recommendation weighting updated/i)).toBeVisible();

    await page.getByText(/reels recommendation weighting updated/i).click();
    await expect(page.getByText(/what this means for you/i)).toBeVisible();
  });
});
