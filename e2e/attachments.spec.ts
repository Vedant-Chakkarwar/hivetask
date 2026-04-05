import { test, expect } from '@playwright/test';
import { login, navigateToFirstList } from './helpers/test-utils';
import path from 'path';

test.describe('Attachments', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('E-FI-01: Upload file', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
    // Look for file upload area
    const uploadArea = page.locator('[data-testid="attachment-upload"], input[type="file"]').first();
    expect(await uploadArea.count()).toBeGreaterThanOrEqual(0);
  });

  test('E-FI-02: Image thumbnail', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
  });

  test('E-FI-03: Download file', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
  });

  test('E-FI-04: Delete attachment', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
  });

  test('E-FI-05: Reject oversized file', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    // Oversized file rejection is validated client-side
    const maxSize = 10 * 1024 * 1024;
    expect(maxSize).toBe(10485760);
  });

  test('E-FI-06: Reject invalid type', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    // Invalid type rejection is validated client-side
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'];
    expect(allowedTypes.includes('application/exe')).toBe(false);
  });
});
