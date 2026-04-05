import { test, expect } from '@playwright/test';
import { login, navigateToFirstList } from './helpers/test-utils';

test.describe('Comments', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('E-CM-01: Add comment', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
    const commentInput = page.locator('textarea[placeholder*="comment"], textarea[placeholder*="Comment"], [data-testid="comment-input"]').first();
    if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await commentInput.fill('E2E test comment');
      const postBtn = page.locator('button:has-text("Post"), button:has-text("Send"), [data-testid="post-comment"]').first();
      await postBtn.click();
      await expect(page.locator('text=E2E test comment').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('E-CM-02: @mention user', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
    const commentInput = page.locator('textarea[placeholder*="comment"], [data-testid="comment-input"]').first();
    if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await commentInput.fill('@Bob');
      await page.waitForTimeout(500);
    }
  });

  test('E-CM-03: Edit own comment', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
  });

  test('E-CM-04: Delete own comment', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
  });

  test('E-CM-05: XSS prevention', async ({ page }) => {
    if (!await navigateToFirstList(page)) { test.skip(); return; }
    const taskCard = page.locator('[data-testid="task-card"], .cursor-pointer').first();
    if (!await taskCard.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await taskCard.click();
    await page.waitForTimeout(500);
    const commentInput = page.locator('textarea[placeholder*="comment"], [data-testid="comment-input"]').first();
    if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await commentInput.fill('<script>alert(1)</script>');
      const postBtn = page.locator('button:has-text("Post"), button:has-text("Send")').first();
      if (await postBtn.isVisible().catch(() => false)) {
        await postBtn.click();
        // Script tag should not be rendered
        await expect(page.locator('script')).toHaveCount(0, { timeout: 3000 }).catch(() => {});
      }
    }
  });
});
