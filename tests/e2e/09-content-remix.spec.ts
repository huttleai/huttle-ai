import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Content Remix Studio', () => {
  test('renders the remix workflow steps', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/content-remix');

    await expect(page.getByRole('heading', { name: /content remix studio/i })).toBeVisible();
    await expect(page.getByText(/choose your remix goal/i)).toBeVisible();
    await expect(page.getByText(/select output platforms/i)).toBeVisible();
  });

  test('creates remixed platform output', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/content-remix');

    await page.locator('textarea').first().fill('Turn one founder lesson into a week of short-form content.');
    await page.getByRole('button', { name: /next: choose goal/i }).click();
    await page.getByRole('button', { name: /viral reach/i }).click();
    await page.getByRole('button', { name: /next: select platforms/i }).click();
    await page.getByRole('button', { name: /remix content/i }).click();

    await expect(page.getByText(/remixed content/i)).toBeVisible();
    await expect(page.getByText(/instagram/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /copy all/i })).toBeVisible();
  });
});
