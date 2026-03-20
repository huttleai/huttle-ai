import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('AI Power Tools', () => {
  test('caption generator produces results and copy/save', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/ai-tools?tool=caption');
    await expect(page.getByTestId('ai-tools-page')).toBeVisible();
    await page.getByTestId('caption-topic-input').fill('Founder productivity tips for busy mornings');
    await page.getByTestId('generate-caption-button').click();
    await expect(page.getByTestId('ai-result-container')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('ai-result-container').getByRole('button', { name: /Copy/i }).first().click();
    await page.getByTestId('ai-result-container').getByRole('button', { name: /Save to Vault/i }).first().click();
  });

  test('hashtag and hook tools render', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/ai-tools?tool=hashtags');
    await expect(page.getByRole('heading', { name: /Hashtag Generator/i })).toBeVisible();
    await gotoDashboard(page, '/dashboard/ai-tools?tool=hooks');
    await expect(page.getByRole('heading', { name: /Hook Builder/i })).toBeVisible();
  });

  test('hashtag generator exposes save set to vault after generation', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/ai-tools?tool=hashtags');
    await page.getByPlaceholder(/fitness tips|Keywords or Niche/i).fill('local coffee shop social media');
    await page.getByRole('button', { name: /Generate Hashtags/i }).click();
    await expect(page.getByTestId('save-hashtag-set-vault')).toBeVisible({ timeout: 45000 });
  });
});
