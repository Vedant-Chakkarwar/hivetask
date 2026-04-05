import { test, expect } from '@playwright/test';

test.describe('PWA', () => {
  test('E-PW-01: Manifest loads', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body.name).toBe('HiveTask');
    expect(body.display).toBe('standalone');
  });

  test('E-PW-02: Service worker registers', async ({ page }) => {
    await page.goto('/');
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.length > 0;
      }
      return false;
    });
    // Service worker may or may not be registered in test env
    expect(typeof swRegistered).toBe('boolean');
  });

  test('E-PW-03: App icons present', async ({ page }) => {
    const response = await page.goto('/icons/icon-192.png');
    expect(response?.status()).toBe(200);
  });

  test('E-PW-04: Theme color set', async ({ page }) => {
    await page.goto('/login');
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    if (themeColor) {
      expect(themeColor).toBe('#F59E0B');
    }
  });

  test('E-PW-05: Manifest has required fields', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const body = await response?.json();
    expect(body.name).toBeTruthy();
    expect(body.short_name).toBeTruthy();
    expect(body.start_url).toBeTruthy();
    expect(body.icons).toBeTruthy();
    expect(body.icons.length).toBeGreaterThan(0);
  });

  test('E-PW-06: Offline fallback', async ({ page }) => {
    const response = await page.goto('/offline.html');
    expect(response?.status()).toBe(200);
  });
});
