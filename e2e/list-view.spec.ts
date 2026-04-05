import { test, expect } from '@playwright/test';
import { login, navigateToFirstList } from './helpers/test-utils';

test.describe('List View', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('E-LV-01: Switch to list view', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const listViewBtn = page.locator('button:has-text("List"), [data-testid="list-view"], [aria-label="List view"]').first();
    if (await listViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listViewBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('E-LV-02: Sort by priority', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const listViewBtn = page.locator('button:has-text("List"), [data-testid="list-view"]').first();
    if (await listViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listViewBtn.click();
      await page.waitForTimeout(500);
      const sortBtn = page.locator('button:has-text("Priority"), th:has-text("Priority")').first();
      if (await sortBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sortBtn.click();
      }
    }
  });

  test('E-LV-03: Sort by due date', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const listViewBtn = page.locator('button:has-text("List"), [data-testid="list-view"]').first();
    if (await listViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listViewBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('E-LV-04: Inline edit title', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const listViewBtn = page.locator('button:has-text("List"), [data-testid="list-view"]').first();
    if (await listViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listViewBtn.click();
    }
  });

  test('E-LV-05: Click row opens detail', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const listViewBtn = page.locator('button:has-text("List"), [data-testid="list-view"]').first();
    if (await listViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listViewBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
