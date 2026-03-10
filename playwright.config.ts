import fs from 'fs';
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Set browsers path for correct architecture (arm64 on Apple Silicon)
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(
  process.env.HOME || '',
  '.cache',
  'ms-playwright'
);

function resolveChromiumExecutablePath() {
  const systemChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  if (fs.existsSync(systemChromePath)) {
    return systemChromePath;
  }

  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;

  if (!browsersPath || !fs.existsSync(browsersPath)) {
    return undefined;
  }

  const shellDirectory = fs
    .readdirSync(browsersPath)
    .find((entry) => entry.startsWith('chromium_headless_shell-'));

  if (!shellDirectory) {
    return undefined;
  }

  const shellPath = path.join(browsersPath, shellDirectory);
  const platformDirectory = fs
    .readdirSync(shellPath)
    .find((entry) => entry.startsWith('chrome-headless-shell-mac'));

  if (!platformDirectory) {
    return undefined;
  }

  return path.join(shellPath, platformDirectory, 'chrome-headless-shell');
}

const chromiumExecutablePath = resolveChromiumExecutablePath();

/**
 * Huttle AI - Playwright E2E Configuration
 * Launch Readiness Smoke Test Suite
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumExecutablePath
          ? { executablePath: chromiumExecutablePath }
          : undefined,
      },
    },
  ],
  webServer: {
    command: 'VITE_SKIP_AUTH=true npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
    env: {
      VITE_SKIP_AUTH: 'true',
    },
  },
});
