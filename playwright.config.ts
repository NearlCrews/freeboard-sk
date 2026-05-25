// Phase 0 floor: Playwright 1.60 configuration. CI runs inside the
// `mcr.microsoft.com/playwright:v1.60.0-jammy` container (pinned in
// .github/workflows/ci.yml by ci-lead); Playwright versions must stay in lock-step
// with the container tag.
//
// baseURL targets signalk-server's default port (3000); the freeboard-sk plugin
// is served at /@signalk/freeboard-sk/. Override with E2E_BASE_URL for alternate
// hosts.

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

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
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});
