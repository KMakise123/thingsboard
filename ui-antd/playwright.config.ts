import { defineConfig } from '@playwright/test';

/**
 * E2E configuration (v1 test baseline, docs/spec/v1-test-baseline.md §3).
 *
 * Targets a REAL backend (the repo itself — never a released image):
 * - `E2E_BASE_URL`  where the UI is served.    Default: dev server http://localhost:8000
 * - `E2E_API_URL`   where the API lives.       Default: backend     http://localhost:8080
 *
 * For the one-step-switch drill / CI the backend serves the UI itself
 * (jar channel, docs/adr/0002-cutover-jar-channel.md): point both vars at
 * http://localhost:8080.
 *
 * Seeds are idempotent and run in globalSetup (three-role accounts + demo
 * data refs). WebSocket scenarios run against the real socket — page.route
 * fault injection is used for HTTP error paths only (Playwright cannot
 * intercept WS frames).
 */

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8000';
const apiURL = process.env.E2E_API_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './e2e/specs',
  outputDir: './test-results',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: process.env.CI ? 1 : 2,
  retries: 1, // flaky policy: docs/spec/v1-test-baseline.md §6
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1600, height: 900 },
      },
    },
  ],
  metadata: { apiURL },
});
