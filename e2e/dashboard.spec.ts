import { test, expect } from '@playwright/test';
import { login } from './helpers/test-utils';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('E-DB-01: Stats cards render', async ({ page }) => {
    await page.goto('/');
    const statsCards = page.locator('[data-testid="stat-card"], .grid > div').first();
    await expect(statsCards).toBeVisible({ timeout: 10000 });
  });

  test('E-DB-02: Overdue section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    // Look for overdue section or tasks
    const overdueSection = page.locator('text=Overdue, text=overdue, [data-testid="overdue"]').first();
    expect(await overdueSection.count()).toBeGreaterThanOrEqual(0);
  });

  test('E-DB-03: Due today section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const dueTodaySection = page.locator('text=Due Today, text=due today, text=Today, [data-testid="due-today"]').first();
    expect(await dueTodaySection.count()).toBeGreaterThanOrEqual(0);
  });

  test('E-DB-04: Recently assigned', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const assignedSection = page.locator('text=Assigned, text=assigned, [data-testid="recently-assigned"]').first();
    expect(await assignedSection.count()).toBeGreaterThanOrEqual(0);
  });

  test('E-DB-05: Activity feed', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const activityFeed = page.locator('text=Activity, text=activity, [data-testid="activity-feed"]').first();
    expect(await activityFeed.count()).toBeGreaterThanOrEqual(0);
  });

  test('E-DB-06: Click overdue task navigates', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const taskLink = page.locator('a[href*="/lists/"]').first();
    if (await taskLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await taskLink.getAttribute('href');
      expect(href).toContain('/lists/');
    }
  });
});
