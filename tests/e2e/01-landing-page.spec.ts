import { test as rawTest, expect as rawExpect } from '@playwright/test';
import { test, expect } from './helpers/auth';
import { attachStrictErrorCollector } from './helpers/console';

test.describe('Landing page', () => {
  for (const width of [375, 768, 1024, 1440]) {
    test(`renders at ${width}px width`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      const detach = attachStrictErrorCollector(page);
      await page.goto('/');
      await expect(page.getByTestId('landing-hero')).toBeVisible();
      await expect(page.getByTestId('landing-nav')).toBeVisible();
      const errs = detach();
      expect(errs, errs.join('\n')).toHaveLength(0);
    });
  }

  test('hero, nav login, and key marketing copy', async ({ page }) => {
    const detach = attachStrictErrorCollector(page);
    await page.goto('/');
    await expect(page.getByTestId('landing-hero')).toContainText(/The Guesswork/i);
    await expect(page.getByTestId('landing-nav-login')).toBeVisible();
    await page.getByTestId('landing-nav-login').click();
    await expect(page).toHaveURL(/\/login|\/dashboard/);
    const errs = detach();
    expect(errs, errs.join('\n')).toHaveLength(0);
  });
});

rawTest.describe('Landing checkout (logged out)', () => {
  rawTest('trial CTA does not leave a hanging checkout tab', async ({ page, context }) => {
    const extraPages = [];
    context.on('page', (opened) => extraPages.push(opened));

    await page.goto('/');
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await page.getByTestId('landing-pricing-essentials-cta').click();

    await rawExpect(page).toHaveURL(/\/dashboard/);

    const pending = await page.evaluate(() => window.sessionStorage.getItem('huttle_pending_checkout'));
    rawExpect(pending, 'selected plan should be stored for signup resume').toBeTruthy();
    rawExpect(JSON.parse(pending)).toMatchObject({
      planId: 'essentials',
      billingCycle: 'monthly',
    });

    await page.waitForTimeout(400);
    const stillOpen = extraPages.filter((opened) => !opened.isClosed());
    rawExpect(stillOpen, 'guest checkout must not leave a Stripe loading tab open').toHaveLength(0);
  });

  rawTest('pricing copy says a card is required for the trial', async ({ page }) => {
    await page.goto('/');
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await rawExpect(page.getByText(/Card required · Cancel anytime/i).first()).toBeVisible();
    await rawExpect(page.getByText(/A credit card is required to start the trial/i).first()).toBeVisible();
    await rawExpect(page.getByText(/No credit card needed/i)).toHaveCount(0);
  });
});

rawTest.describe('Public plan routes', () => {
  rawTest('/pricing shows Essentials and Pro', async ({ page }) => {
    await page.goto('/pricing');
    await rawExpect(page.getByTestId('pricing-page')).toBeVisible();
    await rawExpect(page.getByTestId('landing-pricing-essentials-cta')).toBeVisible();
    await rawExpect(page.getByTestId('landing-pricing-pro-cta')).toBeVisible();
    await rawExpect(page.getByText(/Card required · Cancel anytime/i).first()).toBeVisible();
  });

  rawTest('/founders redirects to /pricing', async ({ page }) => {
    await page.goto('/founders');
    await rawExpect(page).toHaveURL(/\/pricing$/);
    await rawExpect(page.getByTestId('pricing-page')).toBeVisible();
  });

  rawTest('/builders redirects to /pricing', async ({ page }) => {
    await page.goto('/builders');
    await rawExpect(page).toHaveURL(/\/pricing$/);
    await rawExpect(page.getByTestId('pricing-page')).toBeVisible();
  });
});
