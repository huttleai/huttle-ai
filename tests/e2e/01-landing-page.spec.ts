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

  rawTest('pricing copy no longer says a card is required', async ({ page }) => {
    await page.goto('/');
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await rawExpect(page.getByText(/No credit card needed · Cancel anytime/i).first()).toBeVisible();
    await rawExpect(page.getByText(/Card required · Cancel anytime/i)).toHaveCount(0);
    await rawExpect(page.getByText(/All plans require a credit card/i)).toHaveCount(0);
  });
});
