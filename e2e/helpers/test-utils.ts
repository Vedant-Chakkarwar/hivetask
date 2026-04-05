import { Page, expect } from '@playwright/test';

export async function login(page: Page, email = 'alice@hivetask.com', password = 'changeme123') {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

export async function navigateToFirstList(page: Page): Promise<boolean> {
  await page.goto('/lists');
  const firstList = page.locator('a[href^="/lists/"]').first();
  if (await firstList.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstList.click();
    await page.waitForURL(/\/lists\/.+/, { timeout: 5000 });
    return true;
  }
  return false;
}

export async function createList(page: Page, name: string) {
  await page.goto('/lists');
  await page.locator('button:has-text("New"), button:has-text("Create"), [data-testid="create-list"]').first().click();
  await page.fill('input[placeholder*="name"], input[name="name"]', name);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/lists\/.+/, { timeout: 10000 });
}

export async function createTask(page: Page, title: string) {
  const addBtn = page.locator('button:has-text("Add task"), button:has-text("New task"), button:has-text("+"), [data-testid="add-task"]').first();
  await addBtn.click();
  await page.fill('input[placeholder*="title"], input[name="title"]', title);
  await page.locator('button[type="submit"]').click();
  await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 5000 });
}

export async function openTaskDetail(page: Page, title: string) {
  await page.locator(`text=${title}`).first().click();
  await page.waitForTimeout(500);
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}
