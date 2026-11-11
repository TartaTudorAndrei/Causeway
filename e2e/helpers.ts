import { Page } from '@playwright/test';

export const ADMIN_USER = {
  id: 'admin-123',
  name: 'Admin Master',
  email: 'admin@example.org',
  role: 'ADMIN',
  roles: ['ADMIN'],
  permissions: ['*'],
  memberships: [
    {
      roleName: 'ADMIN',
      scopeType: 'GLOBAL',
      scopeId: null,
      permissions: ['*'],
    },
  ],
};

export async function mockAuthenticatedSession(page: Page, user = ADMIN_USER) {
  await page.context().addCookies([
    {
      name: 'XSRF-TOKEN',
      value: 'mock-csrf-token',
      domain: 'localhost',
      path: '/',
    },
  ]);

  await page.addInitScript((userData) => {
    localStorage.setItem('adminToken', 'mock-jwt-token-xyz');
    localStorage.setItem('adminUser', JSON.stringify(userData));
    localStorage.setItem('adminPermissions', JSON.stringify(userData.permissions));
  }, user);

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/api/admin/me') || url.includes('/api/auth/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(user),
      });
    }

    if (url.includes('/api/auth/verify')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user, authenticated: true }),
      });
    }

    if (url.includes('/api/csrf-token')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'X-XSRF-TOKEN': 'mock-csrf-token' },
        body: JSON.stringify({ token: 'mock-csrf-token' }),
      });
    }

    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}
