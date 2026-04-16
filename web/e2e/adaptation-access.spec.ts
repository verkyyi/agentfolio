import { test, expect } from '@playwright/test';

test.describe('Adaptation Access', () => {
  test('default adaptation loads at root', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
  });

  test('sample slug loads company adaptation', async ({ page }) => {
    await page.goto('c/sample');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
    await expect(page.getByText('82% match')).toBeAttached();
  });

  test('unknown slug falls back to default', async ({ page }) => {
    await page.goto('c/unknown-company-xyz');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
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
    await page.goto('c/sample');
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  test('company adaptations have tailored summaries', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
    const defaultSummary = await page.locator('section[aria-label="Summary"] p').textContent();

    await page.goto('c/sample');
    await expect(page.locator('h1')).toContainText('Alex Chen', { timeout: 10_000 });
    const sampleSummary = await page.locator('section[aria-label="Summary"] p').textContent();

    expect(defaultSummary).not.toEqual(sampleSummary);
  });
});
