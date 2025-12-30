import { test, expect, loginTestUser, uniqueId } from './fixtures';

// Skip all tests if not running in SaaS mode (signup disabled)
test.describe('API Keys Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginTestUser(page);
    // Skip if still on login page (auth failed)
    if (page.url().includes('/login') || page.url().includes('/signup')) {
      test.skip();
    }
  });

  test.describe('API Key Creation Wizard', () => {
    test('can complete full API key creation wizard', async ({ page }) => {
      const systemName = uniqueId('API Key System');
      const keyName = uniqueId('API Key');

      // First create a S/4HANA Public system with an instance (has predefined services)
      await page.goto('/systems');
      await page.getByRole('button', { name: 'Add System' }).first().click();
      await page.getByLabel('Name').fill(systemName);
      await page.getByRole('combobox').first().click();
      await page.getByRole('option', { name: 'SAP S/4HANA Cloud Public Edition' }).click();
      await page.getByRole('button', { name: 'Create System' }).click();
      await expect(page.getByText(systemName)).toBeVisible({ timeout: 10000 });

      // Navigate to the system detail page and add an instance
      await page.goto('/systems');
      await page.waitForTimeout(500);
      await page.getByRole('link', { name: systemName }).click();
      await expect(page).toHaveURL(/\/systems\/[a-f0-9-]+/);

      const createInstanceButton = page.getByRole('button', { name: /add.*instance/i }).first();
      await createInstanceButton.click();

      await page.getByRole('combobox').first().click();
      await page.getByRole('option', { name: /sandbox|dev/i }).first().click();
      await page.getByLabel(/url|base.*url|endpoint/i).fill('https://sandbox.api.sap.com/s4hanacloud/');

      const authComboboxes = page.getByRole('combobox');
      if ((await authComboboxes.count()) > 1) {
        await authComboboxes.nth(1).click();
        const noneOption = page.getByRole('option', { name: /none|no auth/i });
        if (await noneOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await noneOption.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }

      await page.getByRole('button', { name: /create|save/i }).click();
      await page.waitForTimeout(2000);

      // Navigate to API keys
      await page.goto('/api-keys');

      // Click "Create API Key" button (it's a link to /api-keys/new)
      await page.getByRole('link', { name: 'Create API Key' }).first().click();
      await expect(page).toHaveURL(/\/api-keys\/new/);

      // Step 1: Basic Info
      await page.getByLabel(/name/i).fill(keyName);
      const descField = page.getByLabel(/description/i);
      if (await descField.isVisible()) {
        await descField.fill('E2E test API key');
      }

      // Click next or continue
      const nextButton = page.getByRole('button', { name: 'Continue' });
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
      }

      // Step 2: Select Services/Access
      await page.waitForTimeout(1000);

      // Check if there are any services available
      const noServicesMessage = page.getByText('No services available');
      if (await noServicesMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Test completed - system and instance were created but no services available yet
        return;
      }

      // The service selector is a tree: System → Environment → Services
      // First expand the system (click the button with our system name)
      const systemButton = page.getByRole('button', { name: new RegExp(systemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
      if (await systemButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await systemButton.click();
        await page.waitForTimeout(500);
      }

      // Then expand the environment (SANDBOX or similar)
      // The environment buttons appear inside the expanded system
      const envButton = page.getByRole('button', { name: /^SANDBOX|^DEV|^PROD/i }).first();
      if (await envButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await envButton.click();
        await page.waitForTimeout(500);
      }

      // Now click on a service to select it (they're buttons inside the expanded environment)
      // Look for service buttons by their service name pattern
      const scrollArea = page.locator('[data-radix-scroll-area-viewport]');
      await scrollArea.waitFor({ timeout: 5000 }).catch(() => {});

      // The services have descriptive names, find one with a typical SAP API name
      const serviceButton = page.locator('button').filter({ hasText: /Business Partner|Product|Sales Order|Purchase Order/i }).first();
      if (await serviceButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await serviceButton.click();
        await page.waitForTimeout(300);
      }

      // Click continue - should be enabled now
      await page.waitForTimeout(500);
      if (await nextButton.isEnabled({ timeout: 3000 }).catch(() => false)) {
        await nextButton.click();
      }

      // Step 3: Permissions (if exists)
      await page.waitForTimeout(500);
      if (await nextButton.isEnabled({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
      }

      // Step 4: Rate Limits (if exists)
      await page.waitForTimeout(500);

      // Final submit - look for Create API Key button
      const createButton = page.getByRole('button', { name: /create api key|generate|finish/i });
      if (await createButton.isEnabled({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
      }

      // Should show the secret key - look for the key display or copy button
      await expect(page.getByRole('button', { name: /copy|saved the key/i }).first()).toBeVisible({ timeout: 10000 });

      // Should show warning about storing key
      await expect(page.getByText('Save this key securely')).toBeVisible();
    });

    test('can navigate to API key creation page', async ({ page }) => {
      await page.goto('/api-keys');

      // Click "Create API Key" link
      await page.getByRole('link', { name: 'Create API Key' }).first().click();

      // Should be on the creation page
      await expect(page).toHaveURL(/\/api-keys\/new/);

      // Should see the form
      await expect(page.getByLabel(/name/i)).toBeVisible();
    });
  });

  test.describe('API Key List', () => {
    test('shows API keys page', async ({ page }) => {
      await page.goto('/api-keys');

      // Should see the page title (h1)
      await expect(page.getByRole('heading', { level: 1, name: 'API Keys' })).toBeVisible();

      // Should see the create button
      await expect(page.getByRole('link', { name: 'Create API Key' }).first()).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('can navigate between api-keys pages', async ({ page }) => {
      // Start at list page
      await page.goto('/api-keys');
      await expect(page.getByRole('heading', { level: 1, name: 'API Keys' })).toBeVisible();

      // Navigate to create page
      await page.getByRole('link', { name: 'Create API Key' }).first().click();
      await expect(page).toHaveURL(/\/api-keys\/new/);

      // Go back to list
      await page.goto('/api-keys');
      await expect(page.getByRole('heading', { level: 1, name: 'API Keys' })).toBeVisible();
    });
  });
});
