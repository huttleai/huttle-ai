import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('AI Power Tools', () => {
  test('renders the tool switcher', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/ai-tools?tool=caption');

    await expect(page.getByRole('heading', { name: /ai power tools/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /captions/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /hashtags/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /hooks/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ctas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /scorer/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /visuals/i })).toBeVisible();
  });

  test('generates captions from the caption tool', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/ai-tools?tool=caption');

    await page.locator('textarea').first().fill('Build a stronger creator workflow in 2026');
    await page.getByRole('button', { name: /generate/i }).first().click();

    await expect(page.getByText(/generated content for huttle ai test coverage|most creators do not need more ideas/i)).toBeVisible();
  });

  test('switches to scorer and visuals tabs', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/ai-tools?tool=caption');

    await page.getByRole('button', { name: /scorer/i }).click();
    await expect(page.getByText(/quality|human|algorithm/i).first()).toBeVisible();

    await page.getByRole('button', { name: /visuals/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible();
  });
});
