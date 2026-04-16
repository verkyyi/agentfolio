import { test, expect } from '@playwright/test';

test.describe('Adaptation Access', () => {
  test('default adaptation loads at root with skip', async ({ page }) => {
    await page.goto('./');
    const skipBtn = page.getByRole('button', { name: /skip/i });
    await expect(skipBtn).toBeVisible({ timeout: 10_000 });
    await skipBtn.click();
    await expect(page.locator('h1')).toContainText('Lianghui Yi', { timeout: 10_000 });
  });

  test('general slug loads default adaptation', async ({ page }) => {
    await page.goto('c/general');
    await expect(page.locator('h1')).toContainText('Lianghui Yi', { timeout: 10_000 });
  });

  test('cohere-fde slug loads company adaptation', async ({ page }) => {
    await page.goto('c/cohere-fde');
    await expect(page.locator('h1')).toContainText('Lianghui Yi', { timeout: 10_000 });
    await expect(page.getByText('88% match')).toBeAttached();
    await expect(page.getByText(/agentic AI platforms/)).toBeAttached();
  });

  test('openai slug loads company adaptation', async ({ page }) => {
    await page.goto('c/openai');
    await expect(page.locator('h1')).toContainText('Lianghui Yi', { timeout: 10_000 });
    await expect(page.getByText('88% match')).toBeAttached();
    await expect(page.getByText(/AI products and agentic systems/)).toBeAttached();
  });

  test('apple slug loads company adaptation', async ({ page }) => {
    await page.goto('c/apple');
    await expect(page.locator('h1')).toContainText('Lianghui Yi', { timeout: 10_000 });
    await expect(page.getByText('78% match')).toBeAttached();
    await expect(page.getByText(/elegant user interfaces/)).toBeAttached();
  });

  test('unknown slug falls back to default', async ({ page }) => {
    await page.goto('c/unknown-company-xyz');
    const hasResume = page.locator('h1');
    const hasPrompt = page.getByRole('button', { name: /skip/i });
    await expect(hasResume.or(hasPrompt)).toBeAttached({ timeout: 10_000 });
  });

  test('default adaptation has expected content', async ({ page }) => {
    await page.goto('c/general');
    await expect(page.locator('h1')).toContainText('Lianghui Yi', { timeout: 10_000 });
    await expect(page.getByText(/Forward Deployed Engineer/)).toBeAttached();
    await expect(page.locator('a[href="mailto:verky.yi@gmail.com"]')).toBeAttached();
  });

  test('no console errors on company adaptation pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('c/cohere-fde');
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  test('company adaptations have tailored summaries', async ({ page }) => {
    await page.goto('c/cohere-fde');
    await expect(page.locator('h1')).toContainText('Lianghui Yi', { timeout: 10_000 });
    const cohereSummary = await page.locator('section[aria-label="Summary"] p').textContent();

    await page.goto('c/apple');
    await expect(page.locator('h1')).toContainText('Lianghui Yi', { timeout: 10_000 });
    const appleSummary = await page.locator('section[aria-label="Summary"] p').textContent();

    expect(cohereSummary).not.toEqual(appleSummary);
  });
});
