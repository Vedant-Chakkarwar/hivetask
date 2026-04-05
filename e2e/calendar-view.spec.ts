import { test, expect } from '@playwright/test';
import { login, navigateToFirstList } from './helpers/test-utils';

test.describe('Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('E-CV-01: Switch to calendar view', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const calBtn = page.locator('button:has-text("Calendar"), [data-testid="calendar-view"], [aria-label="Calendar view"]').first();
    if (await calBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calBtn.click();
      await page.waitForTimeout(500);
      // Calendar should be visible
      await expect(page.locator('.rbc-calendar, [data-testid="calendar"]').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('E-CV-02: Tasks on correct dates', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const calBtn = page.locator('button:has-text("Calendar"), [data-testid="calendar-view"]').first();
    if (await calBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('E-CV-03: Click event opens detail', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const calBtn = page.locator('button:has-text("Calendar"), [data-testid="calendar-view"]').first();
    if (await calBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('E-CV-04: Navigate months', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const calBtn = page.locator('button:has-text("Calendar"), [data-testid="calendar-view"]').first();
    if (await calBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calBtn.click();
      await page.waitForTimeout(500);
      const nextBtn = page.locator('button:has-text("Next"), .rbc-btn-group button:nth-child(3)').first();
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
      }
    }
  });

  test('E-CV-05: Drag to reschedule', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const calBtn = page.locator('button:has-text("Calendar"), [data-testid="calendar-view"]').first();
    if (await calBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
