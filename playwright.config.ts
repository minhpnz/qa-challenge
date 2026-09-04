import { defineConfig, devices } from '@playwright/test';
import { CI, config } from './config';

/**
 * Test-type separation is expressed as PROJECTS, not folders alone:
 *
 *   health        gate — one cheap reachability check; if the app is down we fail in
 *                 seconds with a clear message instead of 200 confusing UI timeouts.
 *   ui-*          UI layer, one project per browser/platform → cross-browser is a flag,
 *                 not a fork of the suite.
 *   api           API layer — no browser is launched at all, so it runs in ~seconds and
 *                 is safe to gate every pull request on.
 *   performance   budget assertions, run serially so timings are not polluted by
 *                 parallel workers competing for CPU.
 *
 * Regression vs smoke is a TAG (@smoke / @regression), because scope-of-run is
 * orthogonal to which stack layer a test exercises.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: CI,
  retries: config.retries,
  workers: config.workers,
  timeout: config.timeouts.test,
  globalTimeout: CI ? 30 * 60_000 : undefined,

  expect: {
    timeout: config.timeouts.expect,
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: CI ? 'never' : 'on-failure' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(CI ? ([['github']] as const) : []),
  ],

  use: {
    baseURL: config.baseUrl,
    headless: config.headless,
    actionTimeout: config.timeouts.action,
    navigationTimeout: config.timeouts.navigation,
    trace: config.artifacts.trace,
    video: config.artifacts.video,
    screenshot: config.artifacts.screenshot,
    testIdAttribute: 'data-testid',
    extraHTTPHeaders: {
      // Lets the AUT's owners identify automated traffic in their logs.
      'x-automation-suite': 'demoblaze-e2e',
    },
  },

  projects: [
    {
      name: 'health',
      testDir: './tests/setup',
      testMatch: /.*\.setup\.ts/,
    },

    {
      name: 'ui-chromium',
      testDir: './tests/ui',
      dependencies: ['health'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ui-firefox',
      testDir: './tests/ui',
      dependencies: ['health'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'ui-webkit',
      testDir: './tests/ui',
      dependencies: ['health'],
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'ui-mobile-chrome',
      testDir: './tests/ui',
      dependencies: ['health'],
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'ui-mobile-safari',
      testDir: './tests/ui',
      dependencies: ['health'],
      use: { ...devices['iPhone 14'] },
    },

    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: config.apiBaseUrl },
    },

    {
      name: 'performance',
      testDir: './tests/performance',
      dependencies: ['health'],
      fullyParallel: false,
      workers: 1,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
