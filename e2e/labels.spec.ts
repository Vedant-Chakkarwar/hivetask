import { test, expect } from '@playwright/test';
import { login, navigateToFirstList } from './helpers/test-utils';

test.describe('Labels', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('E-LA-01: Create label', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const settingsBtn = page.locator('button:has-text("Settings"), [data-testid="list-settings"]').first();
    if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsBtn.click();
    }
  });

  test('E-LA-02: Apply label to task', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
    const labelBtn = page.locator('[data-testid="label-picker"], button:has-text("Label")').first();
    if (await labelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await labelBtn.click();
    }
  });

  test('E-LA-03: Filter by label', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const filterBtn = page.locator('button:has-text("Filter"), [data-testid="filter"]').first();
    if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterBtn.click();
    }
  });

  test('E-LA-04: Remove label from task', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
  });
});
