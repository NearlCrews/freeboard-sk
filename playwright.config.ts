// Playwright 1.60 configuration. CI runs inside the
// `mcr.microsoft.com/playwright:v1.60.0-jammy` container pinned in
// .github/workflows/ci.yml; the @playwright/test version must stay in
// lock-step with the container tag.
//
// baseURL targets signalk-server's default port (3000); the Open Binnacle
// plugin is served at /signalk-open-binnacle/. Override with E2E_BASE_URL
// for alternate hosts.
//
// Projects:
//   chromium / firefox / webkit  run the smoke + a11y specs.
//   perf                          runs the Phase 8 ais-burst gate alone,
//                                 against chromium (frame timing is
//                                 only meaningful on a single engine).
// The perf project is excluded from the default-engine projects via
// testIgnore so `pnpm test:e2e --project=chromium` stays cheap and the
// 60-second burst runs only when explicitly selected with
// `--project=perf` or `--grep perf`.

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

const PERF_SPECS = ['**/ais-burst.spec.ts'];

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'playwright-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: PERF_SPECS
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: PERF_SPECS
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: PERF_SPECS
    },
    {
      name: 'perf',
      use: { ...devices['Desktop Chrome'] },
      testMatch: PERF_SPECS,
      fullyParallel: false,
      workers: 1,
      retries: 0
    }
  ]
});
