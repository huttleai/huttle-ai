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
 * Option C (5173 busy — alternate port, full stack):
 *   1. Start: PLAYWRIGHT_VITE_PORT=5188 VITE_SKIP_AUTH=true npm run dev
 *      (LOCAL_API_PORT is picked randomly by Playwright when it starts the stack; override with
 *      PLAYWRIGHT_LOCAL_API_PORT if you start the stack manually.)
 *   2. Run: PLAYWRIGHT_BASE_URL=http://127.0.0.1:5188 PW_REUSE_SERVER=1 npm run test:e2e
 *   Or let Playwright start the stack: PLAYWRIGHT_VITE_PORT=5188 npm run test:e2e
 *
 * IMPORTANT: The dev server MUST run with VITE_SKIP_AUTH=true for
 * dashboard tests to pass (they bypass real Supabase auth).
 *
 * Mobile project uses Pixel 5 (Chromium) so smoke + responsive tests do not
 * require a separate WebKit install (`npx playwright install webkit`).
 *
 * When Playwright starts `npm run dev`, it sets LOCAL_API_PORT (default: random 32k–35k
 * unless PLAYWRIGHT_LOCAL_API_PORT is set) so a second stack avoids 3001 and stray collisions.
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

/** Vite listen port: explicit env wins; else derive from PLAYWRIGHT_BASE_URL; else 5173. */
function resolvePlaywrightVitePort() {
  if (process.env.PLAYWRIGHT_VITE_PORT?.trim()) {
    return process.env.PLAYWRIGHT_VITE_PORT.trim();
  }
  const raw = process.env.PLAYWRIGHT_BASE_URL?.trim();
  if (!raw) return '5173';
  try {
    const port = new URL(raw).port;
    return port || '5173';
  } catch {
    return '5173';
  }
}

const playwrightVitePort = resolvePlaywrightVitePort();
const playwrightBaseURL =
  process.env.PLAYWRIGHT_BASE_URL?.trim() || `http://127.0.0.1:${playwrightVitePort}`;

/** API port for the Playwright-spawned dev stack only (avoid EADDRINUSE on 3001). */
const playwrightLocalApiPort =
  process.env.PLAYWRIGHT_LOCAL_API_PORT?.trim() ||
  String(32000 + Math.floor(Math.random() * 3000));

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
    baseURL: playwrightBaseURL,
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
      use: {
        ...devices['Pixel 5'],
        launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined,
      },
      testMatch: ['18-mobile-responsive.spec.ts', '20-smoke.spec.ts'],
    },
  ],
  webServer: {
    command: 'VITE_SKIP_AUTH=true npm run dev',
    url: playwrightBaseURL,
    // Set PW_REUSE_SERVER=1 only if your existing dev server was started with VITE_SKIP_AUTH=true.
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    timeout: 120000,
    env: {
      VITE_SKIP_AUTH: 'true',
      PLAYWRIGHT_VITE_PORT: playwrightVitePort,
      LOCAL_API_PORT: playwrightLocalApiPort,
    },
  },
});
