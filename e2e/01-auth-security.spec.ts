import { test, expect } from '@playwright/test';

test.describe('1. Authentication & Security Life Cycle', () => {

  test('E2E-AUTH-001: Volunteer Registration -> Pending Approval State', async ({ page }) => {
    await page.route('**/api/admin/me', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) });
    });

    await page.route('**/api/admin/clubs**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: '1', name: 'Interact Community', organizationType: 'Interact' }]),
      });
    });

    await page.route('**/api/admin/request-access', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'PENDING_APPROVAL', emailSent: true }),
      });
    });

    await page.goto('/login');

    // Switch to Request Access tab
    const tabButtons = page.locator('div.grid.grid-cols-2 button');
    await tabButtons.nth(1).click();

    // Fill registration form fields
    const nameInput = page.locator('input[placeholder*="Popescu Ion"], input[placeholder*="Nume"], input[type="text"]').first();
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInputs = page.locator('input[type="password"]');
    const phoneInput = page.locator('input[type="tel"]').first();

    await nameInput.fill('Popescu Ion');
    await emailInput.fill('popescu.ion@example.com');
    await passwordInputs.nth(0).fill('ParolaSecreta123!');
    await passwordInputs.nth(1).fill('ParolaSecreta123!');
    await phoneInput.fill('712345678');

    // Submit registration
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Verify system transitions to pending approval UI state
    await expect(page.locator('button', { hasText: /Stare|Status/i }).first()).toBeVisible();
    await expect(page.getByText('popescu.ion@example.com')).toBeVisible();
  });

  test('E2E-AUTH-002: Password Policy & Security Rejection', async ({ page }) => {
    await page.route('**/api/admin/me', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) });
    });

    await page.goto('/login');

    // Switch to Request Access tab
    const tabButtons = page.locator('div.grid.grid-cols-2 button');
    await tabButtons.nth(1).click();

    // Fill invalid weak password
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInputs = page.locator('input[type="password"]');

    await emailInput.fill('test@example.com');
    await passwordInputs.nth(0).fill('123'); // weak password
    if (await passwordInputs.count() > 1) {
      await passwordInputs.nth(1).fill('456'); // mismatch
    }

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Verify outline error highlights
    await expect(passwordInputs.nth(0)).toHaveClass(/border-red|border-rose/);
  });

  test('E2E-AUTH-003: 2FA / TOTP Challenge Flow', async ({ page }) => {
    await page.route('**/api/admin/me', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) });
    });

    await page.route('**/api/admin/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          twoFactorRequired: true,
          twoFactorSessionToken: 'session-2fa-xyz',
          twoFactorMethods: ['TOTP'],
          maskedEmail: 'a***@example.org',
        }),
      });
    });

    await page.route('**/api/admin/2fa/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'jwt-valid-2fa-token',
          user: {
            name: 'Admin User',
            email: 'admin@example.org',
            role: 'ADMIN',
            roles: ['ADMIN'],
            memberships: [{ roleName: 'ADMIN', scopeType: 'GLOBAL', permissions: ['*'] }],
          },
        }),
      });
    });

    await page.goto('/login');

    // Submit primary credentials
    await page.locator('input[type="email"]').fill('admin@example.org');
    await page.locator('input[type="password"]').fill('ParolaValida123!');
    await page.locator('button[type="submit"]').first().click();

    // Verify 2FA challenge screen appears
    await expect(page.locator('body')).toContainText(/2FA|Autentificare|Two-Factor/i);

    // Enter 6-digit code
    const otpInput = page.locator('input[type="text"], input[pattern="[0-9]*"], input[placeholder*="cod"]').first();
    if (await otpInput.isVisible()) {
      await otpInput.fill('123456');
    }
  });

  test('E2E-AUTH-004: Session Expiry & CSRF Header Validation', async ({ page }) => {
    let csrfHeaderPassed = false;

    await page.route('**/api/admin/me', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) });
    });

    await page.context().addCookies([
      { name: 'XSRF-TOKEN', value: 'secret-csrf-token-123', domain: 'localhost', path: '/' }
    ]);

    await page.route('**/api/admin/login', async (route) => {
      const headers = route.request().headers();
      if (headers['x-xsrf-token'] === 'secret-csrf-token-123') {
        csrfHeaderPassed = true;
      }
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Session expired' }),
      });
    });

    await page.goto('/login');
    await page.locator('input[type="email"]').fill('user@example.org');
    await page.locator('input[type="password"]').fill('Parola123!');
    await page.locator('button[type="submit"]').first().click();

    expect(csrfHeaderPassed).toBe(true);
  });

  test('E2E-AUTH-005: Account Suspension & Lockout UI', async ({ page }) => {
    await page.route('**/api/admin/me', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) });
    });

    await page.route('**/api/admin/login', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'SUSPENDED',
          message: 'Contul dumneavoastra a fost suspendat.',
        }),
      });
    });

    await page.goto('/login');
    await page.locator('input[type="email"]').fill('suspended@example.org');
    await page.locator('input[type="password"]').fill('Parola123!');
    await page.locator('button[type="submit"]').first().click();

    // Assert lockout message displayed to user
    await expect(page.locator('body')).toContainText(/suspendat|blocat|respins/i);
  });
});
