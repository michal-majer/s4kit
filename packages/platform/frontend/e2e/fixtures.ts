import { test as base, expect } from '@playwright/test';

/**
 * E2E Test Fixtures for S4Kit
 *
 * Supports both SaaS mode (signup enabled) and Selfhost mode (pre-seeded users).
 *
 * For Selfhost mode, run: bun run e2e/seed-test-user.ts before tests
 * For SaaS mode, tests will auto-signup if needed
 */

// Test user credentials
export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'E2eTestPass123!',
  name: 'E2E Test User',
};

/**
 * Attempts to log in, creating the user via signup if in SaaS mode
 */
async function ensureLoggedIn(page: ReturnType<typeof base.page>) {
  // First check if already logged in
  await page.goto('/');
  await page.waitForTimeout(1000);

  // If we're not on login/signup page, we're already logged in
  if (!page.url().includes('/login') && !page.url().includes('/signup')) {
    return;
  }

  // Go to login
  await page.goto('/login');
  await page.waitForTimeout(500);

  // Try to login
  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page.getByLabel(/password/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for navigation
  await page.waitForTimeout(2000);

  // Check if login succeeded
  const currentUrl = page.url();
  if (!currentUrl.includes('/login') && !currentUrl.includes('/signup')) {
    // Login succeeded
    return;
  }

  // Login failed - check if signup is available (SaaS mode)
  await page.goto('/signup');
  await page.waitForTimeout(500);

  // Check if signup page exists (SaaS mode) or redirects (selfhost mode)
  if (page.url().includes('/signup')) {
    console.log('SaaS mode detected, attempting signup...');

    await page.getByLabel('Full name').fill(TEST_USER.name);
    await page.getByLabel('Work email').fill(TEST_USER.email);
    await page.getByLabel('Password', { exact: true }).fill(TEST_USER.password);
    await page.getByLabel('Confirm password').fill(TEST_USER.password);

    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForTimeout(2000);

    // If redirected to login, login again
    if (page.url().includes('/login')) {
      await page.getByLabel(/email/i).fill(TEST_USER.email);
      await page.getByLabel(/password/i).fill(TEST_USER.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(2000);
    }
  } else {
    // Selfhost mode - signup not available
    // User must be pre-seeded: bun run e2e/seed-test-user.ts
    console.log('Selfhost mode detected. Run: bun run e2e/seed-test-user.ts to create test user');
  }
}

// Extend base test with authentication
export const test = base.extend<{
  authenticatedPage: ReturnType<typeof base.page>;
}>({
  authenticatedPage: async ({ page }, use) => {
    await ensureLoggedIn(page);
    await use(page);
  },
});

export { expect };

/**
 * Helper to login with test user - call in beforeEach
 */
export async function loginTestUser(page: ReturnType<typeof base.page>) {
  await ensureLoggedIn(page);
}

/**
 * Helper to generate unique test data
 */
export function uniqueId(prefix = 'test') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Helper to wait for toast notification
 */
export async function waitForToast(page: ReturnType<typeof base.page>, text: string | RegExp) {
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: text });
  await expect(toast).toBeVisible({ timeout: 5000 });
  return toast;
}

/**
 * Helper to dismiss all toasts
 */
export async function dismissToasts(page: ReturnType<typeof base.page>) {
  const toasts = page.locator('[data-sonner-toast]');
  const count = await toasts.count();
  for (let i = 0; i < count; i++) {
    await toasts.nth(i).click();
  }
}
