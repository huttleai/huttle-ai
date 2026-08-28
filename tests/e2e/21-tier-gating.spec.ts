import { test as base, expect } from '@playwright/test';
import { mockAllAPIs, seedDemoState } from './helpers/mock-api';
import { gotoDashboard } from './helpers/navigation';
import { FEATURE_RUN_CAPS } from '../../src/config/creditConfig.js';

/**
 * Trend Deep Dive and Niche Intel are the Pro trend intelligence pair. Both sit
 * at an Essentials run cap of 0 and lock through the same path: no key in
 * TIER_LIMITS.essentials, so getFeatureLimit resolves to 0 and the page renders
 * its upgrade screen.
 *
 * The dev server runs with VITE_SKIP_AUTH=true, so the tier comes from the
 * demo_subscription_tier key rather than /api/subscription-status.
 */
const test = base.extend<{ tier: string }>({
  tier: ['essentials', { option: true }],
  page: async ({ page, tier }, use) => {
    await seedDemoState(page);
    await page.addInitScript((value) => {
      window.localStorage.setItem('demo_subscription_tier', value);
    }, tier);
    await mockAllAPIs(page);
    await use(page);
  },
});

test.describe('Paid Essentials', () => {
  test('Niche Intel shows the Pro upgrade screen with the live caps', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/niche-intel');

    await expect(page.getByRole('button', { name: /Upgrade to Pro to Unlock/i })).toBeVisible();
    await expect(
      page.getByText(
        `Pro: ${FEATURE_RUN_CAPS.nicheIntel.pro} analyses/month • Founders: ${FEATURE_RUN_CAPS.nicheIntel.founder} analyses/month`,
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Analyze Niche/i })).toHaveCount(0);
  });

  test('Trend Lab keeps Pulse but locks Deep Dive behind Pro', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/trend-lab');
    await expect(page.getByTestId('trend-pulse-start-scan')).toBeVisible();

    await page.getByRole('button', { name: /Deep Dive/i }).first().click();
    await expect(page.getByRole('heading', { name: /Upgrade Your Plan/i })).toBeVisible();
    await expect(page.getByText(/Deep Dive runs/i)).toHaveCount(0);
  });
});

test.describe('Pro', () => {
  test.use({ tier: 'pro' });

  test('reaches both Niche Intel and Deep Dive', async ({ page }) => {
    await gotoDashboard(page, '/dashboard/niche-intel');
    await expect(page.getByRole('button', { name: /Upgrade to Pro to Unlock/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Niche Intel/i })).toBeVisible();

    await gotoDashboard(page, '/dashboard/trend-lab');
    await page.getByRole('button', { name: /Deep Dive/i }).first().click();
    await expect(page.getByText(`/${FEATURE_RUN_CAPS.trendDeepDive.pro} Deep Dive runs`)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Upgrade Your Plan/i })).toHaveCount(0);
  });
});
