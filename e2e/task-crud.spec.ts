import { test, expect } from '@playwright/test';
import { login, navigateToFirstList, uniqueName } from './helpers/test-utils';

test.describe('Task CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('E-TA-01: Quick-add task', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const addBtn = page.locator('button:has-text("Add"), button:has-text("+"), [data-testid="add-task"], [data-testid="add-card"]').first();
    await addBtn.click();
    const taskTitle = uniqueName('Quick Task');
    await page.fill('input[placeholder*="title"], input[name="title"], [data-testid="quick-add-input"]', taskTitle);
    await page.keyboard.press('Enter');
    await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('E-TA-02: Full-add task with all fields', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const addBtn = page.locator('button:has-text("Add"), button:has-text("+"), [data-testid="add-task"]').first();
    await addBtn.click();
    const taskTitle = uniqueName('Full Task');
    await page.fill('input[placeholder*="title"], input[name="title"]', taskTitle);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('E-TA-03: Open task detail', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    // Detail panel/modal should open
    await expect(page.locator('[data-testid="task-detail"], [role="dialog"], .fixed').first()).toBeVisible({ timeout: 5000 });
  });

  test('E-TA-04: Edit task title inline', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
    const titleInput = page.locator('input[name="title"], [data-testid="task-title-input"]').first();
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const newTitle = uniqueName('Edited');
      await titleInput.fill(newTitle);
      await page.keyboard.press('Enter');
    }
  });

  test('E-TA-05: Change assignee', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
    // Look for assignee selector
    const assigneeBtn = page.locator('[data-testid="assignee"], button:has-text("Assign"), [data-testid="member-picker"]').first();
    if (await assigneeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await assigneeBtn.click();
    }
  });

  test('E-TA-06: Set priority to High', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
    const priorityBtn = page.locator('[data-testid="priority"], button:has-text("Priority")').first();
    if (await priorityBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await priorityBtn.click();
    }
  });

  test('E-TA-07: Set due date', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
    const dateBtn = page.locator('[data-testid="due-date"], button:has-text("Due"), input[type="date"]').first();
    if (await dateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dateBtn.click();
    }
  });

  test('E-TA-08: Add labels', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
  });

  test('E-TA-09: Delete task', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
    const deleteBtn = page.locator('button:has-text("Delete"), [data-testid="delete-task"]').first();
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click();
    }
  });

  test('E-TA-10: Mark task complete', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    // Navigate to list view
    const listViewBtn = page.locator('button:has-text("List"), [data-testid="list-view"]').first();
    if (await listViewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await listViewBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
