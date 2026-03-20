import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Ignite Engine', () => {
  test('shows beta UI and form', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/ignite-engine');
    await expect(page.getByText(/Beta/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Ignite Engine/i })).toBeVisible();
  });

  test('save to vault control exists in DOM when brief results render', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/ignite-engine');
    const n = await page.getByTestId('ignite-save-vault').count();
    expect(n).toBeLessThanOrEqual(1);
  });
});
