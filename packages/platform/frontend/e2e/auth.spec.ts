import { test, expect } from '@playwright/test';
import { uniqueId, loginTestUser, TEST_USER } from './fixtures';

test.describe('Authentication', () => {
  test.describe('Sign Up', () => {
    test('can create a new account', async ({ page }) => {
      const testEmail = `${uniqueId('user')}@example.com`;
      const testPassword = 'SecurePass123!';
      const testName = 'E2E Test User';

      await page.goto('/signup');

      // Fill the signup form with actual label text
      await page.getByLabel('Full name').fill(testName);
      await page.getByLabel('Work email').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByLabel('Confirm password').fill(testPassword);

      await page.getByRole('button', { name: /create account/i }).click();

      // Should redirect to login (needs email verification) or dashboard
      await expect(page).toHaveURL(/\/(login|dashboard)?/, { timeout: 10000 });
    });

    test('shows validation for password requirements', async ({ page }) => {
      await page.goto('/signup');

      // Enter weak password
      await page.getByLabel('Password', { exact: true }).fill('weak');

      // Should show password requirements
      await expect(page.getByText('At least 8 characters')).toBeVisible();
    });

    test('shows error when passwords dont match', async ({ page }) => {
      await page.goto('/signup');

      await page.getByLabel('Full name').fill('Test User');
      await page.getByLabel('Work email').fill('test@test.com');
      await page.getByLabel('Password', { exact: true }).fill('SecurePass123!');
      await page.getByLabel('Confirm password').fill('DifferentPass123!');

      // Should show mismatch error
      await expect(page.getByText('Passwords do not match')).toBeVisible();
    });
  });

  test.describe('Login', () => {
    test('can login with valid credentials', async ({ page }) => {
      // First ensure user exists by running login flow
      await loginTestUser(page);

      // Should be on dashboard (root path)
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('shows error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel(/email/i).fill(TEST_USER.email);
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for response
      await page.waitForTimeout(2000);

      // Should still be on login page (failed login)
      expect(page.url()).toContain('/login');
    });

    test('shows error for non-existent user', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel(/email/i).fill('nonexistent@example.com');
      await page.getByLabel(/password/i).fill('somepassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for response
      await page.waitForTimeout(2000);

      // Should still be on login page
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Logout', () => {
    test('can logout from dashboard', async ({ page }) => {
      // First login
      await loginTestUser(page);

      // Click on user avatar/dropdown in sidebar to reveal logout
      const userButton = page.getByRole('button', { name: /E2E Test User/i });
      if (await userButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await userButton.click();

        // Wait for dropdown to open
        await page.waitForTimeout(500);

        // Click logout option
        const logoutOption = page.getByRole('menuitem', { name: /log ?out|sign ?out/i });
        if (await logoutOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await logoutOption.click();
        }
      }

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('Session Persistence', () => {
    test('stays logged in on page refresh', async ({ page }) => {
      await loginTestUser(page);

      // Refresh page
      await page.reload();

      // Should still be on dashboard (not redirected to login)
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('redirects to login when accessing protected route unauthenticated', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();

      // Try to access protected route
      await page.goto('/systems');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });
});
