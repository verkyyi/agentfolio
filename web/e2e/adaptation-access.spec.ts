import { test, expect } from '@playwright/test';

test.describe('Adaptation Access', () => {
  test('default adaptation loads at root', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
  });

  test('slug loads company adaptation', async ({ page }) => {
    await page.goto('./notion');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
  });

  test('unknown slug shows not found', async ({ page }) => {
    await page.goto('./unknown-company-xyz');
    await expect(page.getByText('Not Found')).toBeAttached({ timeout: 10_000 });
  });

  test('default adaptation has expected content', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
    await expect(page.getByText(/Software Engineer/)).toBeAttached();
    await expect(page.locator('a[href="mailto:alex@example.com"]')).toBeAttached();
  });

  test('no console errors on adaptation pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('./notion');
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });
});
