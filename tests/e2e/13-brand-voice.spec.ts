import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

const sectionTestIds = [
  'brand-profile-section-about-you',
  'brand-profile-section-your-niche',
  'brand-profile-section-your-audience',
  'brand-profile-section-your-voice',
  'brand-profile-section-your-platforms',
  'brand-profile-section-your-goals',
];

test.describe('Brand Profile (unified)', () => {
  test('page loads with title, summary bar, and six sections', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/brand-voice');
    await expect(page.getByTestId('brand-profile-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Brand Profile$/i })).toBeVisible();
    await expect(page.getByTestId('brand-profile-summary-bar')).toBeVisible();
    for (const id of sectionTestIds) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
  });

  test('section headers expand and collapse on click', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/brand-voice');
    const toggle = page.getByTestId('brand-profile-section-toggle-about-you');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('completion indicators: incomplete sections show red X', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/brand-voice');
    await expect(page.getByTestId('brand-profile-section-incomplete-about-you')).toBeVisible();
  });

  test('filling first name marks About You complete', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/brand-voice');
    await page.getByTestId('brand-profile-first-name').fill('Alex');
    await expect(page.getByTestId('brand-profile-section-complete-about-you')).toBeVisible({ timeout: 8000 });
  });

  test('creator type shows business name field only for Brand/Business', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/brand-voice');
    await page.getByTestId('brand-profile-creator-solo').click();
    await expect(page.getByTestId('brand-profile-business-name')).not.toBeVisible();
    await page.getByTestId('brand-profile-creator-brand').click();
    await expect(page.getByTestId('brand-profile-business-name')).toBeVisible();
  });

  test('auto-save runs after edits (debounced)', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/brand-voice');
    await page.getByTestId('brand-profile-first-name').fill(`E2E ${Date.now()}`);
    await expect(page.getByTestId('brand-profile-unsaved-dot')).toBeVisible();
    await expect(page.getByTestId('brand-profile-save-status')).toContainText(/Saved/i, { timeout: 8000 });
  });

  test('layout is usable at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await gotoDashboard(page, '/dashboard/brand-voice');
    await expect(page.getByTestId('brand-profile-section-toggle-about-you')).toBeVisible();
    const box = await page.getByTestId('brand-profile-section-toggle-about-you').boundingBox();
    expect(box && box.height).toBeGreaterThanOrEqual(44);
  });
});
