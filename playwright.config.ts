/**
 * HUTTLE AI — Playwright E2E Test Configuration
 *
 * Recommended test workflows:
 *
 * Option A (cleanest — let Playwright start the server):
 *   1. Stop any dev server on port 5173
 *   2. Run: npm run test:e2e
 *   Playwright starts its own VITE_SKIP_AUTH=true dev server.
 *
 * Option B (keep your dev server running):
 *   1. Start dev server: VITE_SKIP_AUTH=true npm run dev
 *   2. Run: PW_REUSE_SERVER=1 npm run test:e2e
 *
 * Option C (custom port):
 *   1. Start: VITE_SKIP_AUTH=true npx vite --port 5179
 *   2. Run: PLAYWRIGHT_BASE_URL=http://localhost:5179 PW_REUSE_SERVER=1 npm run test:e2e
 *
 * IMPORTANT: The dev server MUST run with VITE_SKIP_AUTH=true for
 * dashboard tests to pass (they bypass real Supabase auth).
 */
import fs from 'fs';
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

function resolveChromiumExecutablePath() {
  const systemChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(systemChromePath)) {
    return systemChromePath;
  }
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!browsersPath || !fs.existsSync(browsersPath)) {
    return undefined;
  }
  const shellDirectory = fs.readdirSync(browsersPath).find((entry) => entry.startsWith('chromium_headless_shell-'));
  if (!shellDirectory) return undefined;
  const shellPath = path.join(browsersPath, shellDirectory);
  const platformDirectory = fs.readdirSync(shellPath).find((entry) => entry.startsWith('chrome-headless-shell-mac'));
  if (!platformDirectory) return undefined;
  return path.join(shellPath, platformDirectory, 'chrome-headless-shell');
}

const chromiumExecutablePath = resolveChromiumExecutablePath();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/18-mobile-responsive.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined,
      },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
      testMatch: ['18-mobile-responsive.spec.ts', '20-smoke.spec.ts'],
    },
  ],
  webServer: {
    command: 'VITE_SKIP_AUTH=true npm run dev',
    url: 'http://localhost:5173',
    // Set PW_REUSE_SERVER=1 only if your existing dev server was started with VITE_SKIP_AUTH=true.
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    timeout: 120000,
    env: {
      VITE_SKIP_AUTH: 'true',
    },
  },
});
