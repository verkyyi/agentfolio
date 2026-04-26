import { test, expect } from '@playwright/test';

test.describe('Portfolio layout — chat-first', () => {
  test('default slug renders hero + chat', async ({ page }) => {
    await page.goto('./');

    // Hero section visible
    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();
    await expect(hero.locator('.hero-name')).toContainText(/./);

    // Chat panel (or offline card) is present regardless of env
    const chat = page.locator('.chatp');
    await expect(chat).toBeVisible();

    // Main résumé content is present
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('/anthropic-fde-nyc slug renders with same layout', async ({ page }) => {
    await page.goto('./anthropic-fde-nyc');
    // If this deploy has no anthropic-fde-nyc adaptation, App renders "Not Found" instead of the layout
    if (await page.getByText('Not Found').count()) test.skip(true, 'no anthropic-fde-nyc adaptation in this deploy');

    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('.chatp')).toBeVisible();
  });

  test('mobile viewport — no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('./');
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('.chatp-suggestion:visible')).toHaveCount(1);
    await expect(page.getByRole('textbox', { name: /message/i })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test('print media hides chat and activity strip', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.chatp')).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.chatp')).toBeHidden();
    if (await page.locator('.strip').count()) {
      await expect(page.locator('.strip')).toBeHidden();
    }
  });

  test('/dashboard still routes to dashboard', async ({ page }) => {
    await page.goto('./dashboard');
    await expect(page.getByText(/Fitted Resumes/i)).toBeVisible();
  });

  test('chat exchange (mocked proxy) renders assistant response', async ({ page, context }) => {
    // Intercept POST /chat with a short mocked SSE body in the new framed format
    await context.route('**/chat', async (route) => {
      const body =
        'event: text\ndata: {"delta":"Hi"}\n\n' +
        'event: text\ndata: {"delta":" there"}\n\n' +
        'event: done\ndata: {}\n\n';
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body,
      });
    });

    await page.goto('./anthropic-fde-nyc');
    if (await page.getByText('Not Found').count()) test.skip(true, 'no anthropic-fde-nyc adaptation');

    const chat = page.locator('.chatp');
    await expect(chat).toBeVisible();

    // If VITE_CHAT_PROXY_URL was unset at build time, the offline card is shown and this test becomes vacuous.
    // Check for the input. If it's not present, this deploy is offline-mode; skip.
    const input = page.getByRole('textbox', { name: /message/i });
    if (!(await input.count())) test.skip(true, 'chat is offline in this deploy');

    await input.fill('tell me about anthropic-fde-nyc');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.getByText(/Hi there/)).toBeVisible();
  });
});
