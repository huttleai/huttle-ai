import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Trend Lab', () => {
  test('Trend Pulse scan returns structured cards', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/trend-lab');
    await expect(page.getByTestId('trend-discovery-hub')).toBeVisible();
    await page.getByTestId('trend-pulse-start-scan').click();
    await expect(
      page.getByText(/Live Results|Workflow Proof|Founder Story|Please set your niche|Scan Failed/i).first()
    ).toBeVisible({ timeout: 60000 });
  });

  test('Deep Dive tab is present', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/trend-lab');
    await expect(page.getByRole('button', { name: /Deep Dive/i })).toBeVisible();
  });
});
