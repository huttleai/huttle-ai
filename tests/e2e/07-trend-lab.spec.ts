import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Trend Lab', () => {
  test('renders quick scan, deep dive, and algorithm checker sections', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/trend-lab');

    await expect(page.getByRole('heading', { name: /trend lab/i })).toBeVisible();
    await expect(page.getByText(/quick scan/i)).toBeVisible();
    await expect(page.getByText(/deep dive/i)).toBeVisible();
    await expect(page.getByText(/algorithm alignment checker/i)).toBeVisible();
    await expect(page.getByText(/trend forecaster/i)).toBeVisible();
  });

  test('accepts content in the algorithm checker', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/trend-lab');

    const textareas = page.locator('textarea');
    await expect(textareas.first()).toBeVisible();
    await textareas.first().fill('This is a practical post about creator workflow systems.');

    await expect(page.getByRole('button', { name: /check|analyze|score/i }).first()).toBeVisible();
  });
});
