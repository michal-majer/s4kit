import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for S4Kit Frontend
 *
 * IMPORTANT: E2E tests require the backend to run in SaaS mode for signup to work.
 * Start backend with: MODE=saas bun run dev
 *
 * Run with: bun run test:e2e
 * Run UI mode: bun run test:e2e:ui
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid resource contention
  reporter: 'html',
  timeout: 60000, // 60s per test
  expect: {
    timeout: 5000, // 5s for assertions
  },

  // Clean up leftover test data before tests start
  globalSetup: './e2e/global-setup.ts',
  // Clean up test data after all tests complete
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000, // 10s for actions
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run local dev servers before starting tests */
  /* Set START_SERVERS=1 to auto-start servers in SaaS mode */
  webServer: process.env.START_SERVERS
    ? [
        {
          command: 'cd ../backend && MODE=saas bun run dev',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 30000,
        },
        {
          command: 'bun run dev',
          url: 'http://localhost:3001',
          reuseExistingServer: true,
          timeout: 30000,
        },
      ]
    : undefined,
});
