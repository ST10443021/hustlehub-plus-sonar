// Playwright configuration for the browser (end-to-end) tests (Playwright, n.d.).
//
// The tests drive the real application in Chromium: the React pages, the nginx proxy and the Express
// API with MongoDB behind it. By default they target the Docker Compose stack on https://localhost:8443;
// set E2E_BASE_URL to test another address, for example the backend-served build on https://localhost:5443.
//
// ignoreHTTPSErrors is needed only because the stack uses the local development CA; in the CI run the
// certificate chain itself is verified separately with curl --cacert.
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'https://localhost:8443';

export default defineConfig({
  testDir: './tests',
  // The tests share accounts and run in a fixed order, and the sign-in endpoint is rate limited
  // (20 requests per 15 minutes), so one worker and no automatic retries keep the request budget predictable.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
