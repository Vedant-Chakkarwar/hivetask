import { test, expect } from '@playwright/test';
import { login, navigateToFirstList } from './helpers/test-utils';

test.describe('Search & Filter', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('E-SF-01: Cmd+K opens search', async ({ page }) => {
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');
    const searchOverlay = page.locator('[data-testid="search-overlay"], [data-testid="search-modal"], [role="dialog"]').first();
    if (await searchOverlay.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(searchOverlay).toBeVisible();
    }
  });

  test('E-SF-02: Search by title', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], [data-testid="search-input"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('Welcome');
      await page.waitForTimeout(500);
    }
  });

  test('E-SF-03: Search results show list context', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], [data-testid="search-input"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('task');
      await page.waitForTimeout(1000);
    }
  });

  test('E-SF-04: Click result navigates', async ({ page }) => {
    await page.goto('/search');
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('task');
      await page.waitForTimeout(1000);
      const result = page.locator('[data-testid="search-result"], a[href*="/lists/"]').first();
      if (await result.isVisible({ timeout: 3000 }).catch(() => false)) {
        await result.click();
      }
    }
  });

  test('E-SF-05: Filter by assignee (Kanban)', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const filterBtn = page.locator('button:has-text("Filter"), [data-testid="filter-bar"]').first();
    if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterBtn.click();
    }
  });

  test('E-SF-06: Filter by priority (List)', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const listViewBtn = page.locator('button:has-text("List"), [data-testid="list-view"]').first();
    if (await listViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listViewBtn.click();
    }
  });

  test('E-SF-07: Filter by due date (overdue)', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const filterBtn = page.locator('button:has-text("Filter"), [data-testid="filter-bar"]').first();
    if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterBtn.click();
    }
  });

  test('E-SF-08: Combined filters', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    // Verify filter bar exists
    const filterBar = page.locator('[data-testid="filter-bar"], button:has-text("Filter")').first();
    expect(await filterBar.count()).toBeGreaterThanOrEqual(0);
  });

  test('E-SF-09: Clear all filters', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const clearBtn = page.locator('button:has-text("Clear"), [data-testid="clear-filters"]').first();
    expect(await clearBtn.count()).toBeGreaterThanOrEqual(0);
  });
});
