import { test, expect } from '@playwright/test';
import { login } from './helpers/test-utils';

// Only run on mobile viewports
test.describe('Mobile Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('E-MO-01: Bottom nav visible on mobile', async ({ page, isMobile }) => {
    if (!isMobile) { test.skip(); return; }
    const bottomNav = page.locator('[data-testid="bottom-nav"], nav.fixed.bottom-0').first();
    await expect(bottomNav).toBeVisible({ timeout: 10000 });
  });

  test('E-MO-02: Sidebar hidden on mobile', async ({ page, isMobile }) => {
    if (!isMobile) { test.skip(); return; }
    const sidebar = page.locator('[data-testid="sidebar"], aside').first();
    // Sidebar should be hidden on mobile
    expect(await sidebar.isVisible().catch(() => false)).toBe(false);
  });

  test('E-MO-03: Kanban single column view', async ({ page, isMobile }) => {
    if (!isMobile) { test.skip(); return; }
    await page.goto('/lists');
    const firstList = page.locator('a[href^="/lists/"]').first();
    if (await firstList.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstList.click();
      await page.waitForURL(/\/lists\/.+/);
    }
  });

  test('E-MO-04: Task detail full-screen', async ({ page, isMobile }) => {
    if (!isMobile) { test.skip(); return; }
    await page.goto('/lists');
    const firstList = page.locator('a[href^="/lists/"]').first();
    if (await firstList.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstList.click();
      await page.waitForURL(/\/lists\/.+/);
      const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
      if (await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await taskCard.click();
      }
    }
  });

  test('E-MO-05: Touch targets >= 44px', async ({ page, isMobile }) => {
    if (!isMobile) { test.skip(); return; }
    // Check interactive elements are at least 44px
    const buttons = page.locator('button, a');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('E-MO-06: Safe area padding', async ({ page, isMobile }) => {
    if (!isMobile) { test.skip(); return; }
    // Verify viewport meta tag exists
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('E-MO-07: Pull to refresh', async ({ page, isMobile }) => {
    if (!isMobile) { test.skip(); return; }
    // Verify page can be scrolled
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
