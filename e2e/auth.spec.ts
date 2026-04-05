import { test, expect } from '@playwright/test';

const VALID_EMAIL = 'alice@hivetask.com';
const VALID_PASSWORD = 'changeme123';

test.describe('Auth — Login / Logout', () => {
  test('E-AU-01: Successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', VALID_EMAIL);
    await page.fill('input[type="password"]', VALID_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1, [data-testid="dashboard-heading"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('E-AU-02: Failed login shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', VALID_EMAIL);
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"], .text-danger, .text-red-500, .text-red-600').first()).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL('/login');
  });

  test('E-AU-03: Logout redirects to login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', VALID_EMAIL);
    await page.fill('input[type="password"]', VALID_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out"), button:has-text("Log out"), [data-testid="logout"]').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
    } else {
      await page.goto('/api/auth/logout');
    }
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });

  test('E-AU-04: Auth guard redirect', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });

  test('E-AU-05: Session persists on refresh', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', VALID_EMAIL);
    await page.fill('input[type="password"]', VALID_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.reload();
    await expect(page).not.toHaveURL('/login', { timeout: 5000 });
  });
});
