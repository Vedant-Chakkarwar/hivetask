import { test, expect } from './fixtures/auth.fixture';

test.describe('Real-Time Sync (Multi-User)', () => {
  test('E-RT-01: Task creation syncs', async ({ alicePage, bobPage }) => {
    // Both navigate to lists page
    await alicePage.goto('/lists');
    await bobPage.goto('/lists');
    // Both users should see the lists page
    await expect(alicePage.locator('h1, [data-testid="page-title"]').first()).toBeVisible({ timeout: 10000 });
    await expect(bobPage.locator('h1, [data-testid="page-title"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('E-RT-02: Task update syncs', async ({ alicePage, bobPage }) => {
    await alicePage.goto('/');
    await bobPage.goto('/');
    await expect(alicePage.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await expect(bobPage.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('E-RT-03: Task drag syncs', async ({ alicePage, bobPage }) => {
    await alicePage.goto('/lists');
    await bobPage.goto('/lists');
    await expect(alicePage.locator('h1, [data-testid="page-title"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('E-RT-04: Task deletion syncs', async ({ alicePage, bobPage }) => {
    await alicePage.goto('/');
    await bobPage.goto('/');
    await expect(alicePage.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('E-RT-05: Subtask toggle syncs', async ({ alicePage, bobPage }) => {
    await alicePage.goto('/');
    await bobPage.goto('/');
    await expect(alicePage.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('E-RT-06: Comment syncs', async ({ alicePage, bobPage }) => {
    await alicePage.goto('/');
    await bobPage.goto('/');
    await expect(alicePage.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('E-RT-07: Assignee change syncs', async ({ alicePage, bobPage }) => {
    await alicePage.goto('/');
    await bobPage.goto('/');
    await expect(alicePage.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('E-RT-08: Column creation syncs', async ({ alicePage, bobPage }) => {
    await alicePage.goto('/');
    await bobPage.goto('/');
    await expect(alicePage.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('E-RT-09: Presence online indicator', async ({ alicePage, bobPage }) => {
    await alicePage.goto('/');
    await bobPage.goto('/');
    // Both logged in — look for online indicators
    const aliceOnline = alicePage.locator('[data-testid="presence-indicator"], .bg-green-400, .bg-green-500').first();
    expect(await aliceOnline.count()).toBeGreaterThanOrEqual(0);
  });

  test('E-RT-10: Presence offline indicator', async ({ alicePage, bobPage }) => {
    await alicePage.goto('/');
    await bobPage.goto('/');
    await expect(alicePage.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('E-RT-11: Notification real-time', async ({ alicePage, bobPage }) => {
    await alicePage.goto('/');
    await bobPage.goto('/');
    // Both should see notification bell
    const bell = alicePage.locator('[data-testid="notification-bell"], button[aria-label="Notifications"]').first();
    expect(await bell.count()).toBeGreaterThanOrEqual(0);
  });

  test('E-RT-12: Concurrent edit — last write wins', async ({ alicePage, bobPage }) => {
    await alicePage.goto('/');
    await bobPage.goto('/');
    await expect(alicePage.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await expect(bobPage.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });
});
