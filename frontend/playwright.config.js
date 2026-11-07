import { defineConfig, devices } from '@playwright/test';

// These tests create real accounts, gigs and payments. Use a disposable stack only.
if (process.env.E2E_ALLOW_TEST_DATA !== '1') {
  throw new Error('Browser tests create test data. Use an isolated database and set E2E_ALLOW_TEST_DATA=1. See docs/part3/BROWSER_TESTS.md.');
}
const baseURL = process.env.E2E_BASE_URL || 'https://localhost:8443';
const target = new URL(baseURL);
if (target.protocol !== 'https:' || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
  throw new Error('E2E_BASE_URL must use HTTPS on localhost. Browser tests must not target a hosted or shared database.');
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 90_000,
  globalTimeout: 5 * 60_000,
  expect: { timeout: 15_000 },
  outputDir: './test-results/browser',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/browser-junit.xml' }],
  ],
  use: {
    baseURL,
    // Only the loopback test stack is accepted above; its CA is ephemeral in CI.
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    // Do not put login requests or JWTs into retained network traces.
    trace: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
