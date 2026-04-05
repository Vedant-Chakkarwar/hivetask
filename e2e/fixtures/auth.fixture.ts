import { test as base, Page } from '@playwright/test';

type AuthFixture = {
  alicePage: Page;
  bobPage: Page;
};

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'changeme123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

export const test = base.extend<AuthFixture>({
  alicePage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, 'alice@hivetask.com');
    await use(page);
    await context.close();
  },
  bobPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, 'bob@hivetask.com');
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
export { loginAs };
