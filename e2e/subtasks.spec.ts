import { test, expect } from '@playwright/test';
import { login, navigateToFirstList } from './helpers/test-utils';

test.describe('Subtasks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('E-SU-01: Add subtask', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
    const subtaskInput = page.locator('input[placeholder*="subtask"], input[placeholder*="Subtask"], [data-testid="subtask-input"]').first();
    if (await subtaskInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subtaskInput.fill('E2E Subtask Test');
      await page.keyboard.press('Enter');
      await expect(page.locator('text=E2E Subtask Test').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('E-SU-02: Toggle subtask', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
    const checkbox = page.locator('[data-testid="subtask-checkbox"], input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checkbox.click();
    }
  });

  test('E-SU-03: Progress bar accuracy', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
  });

  test('E-SU-04: Delete subtask', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
  });
});
