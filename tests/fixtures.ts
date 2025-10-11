import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // Stub all API calls to prevent data-related rendering failures
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    page.on('console', m => {
      if (m.type() === 'error') {
        console.log('[console]', m.type(), m.text());
      }
    });
    page.on('pageerror', e => console.error('[pageerror]', e));
    page.on('requestfailed', r => console.error('[requestfailed]', r.method(), r.url(), r.failure()?.errorText));
    await use(page);
  },
});

export { expect } from '@playwright/test';
