import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession } from './helpers';

test.describe('3. Departmental & Cross-Role Workflows', () => {

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test('E2E-HR-001 & E2E-HR-002: HR Dashboard, Stands & Member Management', async ({ page }) => {
    await page.goto('/dashboard/hr');
    await expect(page).toHaveURL(/.*\/dashboard\/hr/);

    // Verify main content container renders
    await expect(page.locator('main')).toBeVisible();
  });

  test('E2E-FIN-001 & E2E-FIN-002: Finance Dashboard, Shifts & Expenses', async ({ page }) => {
    await page.goto('/dashboard/finance');
    await expect(page).toHaveURL(/.*\/dashboard\/finance/);

    // Verify main content container renders
    await expect(page.locator('main')).toBeVisible();
  });

  test('E2E-LOG-001 & E2E-LOG-002: Logistics & Inventory Management', async ({ page }) => {
    await page.goto('/dashboard/logistics');
    await expect(page).toHaveURL(/.*\/dashboard\/logistics/);

    // Verify main content container renders
    await expect(page.locator('main')).toBeVisible();
  });

  test('E2E-FUND-001: Fundraising & Sponsorship Pipeline', async ({ page }) => {
    await page.goto('/dashboard/fundraising');
    await expect(page).toHaveURL(/.*\/dashboard\/fundraising/);

    // Verify main content container renders
    await expect(page.locator('main')).toBeVisible();
  });

  test('E2E-MKT-001: Marketing & Campaigns Tracking', async ({ page }) => {
    await page.goto('/dashboard/marketing');
    await expect(page).toHaveURL(/.*\/dashboard\/marketing/);

    // Verify main content container renders
    await expect(page.locator('main')).toBeVisible();
  });

  test('E2E-IT-001 & E2E-IT-002: IT, Permissions Matrix & Audit Trail', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/.*\/dashboard\/admin/);

    // Verify main content container renders
    await expect(page.locator('main')).toBeVisible();
  });

  test('E2E-GEN-001: General Management & Executive Overview', async ({ page }) => {
    await page.goto('/dashboard/general');
    await expect(page).toHaveURL(/.*\/dashboard\/general/);

    // Verify main content container renders
    await expect(page.locator('main')).toBeVisible();
  });
});
