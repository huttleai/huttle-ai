import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Set browsers path for correct architecture (arm64 on Apple Silicon)
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(
  process.env.HOME || '',
  '.cache',
  'ms-playwright'
);

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
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'VITE_SKIP_AUTH=true npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000,
    env: {
      VITE_SKIP_AUTH: 'true',
    },
  },
});
