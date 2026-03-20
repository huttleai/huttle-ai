import { test, expect } from './helpers/auth';
import { gotoDashboard } from './helpers/navigation';

test.describe('Content Remix', () => {
  test('step 1 input and studio header render', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/content-remix');
    await expect(page.getByText(/Content Remix Studio/i).first()).toBeVisible();
    await expect(page.getByRole('textbox').first()).toBeVisible();
  });

  test('save to vault control appears on remix results (step 4)', async ({ page }) => {
    test.setTimeout(150000);
    await gotoDashboard(page, '/dashboard/content-remix');
    await page.getByPlaceholder(/Paste your text content here/i).fill(
      'This is sample text for remix e2e. It must be long enough to pass validation rules in the app.'
    );
    await page.getByRole('button', { name: /Next: Choose Goal/i }).click();
    await page.getByRole('button', { name: /Viral Reach/i }).click();
    await page.getByRole('button', { name: /Next: Select Platforms/i }).click();
    const platformBtn = page.getByRole('button', { name: /Instagram|TikTok|YouTube|LinkedIn|Facebook/i }).first();
    if (await platformBtn.isVisible().catch(() => false)) {
      await platformBtn.click();
    }
    await page.getByRole('button', { name: /Remix Content/i }).click();
    await expect(page.getByTestId('content-remix-save-vault').first()).toBeVisible({ timeout: 120000 });
  });
});
