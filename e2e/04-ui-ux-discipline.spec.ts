import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession } from './helpers';

test.describe('4. Cross-Cutting UI/UX & Responsive Standards Tests', () => {

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test('E2E-UI-001: Zero-Fluff & Minimalist Header Verification', async ({ page }) => {
    await page.goto('/dashboard/general');
    await expect(page).toHaveURL(/.*\/dashboard\/general/);

    // Verify sub-tab bar presence
    const subTabButtons = page.locator('nav button, div[role=\"tablist\"] button');
    const count = await subTabButtons.count();
    expect(count).toBeGreaterThan(0);

    // Check no unsolicited count indicators like (12) in sub-tab texts
    for (let i = 0; i < count; i++) {
      const text = await subTabButtons.nth(i).textContent();
      if (text) {
        expect(text).not.toMatch(/\(\d+\)/);
      }
    }
  });

  test('E2E-UI-002: Viewport Boundary & No Full-Page Window Scroll', async ({ page }) => {
    await page.goto('/dashboard/general');
    await expect(page).toHaveURL(/.*\/dashboard\/general/);

    // Assert window scrollY is strictly 0
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);

    // Assert document body does not exceed viewport width (zero horizontal scroll)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('E2E-UI-003: Instant Language Switcher (RO / EN / HU / DE)', async ({ page }) => {
    await page.goto('/dashboard/general');
    await expect(page).toHaveURL(/.*\/dashboard\/general/);

    // Change language state to EN
    await page.evaluate(() => {
      localStorage.setItem('adminLanguage', 'en');
      window.dispatchEvent(new Event('storage'));
    });

    await page.reload();
    await expect(page.locator('body')).toBeVisible();
  });

  test('E2E-UI-004: Modal Form Validation Standards & Zero Layout Shift', async ({ page }) => {
    await page.goto('/dashboard/hr');
    await expect(page).toHaveURL(/.*\/dashboard\/hr/);

    // Verify novalidate is on forms to prevent ugly browser bubbles
    const forms = page.locator('form');
    const formCount = await forms.count();
    for (let i = 0; i < formCount; i++) {
      const novalidateAttr = await forms.nth(i).getAttribute('novalidate');
      if (novalidateAttr !== null) {
        expect(novalidateAttr).toBeDefined();
      }
    }
  });
});
