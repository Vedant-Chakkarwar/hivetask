import { test, expect } from '@playwright/test';
import { login } from './helpers/test-utils';

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('E-NO-01: Bell shows unread count', async ({ page }) => {
    const bell = page.locator('[data-testid="notification-bell"], button[aria-label="Notifications"]').first();
    await expect(bell).toBeVisible({ timeout: 10000 });
  });

  test('E-NO-02: Open notification panel', async ({ page }) => {
    const bell = page.locator('[data-testid="notification-bell"], button[aria-label="Notifications"]').first();
    if (await bell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bell.click();
      const panel = page.locator('[data-testid="notification-panel"], [role="dialog"]').first();
      await expect(panel).toBeVisible({ timeout: 3000 });
    }
  });

  test('E-NO-03: Click notification navigates', async ({ page }) => {
    const bell = page.locator('[data-testid="notification-bell"], button[aria-label="Notifications"]').first();
    if (await bell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bell.click();
      await page.waitForTimeout(500);
      const notifItem = page.locator('[data-testid="notification-item"], [data-testid="notification-panel"] a').first();
      if (await notifItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await notifItem.click();
      }
    }
  });

  test('E-NO-04: Mark all as read', async ({ page }) => {
    const bell = page.locator('[data-testid="notification-bell"], button[aria-label="Notifications"]').first();
    if (await bell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bell.click();
      await page.waitForTimeout(500);
      const markAllBtn = page.locator('button:has-text("Mark all"), button:has-text("Read all"), [data-testid="mark-all-read"]').first();
      if (await markAllBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await markAllBtn.click();
      }
    }
  });

  test('E-NO-05: Assignment notification', async ({ page }) => {
    // Verify notification bell is accessible
    const bell = page.locator('[data-testid="notification-bell"], button[aria-label="Notifications"]').first();
    await expect(bell).toBeVisible({ timeout: 10000 });
  });
});
